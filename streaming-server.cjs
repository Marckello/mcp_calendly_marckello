#!/usr/bin/env node

const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const { config } = require('dotenv')
const axios = require('axios')
const EventEmitter = require('events')

// Load environment variables
config()

const app = express()
const server = createServer(app)
const PORT = process.env.PORT || 3000

// Initialize Socket.IO for WebSocket streaming
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
})

// Event emitter for SSE
const sseEmitter = new EventEmitter()

// Basic middleware
app.use(cors())
app.use(express.json())

// Calendly API client setup
const calendlyClient = axios.create({
  baseURL: 'https://api.calendly.com',
  timeout: 30000,
  headers: {
    'Authorization': `Bearer ${process.env.CALENDLY_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'MCP-Calendly-Streaming/1.0.0'
  }
})

// ===== MCP STREAMING PROTOCOL =====

// MCP Message Types
const MCPMessageType = {
  REQUEST: 'request',
  RESPONSE: 'response',
  NOTIFICATION: 'notification',
  ERROR: 'error'
}

// MCP Tool Registry - All 14 Calendly Tools
const MCP_TOOLS = {
  // User Management
  'calendly_get_current_user': {
    category: 'user',
    description: 'Get current user information',
    parameters: {}
  },
  
  // Organization
  'calendly_get_organization': {
    category: 'organization', 
    description: 'Get organization details',
    parameters: {
      organization_uri: { type: 'string', required: true }
    }
  },
  
  // Event Types
  'calendly_list_event_types': {
    category: 'event_types',
    description: 'List user event types',
    parameters: {
      user_uri: { type: 'string', required: true },
      count: { type: 'number', default: 20 }
    }
  },
  'calendly_get_event_type': {
    category: 'event_types',
    description: 'Get event type details',
    parameters: {
      event_type_uri: { type: 'string', required: true }
    }
  },
  
  // Scheduled Events
  'calendly_list_scheduled_events': {
    category: 'scheduled_events',
    description: 'List scheduled events',
    parameters: {
      user_uri: { type: 'string', required: true },
      count: { type: 'number', default: 20 },
      status: { type: 'string', enum: ['active', 'canceled'] }
    }
  },
  'calendly_get_scheduled_event': {
    category: 'scheduled_events',
    description: 'Get scheduled event details',
    parameters: {
      event_uri: { type: 'string', required: true }
    }
  },
  'calendly_cancel_scheduled_event': {
    category: 'scheduled_events',
    description: 'Cancel a scheduled event',
    parameters: {
      event_uri: { type: 'string', required: true },
      reason: { type: 'string' }
    }
  },
  
  // Invitees
  'calendly_list_event_invitees': {
    category: 'invitees',
    description: 'List event invitees',
    parameters: {
      event_uri: { type: 'string', required: true },
      count: { type: 'number', default: 20 }
    }
  },
  'calendly_get_invitee': {
    category: 'invitees',
    description: 'Get invitee details',
    parameters: {
      invitee_uri: { type: 'string', required: true }
    }
  },
  
  // Availability
  'calendly_get_user_availability': {
    category: 'availability',
    description: 'Get user availability schedule',
    parameters: {
      user_uri: { type: 'string', required: true },
      start_date: { type: 'string', required: true },
      end_date: { type: 'string', required: true }
    }
  },
  
  // Webhooks
  'calendly_list_webhooks': {
    category: 'webhooks',
    description: 'List webhooks',
    parameters: {
      organization_uri: { type: 'string', required: true },
      scope: { type: 'string', enum: ['organization', 'user'], default: 'organization' }
    }
  },
  'calendly_create_webhook': {
    category: 'webhooks',
    description: 'Create webhook',
    parameters: {
      organization_uri: { type: 'string', required: true },
      url: { type: 'string', required: true },
      events: { type: 'array', required: true },
      scope: { type: 'string', default: 'organization' }
    }
  },
  'calendly_get_webhook': {
    category: 'webhooks',
    description: 'Get webhook details',
    parameters: {
      webhook_uri: { type: 'string', required: true }
    }
  },
  'calendly_delete_webhook': {
    category: 'webhooks',
    description: 'Delete webhook',
    parameters: {
      webhook_uri: { type: 'string', required: true }
    }
  }
}

// ===== MCP TOOL IMPLEMENTATIONS =====

async function executeMCPTool(toolName, parameters = {}) {
  console.log(`🔧 Executing MCP tool: ${toolName}`, parameters)
  
  try {
    switch (toolName) {
      case 'calendly_get_current_user':
        return await calendly_get_current_user()
      
      case 'calendly_get_organization':
        return await calendly_get_organization(parameters.organization_uri)
      
      case 'calendly_list_event_types':
        return await calendly_list_event_types(parameters.user_uri, parameters)
      
      case 'calendly_get_event_type':
        return await calendly_get_event_type(parameters.event_type_uri)
      
      case 'calendly_list_scheduled_events':
        return await calendly_list_scheduled_events(parameters.user_uri, parameters)
      
      case 'calendly_get_scheduled_event':
        return await calendly_get_scheduled_event(parameters.event_uri)
      
      case 'calendly_cancel_scheduled_event':
        return await calendly_cancel_scheduled_event(parameters.event_uri, parameters.reason)
      
      case 'calendly_list_event_invitees':
        return await calendly_list_event_invitees(parameters.event_uri, parameters)
      
      case 'calendly_get_invitee':
        return await calendly_get_invitee(parameters.invitee_uri)
      
      case 'calendly_get_user_availability':
        return await calendly_get_user_availability(parameters.user_uri, parameters.start_date, parameters.end_date)
      
      case 'calendly_list_webhooks':
        return await calendly_list_webhooks(parameters.organization_uri, { scope: parameters.scope })
      
      case 'calendly_create_webhook':
        return await calendly_create_webhook(parameters.organization_uri, parameters.url, parameters.events, parameters)
      
      case 'calendly_get_webhook':
        return await calendly_get_webhook(parameters.webhook_uri)
      
      case 'calendly_delete_webhook':
        return await calendly_delete_webhook(parameters.webhook_uri)
      
      default:
        throw new Error(`Unknown MCP tool: ${toolName}`)
    }
  } catch (error) {
    console.error(`❌ MCP tool execution failed: ${toolName}`, error.message)
    throw error
  }
}

// Helper functions (same as before)
function handleApiError(error, toolName) {
  return {
    success: false,
    error: error.response?.data || error.message,
    message: `Failed to execute ${toolName}`,
    status_code: error.response?.status || 500
  }
}

function handleApiSuccess(data, message, pagination) {
  return {
    success: true,
    data: data.resource || data.collection || data,
    pagination: pagination || data.pagination,
    message
  }
}

// Tool implementations (same as enhanced server)
async function calendly_get_current_user() {
  try {
    const response = await calendlyClient.get('/users/me')
    return handleApiSuccess(response.data, 'Current user retrieved successfully')
  } catch (error) {
    return handleApiError(error, 'calendly_get_current_user')
  }
}

async function calendly_get_organization(organization_uri) {
  try {
    const uuid = organization_uri.split('/').pop()
    const response = await calendlyClient.get(`/organizations/${uuid}`)
    return handleApiSuccess(response.data, 'Organization details retrieved successfully')
  } catch (error) {
    return handleApiError(error, 'calendly_get_organization')
  }
}

async function calendly_list_event_types(user_uri, options = {}) {
  try {
    const params = { user: user_uri }
    if (options.count) params.count = options.count

    const response = await calendlyClient.get('/event_types', { params })
    return handleApiSuccess(response.data, 'Event types retrieved successfully')
  } catch (error) {
    return handleApiError(error, 'calendly_list_event_types')
  }
}

async function calendly_get_event_type(event_type_uri) {
  try {
    const uuid = event_type_uri.split('/').pop()
    const response = await calendlyClient.get(`/event_types/${uuid}`)
    return handleApiSuccess(response.data, 'Event type details retrieved successfully')
  } catch (error) {
    return handleApiError(error, 'calendly_get_event_type')
  }
}

async function calendly_list_scheduled_events(user_uri, options = {}) {
  try {
    const params = { user: user_uri }
    if (options.count) params.count = options.count
    if (options.status) params.status = options.status

    const response = await calendlyClient.get('/scheduled_events', { params })
    return handleApiSuccess(response.data, 'Scheduled events retrieved successfully')
  } catch (error) {
    return handleApiError(error, 'calendly_list_scheduled_events')
  }
}

async function calendly_get_scheduled_event(event_uri) {
  try {
    const uuid = event_uri.split('/').pop()
    const response = await calendlyClient.get(`/scheduled_events/${uuid}`)
    return handleApiSuccess(response.data, 'Scheduled event details retrieved successfully')
  } catch (error) {
    return handleApiError(error, 'calendly_get_scheduled_event')
  }
}

async function calendly_cancel_scheduled_event(event_uri, reason) {
  try {
    const uuid = event_uri.split('/').pop()
    const payload = {}
    if (reason) payload.reason = reason

    await calendlyClient.delete(`/scheduled_events/${uuid}`, { data: payload })
    return {
      success: true,
      message: 'Scheduled event cancelled successfully',
      event_uri,
      cancellation_reason: reason
    }
  } catch (error) {
    return handleApiError(error, 'calendly_cancel_scheduled_event')
  }
}

async function calendly_list_event_invitees(event_uri, options = {}) {
  try {
    const uuid = event_uri.split('/').pop()
    const params = {}
    if (options.count) params.count = options.count

    const response = await calendlyClient.get(`/scheduled_events/${uuid}/invitees`, { params })
    return handleApiSuccess(response.data, 'Event invitees retrieved successfully')
  } catch (error) {
    return handleApiError(error, 'calendly_list_event_invitees')
  }
}

async function calendly_get_invitee(invitee_uri) {
  try {
    const uuid = invitee_uri.split('/').pop()
    const response = await calendlyClient.get(`/invitees/${uuid}`)
    return handleApiSuccess(response.data, 'Invitee details retrieved successfully')
  } catch (error) {
    return handleApiError(error, 'calendly_get_invitee')
  }
}

async function calendly_get_user_availability(user_uri, start_date, end_date) {
  try {
    const params = {
      user: user_uri,
      start_time: start_date,
      end_time: end_date
    }
    const response = await calendlyClient.get('/user_availability_schedules', { params })
    return handleApiSuccess(response.data, 'User availability retrieved successfully')
  } catch (error) {
    return handleApiError(error, 'calendly_get_user_availability')
  }
}

async function calendly_list_webhooks(organization_uri, options = {}) {
  try {
    const params = { 
      organization: organization_uri,
      scope: options.scope || 'organization'
    }

    const response = await calendlyClient.get('/webhook_subscriptions', { params })
    return handleApiSuccess(response.data, 'Webhooks retrieved successfully')
  } catch (error) {
    return handleApiError(error, 'calendly_list_webhooks')
  }
}

async function calendly_create_webhook(organization_uri, url, events, options = {}) {
  try {
    const payload = {
      url,
      events,
      organization: organization_uri,
      scope: options.scope || 'organization'
    }
    if (options.signing_key) payload.signing_key = options.signing_key

    const response = await calendlyClient.post('/webhook_subscriptions', payload)
    return handleApiSuccess(response.data, 'Webhook created successfully')
  } catch (error) {
    return handleApiError(error, 'calendly_create_webhook')
  }
}

async function calendly_get_webhook(webhook_uri) {
  try {
    const uuid = webhook_uri.split('/').pop()
    const response = await calendlyClient.get(`/webhook_subscriptions/${uuid}`)
    return handleApiSuccess(response.data, 'Webhook details retrieved successfully')
  } catch (error) {
    return handleApiError(error, 'calendly_get_webhook')
  }
}

async function calendly_delete_webhook(webhook_uri) {
  try {
    const uuid = webhook_uri.split('/').pop()
    await calendlyClient.delete(`/webhook_subscriptions/${uuid}`)
    return {
      success: true,
      message: 'Webhook deleted successfully',
      webhook_uri
    }
  } catch (error) {
    return handleApiError(error, 'calendly_delete_webhook')
  }
}

// ===== WEBSOCKET MCP STREAMING =====

// Connection management
const connections = new Map()
let connectionId = 0

io.on('connection', (socket) => {
  const connId = ++connectionId
  const connectionInfo = {
    id: connId,
    socket,
    connected_at: new Date(),
    last_activity: new Date(),
    requests_count: 0,
    tools_executed: []
  }
  
  connections.set(connId, connectionInfo)
  
  console.log(`🔌 WebSocket connection established: ${connId} (Total: ${connections.size})`)
  
  // Send MCP initialization
  socket.emit('mcp_initialize', {
    type: MCPMessageType.RESPONSE,
    protocol_version: '1.1.0',
    server_info: {
      name: 'MCP Calendly Streaming Server',
      version: '1.1.1',
      total_tools: Object.keys(MCP_TOOLS).length
    },
    capabilities: {
      tools: true,
      streaming: true,
      real_time_events: true
    },
    available_tools: Object.keys(MCP_TOOLS),
    connection_id: connId,
    timestamp: new Date().toISOString()
  })
  
  // Handle MCP tool requests
  socket.on('mcp_tool_request', async (message) => {
    console.log(`📥 MCP Tool Request from ${connId}:`, message.tool_name)
    
    const startTime = Date.now()
    connectionInfo.requests_count++
    connectionInfo.last_activity = new Date()
    
    try {
      // Validate tool exists
      if (!MCP_TOOLS[message.tool_name]) {
        throw new Error(`Unknown tool: ${message.tool_name}`)
      }
      
      // Send progress notification
      socket.emit('mcp_tool_progress', {
        type: MCPMessageType.NOTIFICATION,
        request_id: message.request_id,
        status: 'executing',
        tool_name: message.tool_name,
        timestamp: new Date().toISOString()
      })
      
      // Execute tool
      const result = await executeMCPTool(message.tool_name, message.parameters || {})
      const executionTime = Date.now() - startTime
      
      // Track execution
      connectionInfo.tools_executed.push({
        tool: message.tool_name,
        timestamp: new Date(),
        execution_time: executionTime,
        success: result.success
      })
      
      // Send result
      const response = {
        type: MCPMessageType.RESPONSE,
        request_id: message.request_id,
        tool_name: message.tool_name,
        result,
        execution_time: executionTime,
        connection_id: connId,
        timestamp: new Date().toISOString()
      }
      
      socket.emit('mcp_tool_response', response)
      
      // Broadcast to SSE
      sseEmitter.emit('tool_executed', {
        connection_id: connId,
        tool_name: message.tool_name,
        success: result.success,
        execution_time: executionTime
      })
      
      console.log(`✅ MCP Tool executed: ${message.tool_name} (${executionTime}ms)`)
      
    } catch (error) {
      console.error(`❌ MCP Tool error: ${message.tool_name}`, error.message)
      
      socket.emit('mcp_tool_error', {
        type: MCPMessageType.ERROR,
        request_id: message.request_id,
        tool_name: message.tool_name,
        error: {
          code: 'TOOL_EXECUTION_ERROR',
          message: error.message
        },
        connection_id: connId,
        timestamp: new Date().toISOString()
      })
    }
  })
  
  // Handle real-time events subscription
  socket.on('subscribe_events', (eventTypes) => {
    console.log(`📡 Event subscription from ${connId}:`, eventTypes)
    connectionInfo.subscribed_events = eventTypes
    
    socket.emit('subscription_confirmed', {
      type: MCPMessageType.NOTIFICATION,
      subscribed_events: eventTypes,
      connection_id: connId,
      timestamp: new Date().toISOString()
    })
  })
  
  // Handle ping/pong for connection health
  socket.on('ping', () => {
    connectionInfo.last_activity = new Date()
    socket.emit('pong', {
      connection_id: connId,
      timestamp: new Date().toISOString()
    })
  })
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`🔌 WebSocket disconnected: ${connId} (Reason: ${reason})`)
    connections.delete(connId)
  })
})

// ===== SERVER-SENT EVENTS (SSE) =====

app.get('/events', (req, res) => {
  // Setup SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  })
  
  const clientId = Date.now()
  console.log(`📡 SSE Client connected: ${clientId}`)
  
  // Send initial connection event
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    client_id: clientId,
    server_info: {
      name: 'MCP Calendly Streaming Server',
      version: '1.1.0'
    },
    timestamp: new Date().toISOString()
  })}\\n\\n`)
  
  // Listen for tool execution events
  const toolExecutedHandler = (data) => {
    res.write(`event: tool_executed\\n`)
    res.write(`data: ${JSON.stringify(data)}\\n\\n`)
  }
  
  // Listen for connection events  
  const connectionHandler = (data) => {
    res.write(`event: connection_update\\n`)
    res.write(`data: ${JSON.stringify(data)}\\n\\n`)
  }
  
  sseEmitter.on('tool_executed', toolExecutedHandler)
  sseEmitter.on('connection_update', connectionHandler)
  
  // Send periodic stats
  const statsInterval = setInterval(() => {
    const stats = {
      type: 'server_stats',
      active_connections: connections.size,
      total_tools: Object.keys(MCP_TOOLS).length,
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }
    
    res.write(`event: server_stats\\n`)
    res.write(`data: ${JSON.stringify(stats)}\\n\\n`)
  }, 5000)
  
  // Cleanup on client disconnect
  req.on('close', () => {
    console.log(`📡 SSE Client disconnected: ${clientId}`)
    clearInterval(statsInterval)
    sseEmitter.removeListener('tool_executed', toolExecutedHandler)
    sseEmitter.removeListener('connection_update', connectionHandler)
  })
})

