import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { WebSocket, WebSocketServer } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'
import {
  StreamingConnection,
  StreamingEvent,
  JSONRPCRequest,
  JSONRPCResponse,
  MCPInitializeRequest,
  MCPInitializeResponse,
  MCPToolCallRequest,
  MCPToolCallResponse,
  MCPError,
  MCPErrorCode,
  SecurityContext
} from '../types/mcp-streaming.js'
import { Logger } from 'winston'
import { AuditService } from '../services/audit-service.js'
import { SecurityService } from '../services/security-service.js'

// ===== WEBSOCKET STREAMING SERVER =====

export interface StreamingServerConfig {
  port: number
  cors: {
    origin: string[]
    credentials: boolean
  }
  heartbeat: {
    interval: number
    timeout: number
  }
  maxConnections: number
  compression: boolean
  logger: Logger
}

export class WebSocketStreamingServer extends EventEmitter {
  private io: SocketIOServer
  private wss: WebSocketServer
  private connections = new Map<string, StreamingConnection>()
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>()
  private auditService: AuditService
  private securityService: SecurityService

  constructor(
    private httpServer: HTTPServer,
    private config: StreamingServerConfig,
    private logger: Logger
  ) {
    super()
    this.auditService = new AuditService(logger)
    this.securityService = new SecurityService(logger)
    this.setupSocketIO()
    this.setupWebSocketServer()
  }

  private setupSocketIO(): void {
    this.io = new SocketIOServer(this.httpServer, {
      cors: this.config.cors,
      compression: this.config.compression,
      maxHttpBufferSize: 10e6, // 10MB
      pingTimeout: this.config.heartbeat.timeout,
      pingInterval: this.config.heartbeat.interval,
      transports: ['websocket', 'polling']
    })

    // Socket.IO Event Handlers
    this.io.on('connection', (socket) => {
      this.handleSocketIOConnection(socket)
    })

    this.logger.info('Socket.IO server initialized', {
      cors: this.config.cors,
      maxConnections: this.config.maxConnections
    })
  }

  private setupWebSocketServer(): void {
    this.wss = new WebSocketServer({
      server: this.httpServer,
      path: '/ws',
      maxPayload: 10 * 1024 * 1024 // 10MB
    })

    this.wss.on('connection', (ws, request) => {
      this.handleWebSocketConnection(ws, request)
    })

    this.logger.info('WebSocket server initialized', {
      path: '/ws',
      maxPayload: '10MB'
    })
  }

  private async handleSocketIOConnection(socket: any): Promise<void> {
    const connectionId = uuidv4()
    const clientIP = socket.handshake.address
    const userAgent = socket.handshake.headers['user-agent']

    try {
      // Security validation
      const securityContext = await this.securityService.validateConnection(
        clientIP,
        userAgent,
        socket.handshake.query
      )

      // Check connection limits
      if (this.connections.size >= this.config.maxConnections) {
        socket.emit('error', new MCPError(
          MCPErrorCode.InternalError,
          'Maximum connections reached'
        ).toJSONRPC())
        socket.disconnect()
        return
      }

      // Create connection record
      const connection: StreamingConnection = {
        id: connectionId,
        transport: 'websocket',
        protocol: 'mcp',
        version: '1.0.0',
        connected_at: new Date(),
        last_activity: new Date(),
        metadata: {
          client_ip: clientIP,
          user_agent: userAgent,
          socket_id: socket.id
        }
      }

      this.connections.set(connectionId, connection)

      // Set up heartbeat
      this.setupHeartbeat(connectionId, socket)

      // Audit log
      await this.auditService.log({
        connection_id: connectionId,
        action: 'connect',
        details: { transport: 'socket.io', client_ip: clientIP },
        security_context: securityContext,
        result: 'success'
      })

      // Socket event handlers
      socket.on('mcp:initialize', async (data: MCPInitializeRequest) => {
        await this.handleInitialize(connectionId, socket, data, securityContext)
      })

      socket.on('mcp:tool_call', async (data: MCPToolCallRequest) => {
        await this.handleToolCall(connectionId, socket, data, securityContext)
      })

      socket.on('mcp:subscribe', async (data: { resource: string }) => {
        await this.handleSubscription(connectionId, socket, data)
      })

      socket.on('disconnect', async (reason: string) => {
        await this.handleDisconnection(connectionId, reason)
      })

      socket.on('error', async (error: Error) => {
        await this.handleConnectionError(connectionId, error)
      })

      // Emit connection established
      this.emit('connection', { connectionId, transport: 'socket.io', socket })

      this.logger.info('Socket.IO connection established', {
        connectionId,
        clientIP,
        userAgent: userAgent?.substring(0, 100)
      })

    } catch (error) {
      this.logger.error('Socket.IO connection failed', {
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        clientIP
      })
      
      socket.emit('error', new MCPError(
        MCPErrorCode.AuthenticationFailed,
        'Connection validation failed'
      ).toJSONRPC())
      socket.disconnect()
    }
  }

