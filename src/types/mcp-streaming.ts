import { z } from 'zod'

// ===== MCP 1.0 STREAMING PROTOCOL TYPES =====

export const MCPVersionSchema = z.literal('1.0.0')

// JSON-RPC Base Types
export const JSONRPCBaseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number(), z.null()]).optional()
})

export const JSONRPCRequestSchema = JSONRPCBaseSchema.extend({
  method: z.string(),
  params: z.record(z.any()).optional()
})

export const JSONRPCResponseSchema = JSONRPCBaseSchema.extend({
  result: z.any().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional()
  }).optional()
})

// MCP Streaming Transport Types
export const StreamingTransportTypeSchema = z.enum(['websocket', 'sse', 'stdio'])

export const StreamingConnectionSchema = z.object({
  id: z.string().uuid(),
  transport: StreamingTransportTypeSchema,
  protocol: z.literal('mcp'),
  version: MCPVersionSchema,
  connected_at: z.date(),
  last_activity: z.date(),
  metadata: z.record(z.any()).optional()
})

// MCP Capability Definitions
export const MCPCapabilitiesSchema = z.object({
  tools: z.object({
    listChanged: z.boolean().optional()
  }).optional(),
  resources: z.object({
    subscribe: z.boolean().optional(),
    listChanged: z.boolean().optional()
  }).optional(),
  prompts: z.object({
    listChanged: z.boolean().optional()
  }).optional(),
  logging: z.object({
    level: z.enum(['debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency']).optional()
  }).optional(),
  experimental: z.record(z.any()).optional()
})

// MCP Initialize Protocol
export const MCPInitializeRequestSchema = JSONRPCRequestSchema.extend({
  method: z.literal('initialize'),
  params: z.object({
    protocolVersion: MCPVersionSchema,
    capabilities: MCPCapabilitiesSchema,
    clientInfo: z.object({
      name: z.string(),
      version: z.string()
    })
  })
})

export const MCPInitializeResponseSchema = JSONRPCResponseSchema.extend({
  result: z.object({
    protocolVersion: MCPVersionSchema,
    capabilities: MCPCapabilitiesSchema,
    serverInfo: z.object({
      name: z.string(),
      version: z.string()
    }),
    instructions: z.string().optional()
  }).optional()
})

// MCP Tool Definitions (Enhanced)
export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.any()).optional(),
    required: z.array(z.string()).optional(),
    additionalProperties: z.boolean().optional()
  })
})

export const MCPToolListRequestSchema = JSONRPCRequestSchema.extend({
  method: z.literal('tools/list'),
  params: z.object({
    cursor: z.string().optional()
  }).optional()
})

export const MCPToolListResponseSchema = JSONRPCResponseSchema.extend({
  result: z.object({
    tools: z.array(MCPToolSchema),
    nextCursor: z.string().optional()
  }).optional()
})

export const MCPToolCallRequestSchema = JSONRPCRequestSchema.extend({
  method: z.literal('tools/call'),
  params: z.object({
    name: z.string(),
    arguments: z.record(z.any()).optional()
  })
})

export const MCPToolResultSchema = z.object({
  content: z.array(z.object({
    type: z.enum(['text', 'image', 'resource']),
    text: z.string().optional(),
    data: z.string().optional(),
    mimeType: z.string().optional(),
    uri: z.string().optional()
  })),
  isError: z.boolean().optional(),
  _meta: z.record(z.any()).optional()
})

export const MCPToolCallResponseSchema = JSONRPCResponseSchema.extend({
  result: MCPToolResultSchema.optional()
})

// Streaming Events
export const StreamingEventSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['connection', 'tool_call', 'tool_result', 'notification', 'error', 'heartbeat']),
  timestamp: z.date(),
  connection_id: z.string().uuid(),
  data: z.any(),
  metadata: z.record(z.any()).optional()
})

