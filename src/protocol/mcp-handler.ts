import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Logger } from '../utils/logger.js';

export class MCPProtocolHandler {
  private server: Server;
  private logger: Logger;

  constructor(server: Server) {
    this.server = server;
    this.logger = Logger.getInstance();
  }

  async handleRequest(request: any): Promise<any> {
    try {
      this.logger.debug('MCP Protocol request:', request);
      
      const { jsonrpc, method, params, id } = request;
      
      if (jsonrpc !== '2.0') {
        return {
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid Request - jsonrpc must be "2.0"'
          },
          id
        };
      }

      // Route to appropriate handler based on method
      switch (method) {
        case 'tools/list':
          return await this.handleToolsList(id);
        
        case 'tools/call':
          return await this.handleToolsCall(params, id);
        
        case 'resources/list':
          return await this.handleResourcesList(id);
          
        default:
          return {
            jsonrpc: '2.0',
            error: {
              code: -32601,
              message: `Method not found: ${method}`
            },
            id
          };
      }
    } catch (error) {
      this.logger.error('MCP Protocol error:', error);
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error'
        },
        id: request.id || null
      };
    }
  }

  private async handleToolsList(id: any): Promise<any> {
    try {
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

      return {
        jsonrpc: '2.0',
        result: { tools },
        id
      };
    } catch (error) {
      throw new Error(`Failed to list tools: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleToolsCall(params: any, id: any): Promise<any> {
    try {
      if (!params || !params.name) {
        return {
          jsonrpc: '2.0',
          error: {
            code: -32602,
            message: 'Invalid params - tool name is required'
          },
          id
        };
      }

      // This method should delegate to the actual server handlers
      // For now, return an error indicating the tool should be handled by the main server
      throw new Error(`Tool ${params.name} should be handled by the main MCP server handlers`);
      
    } catch (error) {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Tool execution failed'
        },
        id
      };
    }
  }

  private async handleResourcesList(id: any): Promise<any> {
    return {
      jsonrpc: '2.0',
      result: { resources: [] },
      id
    };
  }
}