import { Request, Response } from 'express'
import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import { Logger } from 'winston'
import {
  StreamingConnection,
  StreamingEvent,
  MCPToolResult,
  SecurityContext
} from '../types/mcp-streaming.js'
import { AuditService } from '../services/audit-service.js'
import { SecurityService } from '../services/security-service.js'

// ===== SERVER-SENT EVENTS STREAMING SERVER =====

export interface SSEConnection {
  id: string
  response: Response
  lastEventId: string
  connected_at: Date
  last_activity: Date
  metadata?: Record<string, any>
}

export interface SSEServerConfig {
  heartbeatInterval: number
  connectionTimeout: number
  maxConnections: number
  retryInterval: number
  bufferSize: number
}

export class SSEStreamingServer extends EventEmitter {
  private connections = new Map<string, SSEConnection>()
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>()
  private eventBuffer = new Map<string, StreamingEvent[]>() // Per-connection event buffer
  private auditService: AuditService
  private securityService: SecurityService

  constructor(
    private config: SSEServerConfig,
    private logger: Logger
  ) {
    super()
    this.auditService = new AuditService(logger)
    this.securityService = new SecurityService(logger)
    this.setupCleanupInterval()
  }

  // ===== SSE CONNECTION HANDLER =====

  public async handleSSEConnection(req: Request, res: Response): Promise<void> {
    const connectionId = uuidv4()
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown'
    const userAgent = req.headers['user-agent'] || 'unknown'
    const lastEventId = req.headers['last-event-id'] as string || '0'

    try {
      // Security validation
      const securityContext = await this.securityService.validateConnection(
        clientIP,
        userAgent,
        req.query
      )

      // Check connection limits
      if (this.connections.size >= this.config.maxConnections) {
        res.status(503).json({
          error: 'Service Unavailable',
          message: 'Maximum SSE connections reached',
          retry_after: 30
        })
        return
      }

      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control, Last-Event-ID',
        'Access-Control-Expose-Headers': 'Last-Event-ID',
        'X-Accel-Buffering': 'no' // Disable Nginx buffering
      })

      // Send initial connection event
      this.sendSSEEvent(res, {
        id: connectionId,
        event: 'connection',
        data: {
          connectionId,
          timestamp: new Date().toISOString(),
          server: 'MCP Calendly Streaming Server',
          version: '1.0.0'
        },
        retry: this.config.retryInterval
      })

      // Create connection record
      const connection: SSEConnection = {
        id: connectionId,
        response: res,
        lastEventId,
        connected_at: new Date(),
        last_activity: new Date(),
        metadata: {
          client_ip: clientIP,
          user_agent: userAgent,
          query_params: req.query
        }
      }

      this.connections.set(connectionId, connection)
      this.eventBuffer.set(connectionId, [])

      // Setup heartbeat
      this.setupSSEHeartbeat(connectionId)

      // Handle connection close
      req.on('close', () => {
        this.handleSSEDisconnection(connectionId, 'client_disconnect')
      })

      req.on('error', (error) => {
        this.handleSSEError(connectionId, error)
      })

      // Send buffered events if reconnection
      if (lastEventId !== '0') {
        await this.replayEvents(connectionId, lastEventId)
      }

      // Audit log
      await this.auditService.log({
        connection_id: connectionId,
        action: 'connect',
        details: { 
          transport: 'sse',
          client_ip: clientIP,
          last_event_id: lastEventId 
        },
        security_context: securityContext,
        result: 'success'
      })

      this.emit('connection', { connectionId, transport: 'sse', req, res })