// ===== REST API ENDPOINTS =====

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'MCP Calendly Streaming Server',
    version: '1.1.1',
    features: ['websocket', 'sse', 'mcp_protocol'],
    active_connections: connections.size,
    total_tools: Object.keys(MCP_TOOLS).length
  })
})

// MCP Tools registry
app.get('/api/mcp/tools', (req, res) => {
  res.json({
    total_tools: Object.keys(MCP_TOOLS).length,
    tools: MCP_TOOLS,
    categories: {
      user: Object.keys(MCP_TOOLS).filter(tool => MCP_TOOLS[tool].category === 'user'),
      organization: Object.keys(MCP_TOOLS).filter(tool => MCP_TOOLS[tool].category === 'organization'),
      event_types: Object.keys(MCP_TOOLS).filter(tool => MCP_TOOLS[tool].category === 'event_types'),
      scheduled_events: Object.keys(MCP_TOOLS).filter(tool => MCP_TOOLS[tool].category === 'scheduled_events'),
      invitees: Object.keys(MCP_TOOLS).filter(tool => MCP_TOOLS[tool].category === 'invitees'),
      availability: Object.keys(MCP_TOOLS).filter(tool => MCP_TOOLS[tool].category === 'availability'),
      webhooks: Object.keys(MCP_TOOLS).filter(tool => MCP_TOOLS[tool].category === 'webhooks')
    }
  })
})

