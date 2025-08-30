#!/usr/bin/env node

import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import { config } from 'dotenv'
import axios from 'axios'

// Load environment variables
config()

const app = express()
const server = createServer(app)
const PORT = process.env.PORT || 3000

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
    'User-Agent': 'MCP-Calendly-Test/1.0.0'
  }
})

// ===== BASIC MCP TOOLS =====

// Tool 1: Get current user
async function calendly_get_current_user() {
  try {
    const response = await calendlyClient.get('/users/me')
    return {
      success: true,
      data: response.data.resource,
      message: 'Current user retrieved successfully'
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data || error.message,
      message: 'Failed to get current user'
    }
  }
}

// Tool 2: List user's event types
async function calendly_list_event_types(user_uri: string) {
  try {
    const response = await calendlyClient.get('/event_types', {
      params: { user: user_uri }
    })
    return {
      success: true,
      data: response.data.collection,
      pagination: response.data.pagination,
      message: 'Event types retrieved successfully'
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data || error.message,
      message: 'Failed to get event types'
    }
  }
}

// Tool 3: List scheduled events
async function calendly_list_scheduled_events(user_uri: string, options: any = {}) {
  try {
    const response = await calendlyClient.get('/scheduled_events', {
      params: {
        user: user_uri,
        count: options.count || 20,
        ...options
      }
    })
    return {
      success: true,
      data: response.data.collection,
      pagination: response.data.pagination,
      message: 'Scheduled events retrieved successfully'
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data || error.message,
      message: 'Failed to get scheduled events'
    }
  }
}

// ===== API ENDPOINTS =====

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'MCP Calendly Test Server',
    version: '1.0.0'
  })
})

// Test current user
app.get('/api/test/current-user', async (req, res) => {
  const result = await calendly_get_current_user()
  res.json({
    tool: 'calendly_get_current_user',
    ...result
  })
})

// Test event types
app.get('/api/test/event-types', async (req, res) => {
  // First get current user to get user URI
  const userResult = await calendly_get_current_user()
  if (!userResult.success) {
    return res.status(400).json(userResult)
  }
  
  const result = await calendly_list_event_types(userResult.data.uri)
  res.json({
    tool: 'calendly_list_event_types',
    user_uri: userResult.data.uri,
    ...result
  })
})

// Test scheduled events
app.get('/api/test/scheduled-events', async (req, res) => {
  // First get current user to get user URI
  const userResult = await calendly_get_current_user()
  if (!userResult.success) {
    return res.status(400).json(userResult)
  }
  
  const result = await calendly_list_scheduled_events(userResult.data.uri, {
    count: req.query.count || 10
  })
  res.json({
    tool: 'calendly_list_scheduled_events',
    user_uri: userResult.data.uri,
    ...result
  })
})

// Test all tools sequentially
app.get('/api/test/all-tools', async (req, res) => {
  console.log('🚀 Starting comprehensive Calendly API test...')
  
  const results = {
    timestamp: new Date().toISOString(),
    tests_completed: 0,
    tests_total: 3,
    results: [] as any[]
  }
  
  try {
    // Test 1: Get current user
    console.log('📋 Test 1: Getting current user...')
    const userResult = await calendly_get_current_user()
    results.results.push({
      test: 1,
      tool: 'calendly_get_current_user',
      status: userResult.success ? 'PASS' : 'FAIL',
      ...userResult
    })
    results.tests_completed++
    
    if (userResult.success) {
      const userUri = userResult.data.uri
      
      // Test 2: Get event types
      console.log('📅 Test 2: Getting event types...')
      const eventTypesResult = await calendly_list_event_types(userUri)
      results.results.push({
        test: 2,
        tool: 'calendly_list_event_types',
        status: eventTypesResult.success ? 'PASS' : 'FAIL',
        ...eventTypesResult
      })
      results.tests_completed++
      
      // Test 3: Get scheduled events
      console.log('🗓️ Test 3: Getting scheduled events...')
      const eventsResult = await calendly_list_scheduled_events(userUri, { count: 5 })
      results.results.push({
        test: 3,
        tool: 'calendly_list_scheduled_events',
        status: eventsResult.success ? 'PASS' : 'FAIL',
        ...eventsResult
      })
      results.tests_completed++
    }
    
  } catch (error: any) {
    results.results.push({
      test: 'error',
      status: 'FAIL',
      error: error.message,
      message: 'Unexpected error during testing'
    })
  }
  
  // Summary
  const passedTests = results.results.filter(r => r.status === 'PASS').length
  const summary = {
    total_tests: results.tests_total,
    completed_tests: results.tests_completed,
    passed_tests: passedTests,
    failed_tests: results.tests_completed - passedTests,
    success_rate: results.tests_completed > 0 ? (passedTests / results.tests_completed * 100).toFixed(1) + '%' : '0%'
  }
  
  console.log('✅ Test Summary:', summary)
  
  res.json({
    summary,
    ...results
  })
})