  private async handleWebSocketConnection(ws: WebSocket, request: any): Promise<void> {
    const connectionId = uuidv4()
    const clientIP = request.socket.remoteAddress
    const userAgent = request.headers['user-agent']

    try {
      // Security validation for WebSocket
      const securityContext = await this.securityService.validateConnection(
        clientIP,
        userAgent,
        {}
      )

      // Check connection limits
      if (this.connections.size >= this.config.maxConnections) {
        ws.send(JSON.stringify(new MCPError(
          MCPErrorCode.InternalError,
          'Maximum connections reached'
        ).toJSONRPC()))
        ws.close()
        return
      }

      // Create connection record
      const connection: StreamingConnection = {
        id: connectionId,
        transport: 'websocket',
        protocol: 'mcp',
        version: '1.0.0',
        connected_at: new Date(),
        last_activity: new Date(),
        metadata: {
          client_ip: clientIP,
          user_agent: userAgent,
          ready_state: ws.readyState
        }
      }

      this.connections.set(connectionId, connection)

      // Set up heartbeat for raw WebSocket
      this.setupWebSocketHeartbeat(connectionId, ws)

      // WebSocket message handler
      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as JSONRPCRequest
          await this.handleWebSocketMessage(connectionId, ws, message, securityContext)
        } catch (error) {
          ws.send(JSON.stringify(new MCPError(
            MCPErrorCode.ParseError,
            'Invalid JSON-RPC message'
          ).toJSONRPC()))
        }
      })

      ws.on('close', async (code: number, reason: Buffer) => {
        await this.handleDisconnection(connectionId, `WebSocket closed: ${code} ${reason.toString()}`)
      })

      ws.on('error', async (error: Error) => {
        await this.handleConnectionError(connectionId, error)
      })

      // Audit log
      await this.auditService.log({
        connection_id: connectionId,
        action: 'connect',
        details: { transport: 'websocket', client_ip: clientIP },
        security_context: securityContext,
        result: 'success'
      })

      this.emit('connection', { connectionId, transport: 'websocket', ws })

      this.logger.info('WebSocket connection established', {
        connectionId,
        clientIP,
        userAgent: userAgent?.substring(0, 100)
      })

    } catch (error) {
      this.logger.error('WebSocket connection failed', {
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        clientIP
      })
      
      ws.send(JSON.stringify(new MCPError(
        MCPErrorCode.AuthenticationFailed,
        'Connection validation failed'
      ).toJSONRPC()))
      ws.close()
    }
  }

  private setupHeartbeat(connectionId: string, socket: any): void {
    const interval = setInterval(() => {
      const connection = this.connections.get(connectionId)
      if (!connection) {
        clearInterval(interval)
        return
      }

      // Check if connection is still alive
      const now = new Date()
      const lastActivity = connection.last_activity
      const timeDiff = now.getTime() - lastActivity.getTime()

      if (timeDiff > this.config.heartbeat.timeout) {
        this.logger.warn('Connection timeout detected', { connectionId })
        socket.disconnect()
        clearInterval(interval)
        return
      }

      // Send heartbeat
      socket.emit('heartbeat', { timestamp: now.toISOString() })
      
    }, this.config.heartbeat.interval)

    this.heartbeatIntervals.set(connectionId, interval)
  }

  private setupWebSocketHeartbeat(connectionId: string, ws: WebSocket): void {
    const interval = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        clearInterval(interval)
        return
      }

      const connection = this.connections.get(connectionId)
      if (!connection) {
        clearInterval(interval)
        return
      }

      // Send ping frame
      ws.ping()
      
      // Check timeout
      const now = new Date()
      const lastActivity = connection.last_activity
      const timeDiff = now.getTime() - lastActivity.getTime()

      if (timeDiff > this.config.heartbeat.timeout) {
        this.logger.warn('WebSocket connection timeout', { connectionId })
        ws.close()
        clearInterval(interval)
      }
      
    }, this.config.heartbeat.interval)

    this.heartbeatIntervals.set(connectionId, interval)

    // Handle pong responses
    ws.on('pong', () => {
      this.updateConnectionActivity(connectionId)
    })
  }

  private async handleWebSocketMessage(
    connectionId: string,
    ws: WebSocket,
    message: JSONRPCRequest,
    securityContext: SecurityContext
  ): Promise<void> {
    this.updateConnectionActivity(connectionId)

    try {
      if (message.method === 'initialize') {
        await this.handleInitialize(connectionId, ws, message as MCPInitializeRequest, securityContext)
      } else if (message.method === 'tools/call') {
        await this.handleToolCall(connectionId, ws, message as MCPToolCallRequest, securityContext)
      } else {
        ws.send(JSON.stringify(new MCPError(
          MCPErrorCode.MethodNotFound,
          `Method not found: ${message.method}`
        ).toJSONRPC(message.id)))
      }
    } catch (error) {
      this.logger.error('WebSocket message handling failed', {
        connectionId,
        method: message.method,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      ws.send(JSON.stringify(new MCPError(
        MCPErrorCode.InternalError,
        'Message processing failed'
      ).toJSONRPC(message.id)))
    }
  }

  private async handleInitialize(
    connectionId: string,
    transport: any,
    request: MCPInitializeRequest,
    securityContext: SecurityContext
  ): Promise<void> {
    try {
      // Validate MCP version
      if (request.params.protocolVersion !== '1.0.0') {
        throw new MCPError(
          MCPErrorCode.UnsupportedVersion,
          `Unsupported protocol version: ${request.params.protocolVersion}`
        )
      }

      // Create initialize response
      const response: MCPInitializeResponse = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '1.0.0',
          capabilities: {
            tools: { listChanged: true },
            logging: { level: 'info' },
            experimental: {
              streaming: true,
              realtime_events: true
            }
          },
          serverInfo: {
            name: 'Calendly MCP Streaming Server',
            version: '1.0.0'
          },
          instructions: 'Enterprise-grade streaming MCP server for Calendly API integration'
        }
      }

      // Send response based on transport type
      if (transport.emit) {
        // Socket.IO
        transport.emit('mcp:initialize_response', response)
      } else {
        // WebSocket
        transport.send(JSON.stringify(response))
      }

      // Emit server event
      this.emit('initialized', { connectionId, clientInfo: request.params.clientInfo })

      // Audit log
      await this.auditService.log({
        connection_id: connectionId,
        action: 'initialize',
        details: { 
          client_info: request.params.clientInfo,
          protocol_version: request.params.protocolVersion 
        },
        security_context: securityContext,
        result: 'success'
      })

      this.logger.info('MCP initialization completed', {
        connectionId,
        clientName: request.params.clientInfo.name,
        clientVersion: request.params.clientInfo.version
      })

    } catch (error) {
      const mcpError = error instanceof MCPError ? error : new MCPError(
        MCPErrorCode.InternalError,
        'Initialization failed'
      )

      if (transport.emit) {
        transport.emit('error', mcpError.toJSONRPC(request.id))
      } else {
        transport.send(JSON.stringify(mcpError.toJSONRPC(request.id)))
      }

      await this.auditService.log({
        connection_id: connectionId,
        action: 'initialize',
        details: { error: mcpError.message },
        security_context: securityContext,
        result: 'failure'
      })
    }
  }

  private async handleToolCall(
    connectionId: string,
    transport: any,
    request: MCPToolCallRequest,
    securityContext: SecurityContext
  ): Promise<void> {
    const startTime = Date.now()

    try {
      // Emit tool call event for handlers
      this.emit('tool_call', {
        connectionId,
        toolName: request.params.name,
        arguments: request.params.arguments,
        transport
      })

      // Audit log
      await this.auditService.log({
        connection_id: connectionId,
        action: 'tool_call',
        details: { 
          tool_name: request.params.name,
          arguments: request.params.arguments 
        },
        security_context: securityContext,
        result: 'success',
        duration_ms: Date.now() - startTime
      })

    } catch (error) {
      const mcpError = error instanceof MCPError ? error : new MCPError(
        MCPErrorCode.InternalError,
        'Tool call failed'
      )

      await this.auditService.log({
        connection_id: connectionId,
        action: 'tool_call',
        details: { 
          tool_name: request.params.name,
          error: mcpError.message 
        },
        security_context: securityContext,
        result: 'failure',
        duration_ms: Date.now() - startTime
      })

      throw mcpError
    }
  }

  private async handleSubscription(
    connectionId: string,
    transport: any,
    data: { resource: string }
  ): Promise<void> {
    // Resource subscription logic
    this.emit('subscription', { connectionId, resource: data.resource })
    this.logger.info('Resource subscription created', { connectionId, resource: data.resource })
  }

  private async handleDisconnection(connectionId: string, reason: string): Promise<void> {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    // Clean up heartbeat
    const interval = this.heartbeatIntervals.get(connectionId)
    if (interval) {
      clearInterval(interval)
      this.heartbeatIntervals.delete(connectionId)
    }

    // Remove connection
    this.connections.delete(connectionId)

    // Emit disconnection event
    this.emit('disconnection', { connectionId, reason })

    this.logger.info('Connection disconnected', { connectionId, reason })
  }

  private async handleConnectionError(connectionId: string, error: Error): Promise<void> {
    this.logger.error('Connection error', {
      connectionId,
      error: error.message,
      stack: error.stack
    })

    this.emit('connection_error', { connectionId, error })
  }

  private updateConnectionActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.last_activity = new Date()
    }
  }

  // ===== PUBLIC METHODS =====

  public getActiveConnections(): StreamingConnection[] {
    return Array.from(this.connections.values())
  }

  public getConnectionCount(): number {
    return this.connections.size
  }

  public broadcastEvent(event: StreamingEvent): void {
    const eventData = JSON.stringify(event)

    // Broadcast via Socket.IO
    this.io.emit('streaming_event', event)

    // Broadcast via WebSocket
    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(eventData)
      }
    })

    this.logger.debug('Event broadcasted', { eventType: event.type, eventId: event.id })
  }

  public sendToConnection(connectionId: string, data: any): boolean {
    const connection = this.connections.get(connectionId)
    if (!connection) return false

    // Find and send to specific connection
    // Implementation depends on tracking transport references
    return true
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down streaming server...')

    // Clear all heartbeat intervals
    this.heartbeatIntervals.forEach((interval) => {
      clearInterval(interval)
    })
    this.heartbeatIntervals.clear()

    // Close all WebSocket connections
    this.wss.clients.forEach((ws) => {
      ws.close()
    })

    // Close Socket.IO server
    this.io.close()

    // Clear connections
    this.connections.clear()

    this.logger.info('Streaming server shutdown completed')
  }
}