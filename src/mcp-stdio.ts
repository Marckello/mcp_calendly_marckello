#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js'
import { config } from 'dotenv'
import winston from 'winston'
import { CalendlyEnterpriseService } from './services/calendly-enterprise-service.js'
import { MCPToolRegistry } from './mcp/tool-registry.js'

// Load environment variables
config()

// ===== SIMPLE MCP SERVER FOR STDIO MODE =====

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
})

class CalendlyMCPStdioServer {
  private server: Server
  private calendlyService: CalendlyEnterpriseService
  private toolRegistry: MCPToolRegistry

  constructor() {
    // Validate required config
    if (!process.env.CALENDLY_ACCESS_TOKEN) {
      console.error('❌ CALENDLY_ACCESS_TOKEN environment variable is required')
      process.exit(1)
    }

    // Initialize Calendly service
    this.calendlyService = new CalendlyEnterpriseService({
      accessToken: process.env.CALENDLY_ACCESS_TOKEN,
      baseUrl: process.env.CALENDLY_API_BASE_URL || 'https://api.calendly.com',
      organizationUri: process.env.CALENDLY_ORGANIZATION_URI,
      timeout: 30000
    }, logger)

    // Initialize tool registry
    this.toolRegistry = new MCPToolRegistry(this.calendlyService, logger)

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'calendly-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )

    this.setupHandlers()
  }

  private setupHandlers(): void {
    // Handle list_tools requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.toolRegistry.getTools()
      }
    })

    // Handle call_tool requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        const result = await this.toolRegistry.executeTool(name, args)
        return result
      } catch (error) {
        logger.error(`Tool execution failed: ${name}`, error)
        
        if (error instanceof McpError) {
          throw error
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    })
  }

  async start(): Promise<void> {
    try {
      // Test Calendly connection
      logger.info('Testing Calendly API connection...')
      const user = await this.calendlyService.getCurrentUser()
      logger.info(`✅ Connected to Calendly as: ${user.name} (${user.email})`)

      // Start MCP server
      const transport = new StdioServerTransport()
      await this.server.connect(transport)

      logger.info('🚀 Calendly MCP Server (stdio mode) started successfully')
      logger.info(`📋 Available tools: ${this.toolRegistry.getToolCount()}`)

    } catch (error) {
      logger.error('Failed to start MCP server:', error)
      process.exit(1)
    }
  }
}

// ===== MAIN EXECUTION =====

async function main() {
  try {
    const server = new CalendlyMCPStdioServer()
    await server.start()
  } catch (error) {
    console.error('💥 Fatal error starting server:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('🛑 Shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  logger.info('🛑 Received SIGTERM, shutting down...')
  process.exit(0)
})

// Start the server
main().catch((error) => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})