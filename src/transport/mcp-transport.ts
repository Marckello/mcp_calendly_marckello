import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import WebSocket from 'ws';
import { Logger } from '../utils/logger.js';

export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPSession {
  id: string;
  transport: 'websocket' | 'sse' | 'http';
  connection: WebSocket | Response | any;
  initialized: boolean;
  capabilities: any;
}

export class MCPTransport extends EventEmitter {
  private sessions: Map<string, MCPSession> = new Map();
  private logger: Logger;
  private wsServer?: WebSocket.Server;
  private protocolHandler: any;

  constructor(protocolHandler: any, logger: Logger) {
    super();
    this.protocolHandler = protocolHandler;
    this.logger = logger;
  }

  // Initialize WebSocket server for MCP
  initializeWebSocketServer(server: any) {
    this.wsServer = new WebSocket.Server({ 
      server,
      path: '/mcp-ws',
      verifyClient: (info: any) => {
        this.logger.info('WebSocket connection attempt', { 
          origin: info.origin,
          secure: info.secure 
        });
        return true;
      }
    });

    this.wsServer.on('connection', (ws: WebSocket, request: any) => {
      const sessionId = randomUUID();
      
      const session: MCPSession = {
        id: sessionId,
        transport: 'websocket',
        connection: ws,
        initialized: false,
        capabilities: {}
      };

      this.sessions.set(sessionId, session);

      this.logger.info('New MCP WebSocket connection', { 
        sessionId,
        url: request.url,
        headers: request.headers 
      });

      ws.on('message', async (data: any) => {
        try {
          const message: MCPMessage = JSON.parse(data.toString());
          this.logger.debug('Received MCP message', { sessionId, message });
          
          const response = await this.handleMessage(sessionId, message);
          if (response) {
            ws.send(JSON.stringify(response));
          }
        } catch (error) {
          this.logger.error('WebSocket message error', { sessionId, error });
          const errorResponse: MCPMessage = {
            jsonrpc: '2.0',
            id: 0,
            error: {
              code: -32700,
              message: 'Parse error'
            }
          };
          ws.send(JSON.stringify(errorResponse));
        }
      });

      ws.on('close', () => {
        this.logger.info('MCP WebSocket disconnected', { sessionId });
        this.sessions.delete(sessionId);
      });

      ws.on('error', (error: any) => {
        this.logger.error('WebSocket error', { sessionId, error });
        this.sessions.delete(sessionId);
      });

      // Send initial connection message
      const welcomeMessage: MCPMessage = {
        jsonrpc: '2.0',
        method: 'notifications/ready',
        params: {}
      };
      ws.send(JSON.stringify(welcomeMessage));
    });
  }

  // Handle Server-Sent Events
  handleSSEConnection(req: any, res: any): string {
    const sessionId = randomUUID();
    
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const session: MCPSession = {
      id: sessionId,
      transport: 'sse',
      connection: res,
      initialized: false,
      capabilities: {}
    };

    this.sessions.set(sessionId, session);

    this.logger.info('New MCP SSE connection', { sessionId });

    // Send initial ready event
    this.sendSSEMessage(sessionId, {
      jsonrpc: '2.0',
      method: 'notifications/ready',
      params: {}
    });

    // Handle client disconnect
    req.on('close', () => {
      this.logger.info('MCP SSE disconnected', { sessionId });
      this.sessions.delete(sessionId);
    });

    return sessionId;
  }

  // Handle HTTP POST for SSE responses
  async handleSSEMessage(sessionId: string, message: MCPMessage): Promise<MCPMessage | null> {
    this.logger.debug('Received MCP SSE message', { sessionId, message });
    return await this.handleMessage(sessionId, message);
  }

  // Core message handler
  async handleMessage(sessionId: string, message: MCPMessage): Promise<MCPMessage | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        jsonrpc: '2.0',
        id: message.id || 0,
        error: {
          code: -32000,
          message: 'Session not found'
        }
      };
    }

    try {
      // Handle message through protocol handler
      const response = await new Promise<MCPMessage | null>((resolve) => {
        this.protocolHandler.handleMessage(sessionId, message, resolve);
      });

      return response;
    } catch (error) {
      this.logger.error('Message handling error', { sessionId, error });
      return {
        jsonrpc: '2.0',
        id: message.id || 0,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error'
        }
      };
    }
  }

  // Send message via appropriate transport
  sendMessage(sessionId: string, message: MCPMessage) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn('Attempted to send message to non-existent session', { sessionId });
      return;
    }

    switch (session.transport) {
      case 'websocket':
        const ws = session.connection as WebSocket;
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
        break;
        
      case 'sse':
        this.sendSSEMessage(sessionId, message);
        break;
    }
  }

  // Send SSE message
  private sendSSEMessage(sessionId: string, message: MCPMessage) {
    const session = this.sessions.get(sessionId);
    if (!session || session.transport !== 'sse') return;

    const res = session.connection;
    const data = JSON.stringify(message);
    
    try {
      res.write(`data: ${data}\n\n`);
    } catch (error) {
      this.logger.error('SSE send error', { sessionId, error });
      this.sessions.delete(sessionId);
    }
  }

  // Update session capabilities
  updateSessionCapabilities(sessionId: string, capabilities: any) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.capabilities = capabilities;
      session.initialized = true;
    }
  }

  // Get session info
  getSession(sessionId: string): MCPSession | undefined {
    return this.sessions.get(sessionId);
  }

  // Get all active sessions
  getActiveSessions(): MCPSession[] {
    return Array.from(this.sessions.values());
  }

  // Close transport and all sessions
  async close(): Promise<void> {
    // Close WebSocket server
    if (this.wsServer) {
      this.wsServer.close();
    }

    // Close all sessions
    for (const session of this.sessions.values()) {
      if (session.transport === 'websocket') {
        const ws = session.connection as WebSocket;
        ws.close();
      } else if (session.transport === 'sse') {
        const res = session.connection;
        try {
          res.end();
        } catch (error) {
          // Ignore errors when closing SSE connections
        }
      }
    }

    this.sessions.clear();
    this.logger.info('MCP Transport closed');
  }
}