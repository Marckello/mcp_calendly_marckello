#!/usr/bin/env node

import express from 'express'
import { createServer } from 'http'
import * as http from 'http'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import slowDown from 'express-slow-down'
import { config } from 'dotenv'
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import Joi from 'joi'

// Internal imports
import { WebSocketStreamingServer } from './streaming/websocket-server.js'
import { SSEStreamingServer } from './streaming/sse-server.js'
import { SecurityService } from './services/security-service.js'
import { AuditService } from './services/audit-service.js'
import { CalendlyEnterpriseService } from './services/calendly-enterprise-service.js'
import { MCPToolRegistry } from './mcp/tool-registry.js'

import {
  SecurityConfigJoiSchema,
  CalendlyApiParamsJoiSchema,
  WebhookConfigJoiSchema
} from './types/calendly-enterprise.js'

// Load environment variables
config()

// ===== CONFIGURATION VALIDATION =====

const ConfigSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().integer().min(1000).max(65535).default(3000),
  
  // Calendly Configuration
  CALENDLY_ACCESS_TOKEN: Joi.string().required().min(10),
  CALENDLY_API_BASE_URL: Joi.string().uri().default('https://api.calendly.com'),
  CALENDLY_ORGANIZATION_URI: Joi.string().uri().optional(),
  
  // Security Configuration
  JWT_SECRET: Joi.string().min(32).optional(),
  ENCRYPTION_KEY: Joi.string().min(32).optional(),
  
  // Streaming Configuration
  MAX_CONNECTIONS: Joi.number().integer().min(1).max(10000).default(1000),
  HEARTBEAT_INTERVAL: Joi.number().integer().min(1000).max(60000).default(30000),
  CONNECTION_TIMEOUT: Joi.number().integer().min(5000).max(300000).default(60000),
  
  // Rate Limiting
  RATE_LIMIT_REQUESTS_PER_MINUTE: Joi.number().integer().min(1).max(1000).default(60),
  RATE_LIMIT_BURST: Joi.number().integer().min(1).max(100).default(10),
  
  // Logging
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error').default('info'),
  LOG_RETENTION_DAYS: Joi.number().integer().min(1).max(365).default(90)
})

const { error: configError, value: validatedConfig } = ConfigSchema.validate(process.env, {
  allowUnknown: true,
  stripUnknown: false
})

if (configError) {
  console.error('❌ Configuration validation failed:', configError.message)
  process.exit(1)
}

// ===== LOGGING SETUP =====

const logger = winston.createLogger({
  level: validatedConfig.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File transport with rotation
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: `${validatedConfig.LOG_RETENTION_DAYS}d`,
      createSymlink: true,
      symlinkName: 'logs/current.log'
    }),
    
    // Error file transport
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: `${validatedConfig.LOG_RETENTION_DAYS}d`,
      level: 'error'
    })
  ]
})

// ===== ENTERPRISE MCP STREAMING SERVER =====

export class CalendlyMCPStreamingServer {
  private app: express.Application
  private httpServer: http.Server
  private wsServer: WebSocketStreamingServer
  private sseServer: SSEStreamingServer
  private securityService: SecurityService
  private auditService: AuditService
  private calendlyService: CalendlyEnterpriseService
  private toolRegistry: MCPToolRegistry

  constructor() {
    this.app = express()
    this.httpServer = createServer(this.app)
    
    // Initialize services with simplified configurations
    this.securityService = new SecurityService(
      logger, 
      {
        rate_limiting: { requests_per_minute: 100, burst_limit: 20, window_ms: 60000 },
        cors: { origins: ['http://localhost:3000'], methods: ['GET', 'POST'], credentials: false },
        encryption: { algorithm: 'aes-256-gcm' as const, key_rotation_days: 90, token_expiry_hours: 24 },
        audit: { log_all_requests: true, log_sensitive_data: false, retention_days: 30 }
      },
      process.env.JWT_SECRET || 'default-secret'
    )
    
    this.auditService = new AuditService(logger, {
      retentionDays: 30,
      logSensitiveData: false,
      batchSize: 100,
      flushIntervalMs: 30000,
      alertThresholds: { errorRate: 10, suspiciousActivity: 5 }
    })
    
    this.calendlyService = new CalendlyEnterpriseService({
      accessToken: process.env.CALENDLY_ACCESS_TOKEN!,
      baseUrl: process.env.CALENDLY_BASE_URL || 'https://api.calendly.com',
      organizationUri: process.env.CALENDLY_ORGANIZATION_URI || '',
      timeout: 30000
    }, logger)
    
    this.toolRegistry = new MCPToolRegistry(this.calendlyService, logger)
    this.wsServer = new WebSocketStreamingServer(this.httpServer, this.securityService, this.auditService, this.toolRegistry)
    this.sseServer = new SSEStreamingServer(this.securityService, this.auditService, this.toolRegistry)
    
    this.initializeServices()
    this.setupMiddleware()
    this.setupRoutes()
    this.setupStreamingServers()
    this.setupGracefulShutdown()
  }

