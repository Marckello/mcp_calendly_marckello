import { Tool, Resource } from '@modelcontextprotocol/sdk/types.js';

export interface MCPServerConfig {
  name: string;
  version: string;
  http: {
    enabled: boolean;
    port: number;
    host: string;
  };
  calendly: {
    accessToken: string;
    timeout?: number;
  };
  features: {
    websocket: boolean;
    sse: boolean;
    n8n: boolean;
  };
  logging?: {
    level: 'error' | 'warn' | 'info' | 'debug';
    file?: string;
  };
  security?: {
    enableCors: boolean;
    rateLimiting?: {
      windowMs: number;
      max: number;
    };
  };
}

export interface MCPToolParams {
  [key: string]: any;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface CalendlyTool extends Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface CalendlyResource extends Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// Tool categories for better organization
export enum ToolCategory {
  USER = 'user',
  ORGANIZATION = 'organization',
  EVENT_TYPES = 'event_types',
  SCHEDULED_EVENTS = 'scheduled_events',
  INVITEES = 'invitees',
  AVAILABILITY = 'availability',
  WEBHOOKS = 'webhooks',
  ANALYTICS = 'analytics'
}

// Resource categories for better organization  
export enum ResourceCategory {
  USER_INFO = 'user_info',
  EVENT_DATA = 'event_data',
  INVITEE_DATA = 'invitee_data',
  AVAILABILITY_DATA = 'availability_data',
  WEBHOOK_DATA = 'webhook_data',
  ANALYTICS = 'analytics',
  CONFIGURATION = 'configuration'
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  inputSchema: any;
  handler: (params: MCPToolParams) => Promise<MCPToolResult>;
}

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  category: ResourceCategory;
  mimeType: string;
  handler: () => Promise<any>;
}

// API response wrapper for consistent error handling
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    executionTime?: number;
    version?: string;
  };
}

// N8n integration specific types
export interface N8nWebhookConfig {
  enabled: boolean;
  url?: string;
  secret?: string;
  events?: string[];
}

export interface N8nCompatibleResponse {
  json: any;
  binary?: any;
  pairedItem?: {
    item: number;
  };
}