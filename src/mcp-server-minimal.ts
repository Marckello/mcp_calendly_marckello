#!/usr/bin/env node

import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import winston from 'winston'
import { CalendlyEnterpriseService } from './services/calendly-enterprise-service.js'
import { MCPToolRegistry } from './mcp/tool-registry.js'

// Load environment variables
config()

// Simple logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console()
  ]
})

// Minimal MCP Server for endpoint testing
class MinimalMCPServer {
  private app: express.Application
  private toolRegistry: MCPToolRegistry
  private calendlyService: CalendlyEnterpriseService

  constructor() {
    this.app = express()

    // Initialize Calendly service (with dummy token for tool registration)
    this.calendlyService = new CalendlyEnterpriseService({
      accessToken: process.env.CALENDLY_ACCESS_TOKEN || 'dummy_token',
      baseUrl: 'https://api.calendly.com',
      timeout: 30000
    }, logger)

    // Initialize tool registry
    this.toolRegistry = new MCPToolRegistry(this.calendlyService, logger)

    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware(): void {
    // Basic middleware
    this.app.use(cors())
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: true }))

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`)
      next()
    })
  }

  private setupRoutes(): void {
    // Health endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        tools: this.toolRegistry.getToolCount()
      })
    })

    // MCP JSON-RPC 2.0 endpoint for n8n integration
    this.app.post('/mcp', async (req, res) => {
      const startTime = Date.now()
      
      try {
        logger.info('MCP Request:', req.body)

        // Validate JSON-RPC 2.0 request
        const { jsonrpc, method, params, id } = req.body

        if (jsonrpc !== '2.0') {
          return res.json({
            jsonrpc: '2.0',
            error: {
              code: -32600,
              message: 'Invalid Request - jsonrpc must be "2.0"'
            },
            id: id || null
          })
        }

        let result: any

        switch (method) {
          case 'tools/list':
            try {
              const tools = this.toolRegistry.getTools()
              result = {
                tools: tools.map(tool => ({
                  name: tool.name,
                  description: tool.description,
                  inputSchema: tool.inputSchema
                }))
              }
              logger.info(`Returning ${tools.length} tools`)
            } catch (error) {
              logger.error('Error listing tools:', error)
              return res.json({
                jsonrpc: '2.0',
                error: {
                  code: -32603,
                  message: 'Internal error listing tools',
                  data: error instanceof Error ? error.message : 'Unknown error'
                },
                id
              })
            }
            break

          case 'tools/call':
            try {
              if (!params || !params.name) {
                return res.json({
                  jsonrpc: '2.0',
                  error: {
                    code: -32602,
                    message: 'Invalid params - tool name is required'
                  },
                  id
                })
              }

              logger.info(`Executing tool: ${params.name}`)
              const toolResult = await this.toolRegistry.executeTool(
                params.name, 
                params.arguments || {}
              )
              
              result = {
                content: [{
                  type: 'text',
                  text: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2)
                }],
                isError: false
              }

            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              
              logger.error('MCP tool execution failed', {
                tool_name: params?.name,
                error: errorMessage,
                duration_ms: Date.now() - startTime
              })

              return res.json({
                jsonrpc: '2.0',
                error: {
                  code: -32603,
                  message: 'Tool execution failed',
                  data: errorMessage
                },
                id
              })
            }
            break

          default:
            return res.json({
              jsonrpc: '2.0',
              error: {
                code: -32601,
                message: `Method not found: ${method}`
              },
              id
            })
        }

        // Success response
        const response = {
          jsonrpc: '2.0',
          result,
          id
        }
        
        logger.info('MCP Response:', response)
        res.json(response)

      } catch (error) {
        const duration = Date.now() - startTime
        
        logger.error('MCP endpoint error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          body: req.body,
          duration_ms: duration
        })

        res.json({
          jsonrpc: '2.0',
          error: {
            code: -32700,
            message: 'Parse error or internal server error',
            data: error instanceof Error ? error.message : 'Unknown error'
          },
          id: req.body?.id || null
        })
      }
    })

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`
      })
    })
  }

  public async start(port: number = 3000): Promise<void> {
    try {
      await new Promise<void>((resolve) => {
        this.app.listen(port, '0.0.0.0', () => {
          resolve()
        })
      })

      logger.info(`🚀 Minimal MCP Server started on port ${port}`)
      logger.info(`📋 Available endpoints:`)
      logger.info(`  - Health: http://localhost:${port}/health`)
      logger.info(`  - MCP: http://localhost:${port}/mcp`)
      logger.info(`📦 Tools registered: ${this.toolRegistry.getToolCount()}`)

    } catch (error) {
      logger.error('Failed to start server', error)
      process.exit(1)
    }
  }
}

// Start server
async function main() {
  try {
    const server = new MinimalMCPServer()
    await server.start(3000)
  } catch (error) {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down...')
  process.exit(0)
})

// Start the server
main().catch((error) => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})