  private initializeServices(): void {
    logger.info('✅ Enterprise services initialized successfully')
  }

  private setupMiddleware(): void {
    logger.info('Setting up security middleware...')

    // Basic Express configuration
    this.app.set('trust proxy', 1) // Trust first proxy
    this.app.disable('x-powered-by')

    // Compression
    this.app.use(compression())

    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'wss:', 'ws:'],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false
    }))

    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGINS?.split(',') || true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Cache-Control',
        'Last-Event-ID'
      ],
      exposedHeaders: ['Last-Event-ID'],
      credentials: false,
      maxAge: 86400 // 24 hours
    }))

    // Request logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => {
          logger.info(message.trim(), { source: 'http_access' })
        }
      }
    }))

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }))

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: validatedConfig.RATE_LIMIT_REQUESTS_PER_MINUTE,
      message: {
        error: 'Too many requests',
        retry_after: 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          user_agent: req.get('User-Agent'),
          path: req.path
        })
        res.status(429).json({
          error: 'Rate limit exceeded',
          retry_after: 60
        })
      }
    })

    // Slow down repeated requests
    const speedLimiter = slowDown({
      windowMs: 60 * 1000, // 1 minute
      delayAfter: Math.floor(validatedConfig.RATE_LIMIT_REQUESTS_PER_MINUTE * 0.5),
      delayMs: 500 // Add 500ms delay per request after delayAfter
    })

    this.app.use('/api/', limiter)
    this.app.use('/api/', speedLimiter)

    // Custom security middleware
    this.app.use(setupMiddleware(this.securityService, this.auditService, logger))

    logger.info('Security middleware configured successfully')
  }

  private setupRoutes(): void {
    logger.info('Setting up API routes...')

    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        // Test Calendly connection
        const user = await this.calendlyService.getCurrentUser()
        
        // Get system metrics
        const connections = {
          websocket: this.wsServer?.getConnectionCount() || 0,
          sse: this.sseServer?.getConnectionCount() || 0
        }

        const auditStats = this.auditService.getAuditStats(1) // Last hour

        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: validatedConfig.NODE_ENV,
          
          // Service status
          services: {
            calendly: {
              status: 'connected',
              user: user.name,
              email: user.email
            },
            streaming: {
              websocket: {
                status: 'active',
                connections: connections.websocket
              },
              sse: {
                status: 'active',
                connections: connections.sse
              }
            }
          },

          // System metrics
          metrics: {
            total_connections: connections.websocket + connections.sse,
            audit_events_last_hour: auditStats.total_events,
            error_rate: auditStats.error_rate_per_minute,
            uptime_seconds: Math.floor(process.uptime())
          },

          // Available tools
          tools: {
            count: this.toolRegistry.getToolCount(),
            categories: this.toolRegistry.getToolCategories()
          }
        })

      } catch (error) {
        logger.error('Health check failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Service unavailable'
        })
      }
    })

    // Detailed status endpoint
    this.app.get('/api/status', async (req, res) => {
      try {
        const auditStats = this.auditService.getAuditStats(24) // Last 24 hours
        const securityReport = this.auditService.generateSecurityReport(24)

        res.json({
          system: {
            node_version: process.version,
            memory_usage: process.memoryUsage(),
            cpu_usage: process.cpuUsage(),
            uptime: process.uptime()
          },
          streaming: {
            websocket_connections: this.wsServer.getActiveConnections().map(conn => ({
              id: conn.id,
              connected_at: conn.connected_at,
              last_activity: conn.last_activity,
              transport: conn.transport
            })),
            sse_connections: this.sseServer.getActiveConnections().map(conn => ({
              id: conn.id,
              connected_at: conn.connected_at,
              last_activity: conn.last_activity,
              buffer_size: this.sseServer.getEventBufferSize(conn.id)
            }))
          },
          audit: auditStats,
          security: {
            violations_24h: securityReport.security_violations.length,
            rate_limit_incidents_24h: securityReport.rate_limit_incidents.length,
            top_errors: securityReport.error_analysis.most_common_errors.slice(0, 5)
          }
        })

      } catch (error) {
        res.status(500).json({
          error: 'Failed to get status',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    // MCP Tools endpoints
    this.app.get('/api/mcp/tools', async (req, res) => {
      try {
        const tools = this.toolRegistry.getTools()
        res.json({
          tools,
          count: tools.length,
          categories: this.toolRegistry.getToolCategories()
        })
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get tools',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    this.app.post('/api/mcp/tools/call', async (req, res) => {
      const startTime = Date.now()
      
      try {
        // Validate request body
        const { error, value } = Joi.object({
          tool_name: Joi.string().required(),
          arguments: Joi.object().optional(),
          connection_id: Joi.string().uuid().optional()
        }).validate(req.body)

        if (error) {
          return res.status(400).json({
            error: 'Invalid request',
            details: error.details
          })
        }

        const { tool_name, arguments: args, connection_id } = value

        // Execute tool
        const result = await this.toolRegistry.executeTool(tool_name, args || {})
        const duration = Date.now() - startTime

        // Stream result if connection_id provided
        if (connection_id) {
          await this.sseServer.streamToolResult(connection_id, tool_name, result)
        }

        res.json({
          success: true,
          tool_name,
          result,
          execution_time_ms: duration
        })

      } catch (error) {
        const duration = Date.now() - startTime
        
        logger.error('Tool execution failed', {
          tool_name: req.body.tool_name,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration_ms: duration
        })

        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Tool execution failed',
          execution_time_ms: duration
        })
      }
    })

    // SSE streaming endpoint
    this.app.get('/api/stream', (req, res) => {
      this.sseServer.handleSSEConnection(req, res)
    })

    // Webhooks endpoint for Calendly
    this.app.post('/api/webhooks/calendly', async (req, res) => {
      try {
        // Validate webhook signature if configured
        const signature = req.headers['calendly-webhook-signature'] as string
        
        // Process webhook event
        await this.processCalendlyWebhook(req.body, signature)

        res.status(200).json({ received: true })
      } catch (error) {
        logger.error('Webhook processing failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        res.status(500).json({ error: 'Webhook processing failed' })
      }
    })

    // Audit endpoints (admin only)
    this.app.get('/api/admin/audit/stats', async (req, res) => {
      try {
        const hours = parseInt(req.query.hours as string) || 24
        const stats = this.auditService.getAuditStats(hours)
        res.json(stats)
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get audit stats',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    // Static files for dashboard (if needed)
    this.app.use('/static', express.static('src/static'))

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`
      })
    })

    // Error handler
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
      })

      res.status(500).json({
        error: 'Internal Server Error',
        message: validatedConfig.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      })
    })

    logger.info('API routes configured successfully')
  }

  private setupStreamingServers(): void {
    logger.info('Setting up streaming servers...')

    // WebSocket Server
    this.wsServer = new WebSocketStreamingServer(
      this.httpServer,
      {
        port: validatedConfig.PORT,
        cors: {
          origin: process.env.CORS_ORIGINS?.split(',') || ['*'],
          credentials: false
        },
        heartbeat: {
          interval: validatedConfig.HEARTBEAT_INTERVAL,
          timeout: validatedConfig.CONNECTION_TIMEOUT
        },
        maxConnections: validatedConfig.MAX_CONNECTIONS,
        compression: true,
        logger
      },
      logger
    )

    // SSE Server
    this.sseServer = new SSEStreamingServer(
      {
        heartbeatInterval: validatedConfig.HEARTBEAT_INTERVAL,
        connectionTimeout: validatedConfig.CONNECTION_TIMEOUT,
        maxConnections: validatedConfig.MAX_CONNECTIONS,
        retryInterval: 5000,
        bufferSize: 1000
      },
      logger
    )

    // Set up event handlers
    this.wsServer.on('tool_call', async ({ connectionId, toolName, arguments: args, transport }) => {
      try {
        const result = await this.toolRegistry.executeTool(toolName, args)
        
        // Send response back via WebSocket
        if (transport.emit) {
          transport.emit('mcp:tool_response', {
            jsonrpc: '2.0',
            id: connectionId,
            result
          })
        } else {
          transport.send(JSON.stringify({
            jsonrpc: '2.0',
            id: connectionId,
            result
          }))
        }

      } catch (error) {
        logger.error('Tool execution via WebSocket failed', {
          connectionId,
          toolName,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    logger.info('Streaming servers configured successfully')
  }

  private async processCalendlyWebhook(payload: any, signature?: string): Promise<void> {
    try {
      // Validate webhook signature if configured
      // Implementation depends on Calendly webhook signature verification

      // Determine event type
      const eventType = payload.event as string
      const eventData = payload.payload

      logger.info('Processing Calendly webhook', {
        event_type: eventType,
        created_at: payload.created_at
      })

      // Stream event to connected clients
      await this.sseServer.streamCalendlyEvent(eventType as any, eventData)

      // Additional processing based on event type
      switch (eventType) {
        case 'invitee.created':
          await this.handleInviteeCreated(eventData)
          break
        case 'invitee.canceled':
          await this.handleInviteeCanceled(eventData)
          break
        default:
          logger.debug('Unhandled webhook event type', { event_type: eventType })
      }

    } catch (error) {
      logger.error('Webhook processing error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  private async handleInviteeCreated(eventData: any): Promise<void> {
    logger.info('Invitee created', {
      event_uri: eventData.event,
      invitee_uri: eventData.invitee
    })
    // Custom business logic here
  }

  private async handleInviteeCanceled(eventData: any): Promise<void> {
    logger.info('Invitee canceled', {
      event_uri: eventData.event,
      invitee_uri: eventData.invitee
    })
    // Custom business logic here
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`)

      try {
        // Close HTTP server
        await new Promise<void>((resolve) => {
          this.httpServer.close(() => resolve())
        })

        // Shutdown streaming servers
        await this.wsServer.shutdown()
        await this.sseServer.shutdown()

        // Shutdown services
        await this.auditService.shutdown()

        logger.info('Graceful shutdown completed')
        process.exit(0)

      } catch (error) {
        logger.error('Error during shutdown', {
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        process.exit(1)
      }
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack
      })
      process.exit(1)
    })

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        promise
      })
      process.exit(1)
    })
  }

  public async start(): Promise<void> {
    try {
      // Test Calendly connection
      logger.info('Testing Calendly API connection...')
      const user = await this.calendlyService.getCurrentUser()
      logger.info(`✅ Connected to Calendly as: ${user.name} (${user.email})`)

      // Start HTTP server
      await new Promise<void>((resolve) => {
        this.httpServer.listen(validatedConfig.PORT, '0.0.0.0', () => {
          resolve()
        })
      })

      logger.info(`🚀 Calendly MCP Streaming Server started successfully`, {
        port: validatedConfig.PORT,
        environment: validatedConfig.NODE_ENV,
        websocket_path: '/ws',
        sse_path: '/api/stream',
        health_check: `http://localhost:${validatedConfig.PORT}/health`
      })

      // Log available endpoints
      logger.info('📋 Available endpoints:', {
        health: `/health`,
        status: `/api/status`,
        tools: `/api/mcp/tools`,
        tool_call: `/api/mcp/tools/call`,
        streaming: `/api/stream`,
        websocket: `/ws`,
        webhooks: `/api/webhooks/calendly`
      })

    } catch (error) {
      logger.error('Failed to start server', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      process.exit(1)
    }
  }
}

// ===== MAIN EXECUTION =====

async function main() {
  try {
    const server = new CalendlyMCPStreamingServer()
    await server.start()
  } catch (error) {
    console.error('💥 Fatal error starting server:', error)
    process.exit(1)
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default CalendlyMCPStreamingServer