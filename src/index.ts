#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';

import { CalendlyService } from './services/calendly.js';
import { Logger } from './utils/logger.js';
import { ValidationUtils } from './utils/validation.js';
import { MCPServerConfig } from './types/mcp.js';
import { CalendlyCoreTools } from './tools/calendly-core.js';
import { CalendlyInviteeTools } from './tools/calendly-invitees.js';
import { CalendlyWebhookTools } from './tools/calendly-webhooks.js';
// MCP protocol handled directly in endpoints

// Load environment variables
dotenv.config();

class CalendlyMCPServer {
  private server: Server;
  private calendly!: CalendlyService;
  private logger: Logger;
  private coreTools!: CalendlyCoreTools;
  private inviteeTools!: CalendlyInviteeTools;
  private webhookTools!: CalendlyWebhookTools;
  private config: MCPServerConfig;
  private expressApp?: express.Application;
  private httpServer?: any;
  // MCP protocol handled directly

  constructor() {
    this.logger = Logger.getInstance();
    
    // Initialize server configuration
    this.config = {
      name: 'calendly-mcp-server',
      version: '1.3.0',
      http: {
        enabled: process.env.HTTP_MODE === 'true' || process.env.NODE_ENV === 'production',
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || '0.0.0.0'
      },
      calendly: {
        accessToken: process.env.CALENDLY_ACCESS_TOKEN!
      },
      features: {
        mcp_protocol: true,
        http_streamable: true,
        n8n_compatible: false,
        websocket: false,
        sse: false
      }
    };

    // Validate configuration
    this.validateConfig();

    // Initialize MCP Server
    this.server = new Server(
      {
        name: this.config.name,
        version: this.config.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );

    this.setupMCPHandlers();
  }

  private validateConfig(): void {
    if (!this.config.calendly.accessToken) {
      throw new Error('CALENDLY_ACCESS_TOKEN environment variable is required');
    }

    this.logger.info('Configuration validated successfully', {
      name: this.config.name,
      version: this.config.version,
      http_enabled: this.config.http.enabled,
      port: this.config.http.port
    });
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize Calendly service
      this.calendly = new CalendlyService({
        accessToken: this.config.calendly.accessToken
      });

      // Test Calendly connection
      const healthCheck = await this.calendly.healthCheck();
      this.logger.info('Calendly service initialized successfully', {
        user: healthCheck.user?.name,
        email: healthCheck.user?.email
      });

      // Initialize tool services
      this.coreTools = new CalendlyCoreTools(this.calendly);
      this.inviteeTools = new CalendlyInviteeTools(this.calendly);
      this.webhookTools = new CalendlyWebhookTools(this.calendly);

      this.logger.info('All tool services initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize services:', error);
      throw new Error(`Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private setupMCPHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [
        // Core Tools
        {
          name: 'calendly_get_current_user',
          description: 'Get current user information'
        },
        {
          name: 'calendly_get_organization', 
          description: 'Get organization details'
        },
        {
          name: 'calendly_list_event_types',
          description: 'List user event types'
        },
        {
          name: 'calendly_get_event_type',
          description: 'Get event type details'
        },
        {
          name: 'calendly_list_scheduled_events',
          description: 'List scheduled events'
        },
        {
          name: 'calendly_get_scheduled_event',
          description: 'Get scheduled event details'
        },
        {
          name: 'calendly_cancel_scheduled_event',
          description: 'Cancel a scheduled event'
        },
        {
          name: 'calendly_get_user_availability',
          description: 'Get user availability schedule'
        },
        // Invitee Tools
        {
          name: 'calendly_list_event_invitees',
          description: 'List event invitees'
        },
        {
          name: 'calendly_get_invitee',
          description: 'Get invitee details'
        },
        // Webhook Tools
        {
          name: 'calendly_list_webhooks',
          description: 'List webhooks'
        },
        {
          name: 'calendly_create_webhook',
          description: 'Create webhook'
        },
        {
          name: 'calendly_get_webhook',
          description: 'Get webhook details'
        },
        {
          name: 'calendly_delete_webhook',
          description: 'Delete webhook'
        }
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: any;

        // Route to appropriate tool handler
        switch (name) {
          // Core Tools
          case 'calendly_get_current_user':
            result = await this.coreTools.getCurrentUser();
            break;
          case 'calendly_get_organization':
            result = await this.coreTools.getOrganization();
            break;
          case 'calendly_list_event_types':
            result = await this.coreTools.listEventTypes(args || {});
            break;
          case 'calendly_get_event_type':
            result = await this.coreTools.getEventType(args || {});
            break;
          case 'calendly_list_scheduled_events':
            result = await this.coreTools.listScheduledEvents(args || {});
            break;
          case 'calendly_get_scheduled_event':
            result = await this.coreTools.getScheduledEvent(args || {});
            break;
          case 'calendly_cancel_scheduled_event':
            result = await this.coreTools.cancelScheduledEvent(args || {});
            break;
          case 'calendly_get_user_availability':
            result = await this.coreTools.getUserAvailability(args || {});
            break;
          
          // Invitee Tools
          case 'calendly_list_event_invitees':
            result = await this.inviteeTools.listEventInvitees(args || {});
            break;
          case 'calendly_get_invitee':
            result = await this.inviteeTools.getInvitee(args || {});
            break;
          
          // Webhook Tools  
          case 'calendly_list_webhooks':
            result = await this.webhookTools.listWebhooks(args || {});
            break;
          case 'calendly_create_webhook':
            result = await this.webhookTools.createWebhook(args || {});
            break;
          case 'calendly_get_webhook':
            result = await this.webhookTools.getWebhook(args || {});
            break;
          case 'calendly_delete_webhook':
            result = await this.webhookTools.deleteWebhook(args || {});
            break;

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };

      } catch (error) {
        this.logger.error(`Tool execution error for ${name}:`, error);
        
        if (error instanceof McpError) {
          throw error;
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    // List resources (not implemented for Calendly yet)
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return { resources: [] };
    });

    // Read resource (not implemented for Calendly yet)
    this.server.setRequestHandler(ReadResourceRequestSchema, async () => {
      throw new McpError(
        ErrorCode.MethodNotFound,
        'Resource reading not implemented'
      );
    });
  }

  private setupHTTPServer(): void {
    if (!this.config.http.enabled) {
      return;
    }

    this.logger.info('Setting up HTTP server...');
    
    this.expressApp = express();
    
    // Security middleware
    this.expressApp.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }));
    
    // CORS middleware  
    this.expressApp.use(cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));
    
    // Logging middleware
    this.expressApp.use(morgan('combined'));
    
    // Body parsing middleware
    this.expressApp.use(express.json({ limit: '10mb' }));
    this.expressApp.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // MCP protocol handled directly in the endpoint below

    // Handle OPTIONS preflight for /mcp endpoint
    this.expressApp.options('/mcp', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(200).end();
    });

    // MCP endpoint info (GET) - ÚNICO ENDPOINT DISPONIBLE
    this.expressApp.get('/mcp', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(404).json({
        error: "Endpoint not found",
        available_endpoints: {
          "POST /mcp": "MCP HTTP Streamable JSON-RPC endpoint - ÚNICO PUNTO DE CONEXIÓN"
        },
        message: "Este es el único endpoint disponible para conexiones MCP",
        transport: "HTTP Streamable",
        protocol: "MCP 1.0 JSON-RPC 2.0"
      });
    });

    // MCP HTTP Streamable endpoint - ÚNICO ENDPOINT DISPONIBLE
    this.expressApp.post('/mcp', async (req, res) => {
      const startTime = Date.now();
      try {
        // Set headers for streaming response
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        this.logger.info('MCP Streamable Request:', req.body);
        const { jsonrpc, method, params, id } = req.body;
        
        if (jsonrpc !== '2.0') {
          const errorResponse = {
            jsonrpc: '2.0',
            error: {
              code: -32600,
              message: 'Invalid Request - jsonrpc must be "2.0"'
            },
            id
          };
          res.write(JSON.stringify(errorResponse) + '\n');
          res.end();
          return;
        }

        let result: any;

        // Handle different MCP methods with streaming
        switch (method) {
          case 'tools/list':
            const tools = [
              { name: 'calendly_get_current_user', description: 'Get current user information' },
              { name: 'calendly_get_organization', description: 'Get organization details' },
              { name: 'calendly_list_event_types', description: 'List user event types' },
              { name: 'calendly_get_event_type', description: 'Get event type details' },
              { name: 'calendly_list_scheduled_events', description: 'List scheduled events' },
              { name: 'calendly_get_scheduled_event', description: 'Get scheduled event details' },
              { name: 'calendly_cancel_scheduled_event', description: 'Cancel a scheduled event' },
              { name: 'calendly_get_user_availability', description: 'Get user availability schedule' },
              { name: 'calendly_list_event_invitees', description: 'List event invitees' },
              { name: 'calendly_get_invitee', description: 'Get invitee details' },
              { name: 'calendly_list_webhooks', description: 'List webhooks' },
              { name: 'calendly_create_webhook', description: 'Create webhook' },
              { name: 'calendly_get_webhook', description: 'Get webhook details' },
              { name: 'calendly_delete_webhook', description: 'Delete webhook' }
            ];
            result = { tools };
            break;

          case 'tools/call':
            if (!params || !params.name) {
              const errorResponse = {
                jsonrpc: '2.0',
                error: {
                  code: -32602,
                  message: 'Invalid params - tool name is required'
                },
                id
              };
              res.write(JSON.stringify(errorResponse) + '\n');
              res.end();
              return;
            }

            this.logger.info(`Executing tool via streamable: ${params.name}`);
            let toolResult: any;

            // Execute the tool
            switch (params.name) {
              case 'calendly_get_current_user':
                toolResult = await this.coreTools.getCurrentUser();
                break;
              case 'calendly_get_organization':
                toolResult = await this.coreTools.getOrganization();
                break;
              case 'calendly_list_event_types':
                toolResult = await this.coreTools.listEventTypes(params.arguments || {});
                break;
              case 'calendly_get_event_type':
                toolResult = await this.coreTools.getEventType(params.arguments || {});
                break;
              case 'calendly_list_scheduled_events':
                toolResult = await this.coreTools.listScheduledEvents(params.arguments || {});
                break;
              case 'calendly_get_scheduled_event':
                toolResult = await this.coreTools.getScheduledEvent(params.arguments || {});
                break;
              case 'calendly_cancel_scheduled_event':
                toolResult = await this.coreTools.cancelScheduledEvent(params.arguments || {});
                break;
              case 'calendly_get_user_availability':
                toolResult = await this.coreTools.getUserAvailability(params.arguments || {});
                break;
              case 'calendly_list_event_invitees':
                toolResult = await this.inviteeTools.listEventInvitees(params.arguments || {});
                break;
              case 'calendly_get_invitee':
                toolResult = await this.inviteeTools.getInvitee(params.arguments || {});
                break;
              case 'calendly_list_webhooks':
                toolResult = await this.webhookTools.listWebhooks(params.arguments || {});
                break;
              case 'calendly_create_webhook':
                toolResult = await this.webhookTools.createWebhook(params.arguments || {});
                break;
              case 'calendly_get_webhook':
                toolResult = await this.webhookTools.getWebhook(params.arguments || {});
                break;
              case 'calendly_delete_webhook':
                toolResult = await this.webhookTools.deleteWebhook(params.arguments || {});
                break;
              default:
                const errorResponse = {
                  jsonrpc: '2.0',
                  error: {
                    code: -32601,
                    message: `Tool ${params.name} not found`
                  },
                  id
                };
                res.write(JSON.stringify(errorResponse) + '\n');
                res.end();
                return;
            }
            
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(toolResult, null, 2)
                }
              ]
            };
            break;

          default:
            const errorResponse = {
              jsonrpc: '2.0',
              error: {
                code: -32601,
                message: `Method not found: ${method}`
              },
              id
            };
            res.write(JSON.stringify(errorResponse) + '\n');
            res.end();
            return;
        }

        const executionTime = Date.now() - startTime;
        this.logger.info(`MCP streamable request completed in ${executionTime}ms`);

        // Send successful response with streaming
        const response = {
          jsonrpc: '2.0',
          result,
          id
        };

        res.write(JSON.stringify(response) + '\n');
        res.end();

      } catch (error) {
        this.logger.error('MCP streamable request failed:', error);
        const errorResponse = {
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal error'
          },
          id: req.body?.id || null
        };
        res.write(JSON.stringify(errorResponse) + '\n');
        res.end();
      }
    });



    // Create HTTP server
    this.httpServer = createServer(this.expressApp);
  }

  async start(): Promise<void> {
    try {
      // Initialize all services
      await this.initializeServices();

      // Setup HTTP server if enabled
      this.setupHTTPServer();

      if (this.config.http.enabled && this.httpServer) {
        // Start HTTP server
        this.httpServer.listen(this.config.http.port, this.config.http.host, () => {
          this.logger.info(`🚀 Calendly MCP Server started successfully`, {
            port: this.config.http.port,
            host: this.config.http.host,
            version: this.config.version,
            endpoint_unico_streamable: `http://${this.config.http.host}:${this.config.http.port}/mcp`
          });
        });
      } else {
        // Start stdio transport
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        this.logger.info('🚀 Calendly MCP Server started with stdio transport');
      }

    } catch (error) {
      this.logger.error('Failed to start server:', error);
      process.exit(1);
    }
    
    return;
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping Calendly MCP Server...');
    
    if (this.httpServer) {
      this.httpServer.close();
    }
    
    await this.server.close();
    this.logger.info('Server stopped successfully');
  }
}

// Main execution
async function main(): Promise<void> {
  const server = new CalendlyMCPServer();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  // Start the server
  await server.start();
}

// Handle when this file is run directly
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

// Export for module use
export { CalendlyMCPServer };