// Frontend test page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MCP Calendly Test Server</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100 min-h-screen">
        <div class="container mx-auto px-4 py-8 max-w-4xl">
            <div class="bg-white rounded-lg shadow-lg p-8">
                <h1 class="text-3xl font-bold text-gray-800 mb-2">
                    <i class="fas fa-calendar-alt mr-3 text-blue-600"></i>
                    MCP Calendly Test Server
                </h1>
                <p class="text-gray-600 mb-8">Production testing with real Calendly API credentials</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Test Buttons -->
                    <div class="space-y-4">
                        <h2 class="text-xl font-semibold text-gray-800">API Tests</h2>
                        
                        <button onclick="testCurrentUser()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                            <i class="fas fa-user mr-2"></i>
                            Test Current User
                        </button>
                        
                        <button onclick="testEventTypes()" class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                            <i class="fas fa-calendar-plus mr-2"></i>
                            Test Event Types
                        </button>
                        
                        <button onclick="testScheduledEvents()" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                            <i class="fas fa-calendar-check mr-2"></i>
                            Test Scheduled Events
                        </button>
                        
                        <button onclick="testAllTools()" class="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                            <i class="fas fa-rocket mr-2"></i>
                            Test All Tools
                        </button>
                    </div>
                    
                    <!-- Status -->
                    <div class="space-y-4">
                        <h2 class="text-xl font-semibold text-gray-800">Status</h2>
                        <div id="status" class="bg-gray-50 p-4 rounded-lg min-h-[200px]">
                            <p class="text-gray-600">Click a test button to begin...</p>
                        </div>
                    </div>
                </div>
                
                <!-- Results -->
                <div class="mt-8">
                    <h2 class="text-xl font-semibold text-gray-800 mb-4">Results</h2>
                    <div id="results" class="bg-gray-50 p-4 rounded-lg min-h-[200px] overflow-auto">
                        <p class="text-gray-600">Test results will appear here...</p>
                    </div>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            function updateStatus(message, type = 'info') {
                const colors = {
                    info: 'text-blue-600',
                    success: 'text-green-600', 
                    error: 'text-red-600',
                    warning: 'text-yellow-600'
                }
                document.getElementById('status').innerHTML = 
                    \`<p class="\${colors[type]} font-semibold"><i class="fas fa-circle mr-2"></i>\${message}</p>\`
            }
            
            function displayResults(data) {
                document.getElementById('results').innerHTML = 
                    \`<pre class="text-sm overflow-auto">\${JSON.stringify(data, null, 2)}</pre>\`
            }
            
            async function testCurrentUser() {
                updateStatus('Testing current user...', 'info')
                try {
                    const response = await axios.get('/api/test/current-user')
                    updateStatus(response.data.success ? 'Current user test passed!' : 'Current user test failed!', 
                                response.data.success ? 'success' : 'error')
                    displayResults(response.data)
                } catch (error) {
                    updateStatus('Current user test failed!', 'error')
                    displayResults(error.response?.data || error.message)
                }
            }
            
            async function testEventTypes() {
                updateStatus('Testing event types...', 'info')
                try {
                    const response = await axios.get('/api/test/event-types')
                    updateStatus(response.data.success ? 'Event types test passed!' : 'Event types test failed!', 
                                response.data.success ? 'success' : 'error')
                    displayResults(response.data)
                } catch (error) {
                    updateStatus('Event types test failed!', 'error')
                    displayResults(error.response?.data || error.message)
                }
            }
            
            async function testScheduledEvents() {
                updateStatus('Testing scheduled events...', 'info')
                try {
                    const response = await axios.get('/api/test/scheduled-events')
                    updateStatus(response.data.success ? 'Scheduled events test passed!' : 'Scheduled events test failed!', 
                                response.data.success ? 'success' : 'error')
                    displayResults(response.data)
                } catch (error) {
                    updateStatus('Scheduled events test failed!', 'error')
                    displayResults(error.response?.data || error.message)
                }
            }
            
            async function testAllTools() {
                updateStatus('Running comprehensive test suite...', 'info')
                try {
                    const response = await axios.get('/api/test/all-tools')
                    const summary = response.data.summary
                    updateStatus(\`All tests completed! Passed: \${summary.passed_tests}/\${summary.completed_tests} (\${summary.success_rate})\`, 
                                summary.failed_tests === 0 ? 'success' : 'warning')
                    displayResults(response.data)
                } catch (error) {
                    updateStatus('Comprehensive test failed!', 'error')
                    displayResults(error.response?.data || error.message)
                }
            }
        </script>
    </body>
    </html>
  `)
})

// Start server
server.listen(Number(PORT), '0.0.0.0', () => {
  console.log('🚀 MCP Calendly Test Server started successfully!')
  console.log(`📡 Server running at: http://0.0.0.0:${PORT}`)
  console.log(`🔑 Calendly token configured: ${process.env.CALENDLY_ACCESS_TOKEN ? 'YES' : 'NO'}`)
  console.log(`🌐 Health check: http://0.0.0.0:${PORT}/health`)
  console.log(`🧪 Test interface: http://0.0.0.0:${PORT}`)
  console.log(`📋 Ready for production testing!`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down server...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})