// Connection stats
app.get('/api/connections', (req, res) => {
  const stats = Array.from(connections.values()).map(conn => ({
    id: conn.id,
    connected_at: conn.connected_at,
    last_activity: conn.last_activity,
    requests_count: conn.requests_count,
    tools_executed: conn.tools_executed.length,
    subscribed_events: conn.subscribed_events || []
  }))
  
  res.json({
    active_connections: connections.size,
    connections: stats,
    server_uptime: process.uptime()
  })
})

// Webhook endpoint for Calendly real-time events
app.post('/webhook/calendly', (req, res) => {
  console.log('🪝 Calendly webhook received:', req.body.event)
  
  // Broadcast to all WebSocket connections
  const webhookEvent = {
    type: 'calendly_webhook',
    event: req.body.event,
    payload: req.body.payload,
    timestamp: new Date().toISOString()
  }
  
  io.emit('calendly_event', webhookEvent)
  
  // Send to SSE clients
  sseEmitter.emit('calendly_event', webhookEvent)
  
  res.status(200).json({ received: true })
})

// Frontend streaming interface
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MCP Calendly Streaming Server</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="/socket.io/socket.io.js"></script>
    </head>
    <body class="bg-gradient-to-br from-purple-50 to-indigo-100 min-h-screen">
        <div class="container mx-auto px-4 py-6 max-w-7xl">
            <div class="bg-white rounded-2xl shadow-2xl p-8">
                <!-- Header -->
                <div class="text-center mb-8">
                    <h1 class="text-4xl font-bold text-gray-800 mb-3">
                        <i class="fas fa-broadcast-tower mr-3 text-purple-600"></i>
                        MCP Calendly Streaming Server
                    </h1>
                    <p class="text-gray-600 text-lg mb-4">Real-time bidirectional streaming with WebSocket + SSE</p>
                    <div class="flex justify-center space-x-4">
                        <span class="bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-semibold">
                            <i class="fas fa-plug mr-2"></i>WebSocket Streaming
                        </span>
                        <span class="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold">
                            <i class="fas fa-rss mr-2"></i>Server-Sent Events
                        </span>
                        <span class="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
                            <i class="fas fa-tools mr-2"></i>14 MCP Tools
                        </span>
                    </div>
                </div>

                <!-- Connection Status -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg border-2 border-purple-200">
                        <h3 class="font-bold text-purple-800 mb-2 flex items-center">
                            <i class="fas fa-wifi mr-2"></i>WebSocket Status
                        </h3>
                        <div id="ws-status" class="text-gray-600">Connecting...</div>
                    </div>
                    
                    <div class="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-200">
                        <h3 class="font-bold text-blue-800 mb-2 flex items-center">
                            <i class="fas fa-stream mr-2"></i>SSE Status
                        </h3>
                        <div id="sse-status" class="text-gray-600">Connecting...</div>
                    </div>
                    
                    <div class="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border-2 border-green-200">
                        <h3 class="font-bold text-green-800 mb-2 flex items-center">
                            <i class="fas fa-chart-line mr-2"></i>Server Stats
                        </h3>
                        <div id="server-stats" class="text-gray-600">Loading...</div>
                    </div>
                </div>

                <!-- MCP Tool Testing -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-rocket mr-2 text-purple-600"></i>
                            MCP Tool Testing
                        </h2>
                        
                        <div class="space-y-3">
                            <button onclick="testMCPTool('calendly_get_current_user')" class="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-all">
                                <i class="fas fa-user mr-2"></i>Get Current User (WebSocket)
                            </button>
                            
                            <button onclick="testMCPTool('calendly_get_organization', {organization_uri: getUserOrg()})" class="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all">
                                <i class="fas fa-building mr-2"></i>Get Organization (WebSocket)
                            </button>
                            
                            <button onclick="testMCPTool('calendly_list_event_types', {user_uri: getUserUri()})" class="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all">
                                <i class="fas fa-calendar mr-2"></i>List Event Types (WebSocket)
                            </button>
                            
                            <button onclick="testAvailabilityStreaming()" class="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-all">
                                <i class="fas fa-clock mr-2"></i>Get Availability (WebSocket)
                            </button>
                            
                            <button onclick="testMultipleTools()" class="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-4 px-4 rounded-lg transition-all text-lg">
                                <i class="fas fa-bolt mr-2"></i>Test Multiple Tools Streaming
                            </button>
                        </div>
                    </div>
                    
                    <!-- Real-time Events -->
                    <div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-satellite-dish mr-2 text-blue-600"></i>
                            Real-time Events
                        </h2>
                        
                        <div id="events-log" class="bg-gray-900 text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-sm">
                            <div class="text-gray-500">// Real-time events will appear here...</div>
                        </div>
                    </div>
                </div>

                <!-- Results Dashboard -->
                <div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-chart-bar mr-2 text-indigo-600"></i>
                        Streaming Results Dashboard
                    </h2>
                    <div id="results-dashboard" class="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200 min-h-[300px]">
                        <div class="flex items-center justify-center h-full">
                            <div class="text-center">
                                <i class="fas fa-stream text-4xl text-gray-400 mb-3"></i>
                                <p class="text-gray-600 text-lg">Streaming results will appear here in real-time</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <script>
            // Global variables
            let socket = null
            let eventSource = null
            let currentUser = null
            let requestCounter = 0
            
            // Initialize connections
            function initializeConnections() {
                // WebSocket connection
                socket = io()
                
                socket.on('connect', () => {
                    updateStatus('ws-status', '✅ Connected', 'text-green-600')
                    logEvent('WebSocket connected')
                })
                
                socket.on('disconnect', () => {
                    updateStatus('ws-status', '❌ Disconnected', 'text-red-600')
                    logEvent('WebSocket disconnected')
                })
                
                socket.on('mcp_initialize', (data) => {
                    logEvent('MCP Protocol initialized: ' + JSON.stringify(data.server_info))
                })
                
                socket.on('mcp_tool_response', (data) => {
                    logEvent('MCP Tool Response: ' + data.tool_name + ' (' + data.execution_time + 'ms)')
                    displayResult(data)
                })
                
                socket.on('mcp_tool_progress', (data) => {
                    logEvent('MCP Tool Progress: ' + data.tool_name + ' - ' + data.status)
                })
                
                socket.on('mcp_tool_error', (data) => {
                    logEvent('MCP Tool Error: ' + data.tool_name + ' - ' + data.error.message, 'error')
                })
                
                // SSE connection
                eventSource = new EventSource('/events')
                
                eventSource.onopen = () => {
                    updateStatus('sse-status', '✅ Connected', 'text-green-600')
                    logEvent('SSE connected')
                }
                
                eventSource.onerror = () => {
                    updateStatus('sse-status', '❌ Error', 'text-red-600')
                    logEvent('SSE error', 'error')
                }
                
                eventSource.addEventListener('server_stats', (event) => {
                    const data = JSON.parse(event.data)
                    updateServerStats(data)
                })
                
                eventSource.addEventListener('tool_executed', (event) => {
                    const data = JSON.parse(event.data)
                    logEvent('Tool executed via SSE: ' + data.tool_name + ' (' + data.execution_time + 'ms)')
                })
            }
            
            // Utility functions
            function updateStatus(elementId, message, className) {
                const element = document.getElementById(elementId)
                element.textContent = message
                element.className = 'font-semibold ' + className
            }
            
            function updateServerStats(stats) {
                const element = document.getElementById('server-stats')
                element.innerHTML = \`
                    <div class="space-y-1">
                        <div>Connections: <span class="font-semibold">\${stats.active_connections}</span></div>
                        <div>Uptime: <span class="font-semibold">\${Math.floor(stats.uptime)}s</span></div>
                        <div>Memory: <span class="font-semibold">\${Math.round(stats.memory_usage.heapUsed/1024/1024)}MB</span></div>
                    </div>
                \`
            }
            
            function logEvent(message, type = 'info') {
                const log = document.getElementById('events-log')
                const timestamp = new Date().toLocaleTimeString()
                const color = type === 'error' ? 'text-red-400' : 'text-green-400'
                
                const entry = document.createElement('div')
                entry.className = color
                entry.innerHTML = \`[\${timestamp}] \${message}\`
                
                log.appendChild(entry)
                log.scrollTop = log.scrollHeight
            }
            
            function displayResult(data) {
                const dashboard = document.getElementById('results-dashboard')
                dashboard.innerHTML = \`
                    <div class="bg-white p-6 rounded-lg border">
                        <h3 class="font-bold text-lg mb-3 flex items-center">
                            <i class="fas fa-bolt mr-2 text-purple-600"></i>
                            \${data.tool_name}
                        </h3>
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <span class="text-sm text-gray-600">Status:</span>
                                <span class="ml-2 font-semibold \${data.result.success ? 'text-green-600' : 'text-red-600'}">
                                    \${data.result.success ? '✅ Success' : '❌ Failed'}
                                </span>
                            </div>
                            <div>
                                <span class="text-sm text-gray-600">Execution Time:</span>
                                <span class="ml-2 font-semibold text-blue-600">\${data.execution_time}ms</span>
                            </div>
                        </div>
                        <pre class="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-64">\${JSON.stringify(data.result, null, 2)}</pre>
                    </div>
                \`
            }
            
            // MCP Tool testing functions
            function testMCPTool(toolName, parameters = {}) {
                const requestId = ++requestCounter
                logEvent('Sending MCP Tool Request: ' + toolName)
                
                socket.emit('mcp_tool_request', {
                    request_id: requestId,
                    tool_name: toolName,
                    parameters: parameters
                })
            }
            
            function getUserUri() {
                return currentUser ? currentUser.uri : 'https://api.calendly.com/users/8974deb5-55b8-4668-9231-44c02587fcee'
            }
            
            function getUserOrg() {
                return currentUser ? currentUser.current_organization : 'https://api.calendly.com/organizations/b6b8e058-3cc6-4f98-89bd-848cf758132d'
            }
            
            function testAvailabilityStreaming() {
                const startDate = new Date().toISOString()
                const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                
                testMCPTool('calendly_get_user_availability', {
                    user_uri: getUserUri(),
                    start_date: startDate,
                    end_date: endDate
                })
            }
            
            function testMultipleTools() {
                logEvent('Starting multiple tools streaming test...')
                
                // Test sequence of tools
                setTimeout(() => testMCPTool('calendly_get_current_user'), 0)
                setTimeout(() => testMCPTool('calendly_get_organization', {organization_uri: getUserOrg()}), 1000)
                setTimeout(() => testMCPTool('calendly_list_event_types', {user_uri: getUserUri()}), 2000)
                setTimeout(() => testMCPTool('calendly_list_scheduled_events', {user_uri: getUserUri()}), 3000)
                setTimeout(() => testAvailabilityStreaming(), 4000)
            }
            
            // Initialize on page load
            document.addEventListener('DOMContentLoaded', initializeConnections)
            
            // Store current user when received
            if (socket) {
                socket.on('mcp_tool_response', (data) => {
                    if (data.tool_name === 'calendly_get_current_user' && data.result.success) {
                        currentUser = data.result.data
                        logEvent('Current user stored for future requests')
                    }
                })
            }
        </script>
    </body>
    </html>
  `)
})