// Progress Notifications (MCP 1.0 Feature)
export const MCPProgressNotificationSchema = z.object({
  method: z.literal('notifications/progress'),
  params: z.object({
    progressToken: z.union([z.string(), z.number()]),
    progress: z.number().min(0).max(100),
    total: z.number().optional()
  })
})

// Resource Definitions
export const MCPResourceSchema = z.object({
  uri: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional()
})

// Prompt Definitions  
export const MCPPromptSchema = z.object({
  name: z.string(),
  description: z.string(),
  arguments: z.array(z.object({
    name: z.string(),
    description: z.string(),
    required: z.boolean().optional()
  })).optional()
})

// ===== ENTERPRISE SECURITY & VALIDATION =====

export const SecurityContextSchema = z.object({
  session_id: z.string().uuid(),
  user_id: z.string().optional(),
  permissions: z.array(z.string()),
  rate_limit: z.object({
    requests_per_minute: z.number(),
    burst_limit: z.number()
  }),
  encrypted_tokens: z.record(z.string()),
  created_at: z.date(),
  expires_at: z.date()
})

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  connection_id: z.string().uuid(),
  action: z.enum(['connect', 'disconnect', 'tool_call', 'error', 'rate_limit']),
  details: z.record(z.any()),
  security_context: SecurityContextSchema,
  result: z.enum(['success', 'failure', 'blocked']),
  duration_ms: z.number().optional()
})

// ===== TYPE EXPORTS =====

export type MCPVersion = z.infer<typeof MCPVersionSchema>
export type JSONRPCRequest = z.infer<typeof JSONRPCRequestSchema>
export type JSONRPCResponse = z.infer<typeof JSONRPCResponseSchema>
export type StreamingTransportType = z.infer<typeof StreamingTransportTypeSchema>
export type StreamingConnection = z.infer<typeof StreamingConnectionSchema>
export type MCPCapabilities = z.infer<typeof MCPCapabilitiesSchema>
export type MCPInitializeRequest = z.infer<typeof MCPInitializeRequestSchema>
export type MCPInitializeResponse = z.infer<typeof MCPInitializeResponseSchema>
export type MCPTool = z.infer<typeof MCPToolSchema>
export type MCPToolListRequest = z.infer<typeof MCPToolListRequestSchema>
export type MCPToolListResponse = z.infer<typeof MCPToolListResponseSchema>
export type MCPToolCallRequest = z.infer<typeof MCPToolCallRequestSchema>
export type MCPToolResult = z.infer<typeof MCPToolResultSchema>
export type MCPToolCallResponse = z.infer<typeof MCPToolCallResponseSchema>
export type StreamingEvent = z.infer<typeof StreamingEventSchema>
export type MCPProgressNotification = z.infer<typeof MCPProgressNotificationSchema>
export type MCPResource = z.infer<typeof MCPResourceSchema>
export type MCPPrompt = z.infer<typeof MCPPromptSchema>
export type SecurityContext = z.infer<typeof SecurityContextSchema>
export type AuditLog = z.infer<typeof AuditLogSchema>

// ===== ERROR DEFINITIONS =====

export enum MCPErrorCode {
  // Standard JSON-RPC errors
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  
  // MCP-specific errors
  InvalidCapabilities = -32001,
  UnsupportedVersion = -32002,
  ToolNotFound = -32003,
  ResourceNotFound = -32004,
  PromptNotFound = -32005,
  
  // Enterprise-specific errors
  AuthenticationFailed = -32100,
  AuthorizationFailed = -32101,
  RateLimitExceeded = -32102,
  SecurityViolation = -32103,
  TokenExpired = -32104
}

export class MCPError extends Error {
  constructor(
    public code: MCPErrorCode,
    message: string,
    public data?: any
  ) {
    super(message)
    this.name = 'MCPError'
  }

  toJSONRPC(id?: string | number | null): JSONRPCResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: this.code,
        message: this.message,
        data: this.data
      }
    }
  }
}