      this.logger.info('SSE connection established', {
        connectionId,
        clientIP,
        userAgent: userAgent.substring(0, 100),
        lastEventId
      })

    } catch (error) {
      this.logger.error('SSE connection failed', {
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        clientIP
      })

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Connection validation failed'
      })
    }
  }

  // ===== TOOL RESULT STREAMING =====

  public async streamToolResult(
    connectionId: string,
    toolName: string,
    result: MCPToolResult,
    requestId?: string
  ): Promise<void> {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      this.logger.warn('Tool result stream failed: connection not found', { connectionId })
      return
    }

    try {
      const streamingEvent: StreamingEvent = {
        id: uuidv4(),
        type: 'tool_result',
        timestamp: new Date(),
        connection_id: connectionId,
        data: {
          tool_name: toolName,
          result,
          request_id: requestId
        },
        metadata: {
          content_length: JSON.stringify(result).length,
          has_error: result.isError || false
        }
      }

      // Add to buffer
      const buffer = this.eventBuffer.get(connectionId) || []
      buffer.push(streamingEvent)
      
      // Keep only last N events in buffer
      if (buffer.length > this.config.bufferSize) {
        buffer.shift()
      }
      this.eventBuffer.set(connectionId, buffer)

      // Send via SSE
      this.sendSSEEvent(connection.response, {
        id: streamingEvent.id,
        event: 'tool_result',
        data: streamingEvent,
        retry: this.config.retryInterval
      })

      this.updateConnectionActivity(connectionId)

      this.logger.debug('Tool result streamed via SSE', {
        connectionId,
        toolName,
        eventId: streamingEvent.id,
        hasError: result.isError
      })

    } catch (error) {
      this.logger.error('Failed to stream tool result', {
        connectionId,
        toolName,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      // Send error event
      this.sendErrorEvent(connectionId, 'streaming_error', 'Failed to stream tool result')
    }
  }

  // ===== REAL-TIME EVENT STREAMING =====

  public async streamCalendlyEvent(
    eventType: 'invitee.created' | 'invitee.canceled' | 'event.updated',
    eventData: any,
    targetConnections?: string[]
  ): Promise<void> {
    const streamingEvent: StreamingEvent = {
      id: uuidv4(),
      type: 'notification',
      timestamp: new Date(),
      connection_id: 'broadcast',
      data: {
        event_type: eventType,
        calendly_event: eventData
      },
      metadata: {
        broadcast: true,
        event_source: 'calendly_webhook'
      }
    }

    const connectionsToStream = targetConnections 
      ? targetConnections.filter(id => this.connections.has(id))
      : Array.from(this.connections.keys())

    const results = await Promise.allSettled(
      connectionsToStream.map(async (connectionId) => {
        const connection = this.connections.get(connectionId)
        if (!connection) return

        try {
          // Add to buffer
          const buffer = this.eventBuffer.get(connectionId) || []
          buffer.push({ ...streamingEvent, connection_id: connectionId })
          
          if (buffer.length > this.config.bufferSize) {
            buffer.shift()
          }
          this.eventBuffer.set(connectionId, buffer)

          // Send via SSE
          this.sendSSEEvent(connection.response, {
            id: streamingEvent.id,
            event: 'calendly_event',
            data: streamingEvent,
            retry: this.config.retryInterval
          })

          this.updateConnectionActivity(connectionId)

        } catch (error) {
          this.logger.error('Failed to stream Calendly event', {
            connectionId,
            eventType,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      })
    )

    const successCount = results.filter(r => r.status === 'fulfilled').length
    const failureCount = results.filter(r => r.status === 'rejected').length

    this.logger.info('Calendly event broadcast completed', {
      eventType,
      eventId: streamingEvent.id,
      targetConnections: connectionsToStream.length,
      successCount,
      failureCount
    })
  }

  // ===== PROGRESS STREAMING =====

  public async streamProgress(
    connectionId: string,
    progressToken: string | number,
    progress: number,
    total?: number,
    message?: string
  ): Promise<void> {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    try {
      const progressEvent = {
        id: uuidv4(),
        event: 'progress',
        data: {
          progress_token: progressToken,
          progress,
          total,
          message,
          timestamp: new Date().toISOString()
        },
        retry: this.config.retryInterval
      }

      this.sendSSEEvent(connection.response, progressEvent)
      this.updateConnectionActivity(connectionId)

      this.logger.debug('Progress streamed', {
        connectionId,
        progressToken,
        progress,
        total
      })

    } catch (error) {
      this.logger.error('Failed to stream progress', {
        connectionId,
        progressToken,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // ===== SSE UTILITIES =====

  private sendSSEEvent(res: Response, event: {
    id?: string
    event?: string
    data: any
    retry?: number
  }): void {
    try {
      if (event.id) {
        res.write(`id: ${event.id}\n`)
      }

      if (event.event) {
        res.write(`event: ${event.event}\n`)
      }

      if (event.retry) {
        res.write(`retry: ${event.retry}\n`)
      }

      const dataString = typeof event.data === 'string' 
        ? event.data 
        : JSON.stringify(event.data)

      // Handle multi-line data
      dataString.split('\n').forEach(line => {
        res.write(`data: ${line}\n`)
      })

      res.write('\n') // End event with double newline
      
    } catch (error) {
      this.logger.error('Failed to send SSE event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private sendErrorEvent(connectionId: string, errorType: string, message: string): void {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    this.sendSSEEvent(connection.response, {
      id: uuidv4(),
      event: 'error',
      data: {
        error_type: errorType,
        message,
        timestamp: new Date().toISOString(),
        connection_id: connectionId
      },
      retry: this.config.retryInterval
    })
  }

  private setupSSEHeartbeat(connectionId: string): void {
    const interval = setInterval(() => {
      const connection = this.connections.get(connectionId)
      if (!connection) {
        clearInterval(interval)
        return
      }

      // Check timeout
      const now = new Date()
      const timeDiff = now.getTime() - connection.last_activity.getTime()

      if (timeDiff > this.config.connectionTimeout) {
        this.logger.warn('SSE connection timeout', { connectionId })
        this.handleSSEDisconnection(connectionId, 'timeout')
        clearInterval(interval)
        return
      }

      // Send heartbeat
      this.sendSSEEvent(connection.response, {
        id: uuidv4(),
        event: 'heartbeat',
        data: {
          timestamp: now.toISOString(),
          uptime_ms: timeDiff
        },
        retry: this.config.retryInterval
      })

    }, this.config.heartbeatInterval)

    this.heartbeatIntervals.set(connectionId, interval)
  }

  private async replayEvents(connectionId: string, lastEventId: string): Promise<void> {
    const buffer = this.eventBuffer.get(connectionId)
    if (!buffer || buffer.length === 0) return

    const connection = this.connections.get(connectionId)
    if (!connection) return

    try {
      // Find events after lastEventId
      const lastEventIndex = buffer.findIndex(event => event.id === lastEventId)
      const eventsToReplay = lastEventIndex >= 0 
        ? buffer.slice(lastEventIndex + 1)
        : buffer

      this.logger.info('Replaying SSE events', {
        connectionId,
        lastEventId,
        eventsToReplay: eventsToReplay.length
      })

      // Send replay marker
      this.sendSSEEvent(connection.response, {
        id: uuidv4(),
        event: 'replay_start',
        data: {
          events_count: eventsToReplay.length,
          last_event_id: lastEventId
        }
      })

      // Replay events
      for (const event of eventsToReplay) {
        this.sendSSEEvent(connection.response, {
          id: event.id,
          event: event.type,
          data: event
        })
      }

      // Send replay end marker
      this.sendSSEEvent(connection.response, {
        id: uuidv4(),
        event: 'replay_end',
        data: {
          events_replayed: eventsToReplay.length
        }
      })

    } catch (error) {
      this.logger.error('Failed to replay events', {
        connectionId,
        lastEventId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private handleSSEDisconnection(connectionId: string, reason: string): void {
    // Clean up heartbeat
    const interval = this.heartbeatIntervals.get(connectionId)
    if (interval) {
      clearInterval(interval)
      this.heartbeatIntervals.delete(connectionId)
    }

    // Keep event buffer for potential reconnection
    // Will be cleaned up by cleanup interval

    // Remove connection
    this.connections.delete(connectionId)

    this.emit('disconnection', { connectionId, reason, transport: 'sse' })

    this.logger.info('SSE connection disconnected', { connectionId, reason })
  }

  private handleSSEError(connectionId: string, error: Error): void {
    this.logger.error('SSE connection error', {
      connectionId,
      error: error.message
    })

    this.emit('connection_error', { connectionId, error, transport: 'sse' })
  }

  private updateConnectionActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.last_activity = new Date()
    }
  }

  private setupCleanupInterval(): void {
    // Clean up old event buffers every hour
    setInterval(() => {
      const now = new Date()
      const cutoff = new Date(now.getTime() - (24 * 60 * 60 * 1000)) // 24 hours ago

      for (const [connectionId, buffer] of this.eventBuffer.entries()) {
        // Remove events older than 24 hours
        const filteredBuffer = buffer.filter(event => event.timestamp > cutoff)
        
        if (filteredBuffer.length !== buffer.length) {
          this.eventBuffer.set(connectionId, filteredBuffer)
          this.logger.debug('Cleaned up event buffer', {
            connectionId,
            removedEvents: buffer.length - filteredBuffer.length,
            remainingEvents: filteredBuffer.length
          })
        }

        // Remove buffers for disconnected connections
        if (!this.connections.has(connectionId)) {
          this.eventBuffer.delete(connectionId)
        }
      }
    }, 60 * 60 * 1000) // Every hour
  }

  // ===== PUBLIC METHODS =====

  public getActiveConnections(): SSEConnection[] {
    return Array.from(this.connections.values())
  }

  public getConnectionCount(): number {
    return this.connections.size
  }

  public getEventBufferSize(connectionId: string): number {
    const buffer = this.eventBuffer.get(connectionId)
    return buffer ? buffer.length : 0
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down SSE server...')

    // Clear all heartbeat intervals
    this.heartbeatIntervals.forEach((interval) => {
      clearInterval(interval)
    })
    this.heartbeatIntervals.clear()

    // Close all SSE connections
    for (const connection of this.connections.values()) {
      try {
        this.sendSSEEvent(connection.response, {
          event: 'server_shutdown',
          data: { message: 'Server is shutting down' }
        })
        connection.response.end()
      } catch (error) {
        // Ignore errors during shutdown
      }
    }

    // Clear connections and buffers
    this.connections.clear()
    this.eventBuffer.clear()

    this.logger.info('SSE server shutdown completed')
  }
}