// Start streaming server
server.listen(Number(PORT), '0.0.0.0', () => {
  console.log('🚀 MCP Calendly Streaming Server started successfully!')
  console.log(`📡 Server running at: http://0.0.0.0:${PORT}`)
  console.log(`🔑 Calendly token configured: ${process.env.CALENDLY_ACCESS_TOKEN ? 'YES' : 'NO'}`)
  console.log(`🌐 WebSocket endpoint: ws://0.0.0.0:${PORT}`)
  console.log(`📺 SSE endpoint: http://0.0.0.0:${PORT}/events`)
  console.log(`🛠️ Total MCP tools available: ${Object.keys(MCP_TOOLS).length}`)
  console.log(`🎯 Streaming interface: http://0.0.0.0:${PORT}`)
  console.log('')
  console.log('🎊 Features enabled:')
  console.log('   🔌 WebSocket bidirectional streaming')
  console.log('   📡 Server-Sent Events (SSE)')
  console.log('   🛡️ MCP 1.0 protocol compliance')
  console.log('   ⚡ Real-time tool execution')
  console.log('   📊 Connection management & monitoring')
  console.log('   🪝 Calendly webhook integration')
  console.log('')
  console.log('📋 Ready for enterprise streaming!')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down streaming server...')
  
  // Close all connections
  connections.forEach((conn) => {
    conn.socket.disconnect(true)
  })
  
  server.close(() => {
    console.log('Streaming server closed')
    process.exit(0)
  })
})