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
    'User-Agent': 'MCP-Calendly-Enhanced/1.0.0'
  }
})

// Helper function for error handling
function handleApiError(error: any, toolName: string) {
  return {
    success: false,
    error: error.response?.data || error.message,
    message: `Failed to execute ${toolName}`,
    status_code: error.response?.status || 500
  }
}

// Helper function for success response
function handleApiSuccess(data: any, message: string, pagination?: any) {
  return {
    success: true,
    data: data.resource || data.collection || data,
    pagination: pagination || data.pagination,
    message
  }
}

// ===== ALL 14 MCP CALENDLY TOOLS =====

// ===== USER TOOLS =====

// Tool 1: Get current user
async function calendly_get_current_user() {
  try {
    const response = await calendlyClient.get('/users/me')
    return handleApiSuccess(response.data, 'Current user retrieved successfully')
  } catch (error: any) {
    return handleApiError(error, 'calendly_get_current_user')
  }
}

// ===== EVENT TYPE TOOLS =====

// Tool 2: List event types
async function calendly_list_event_types(user_uri: string, options: any = {}) {
  try {
    const params: any = { user: user_uri }
    if (options.count) params.count = options.count
    if (options.page_token) params.page_token = options.page_token
    if (options.sort) params.sort = options.sort

    const response = await calendlyClient.get('/event_types', { params })
    return handleApiSuccess(response.data, 'Event types retrieved successfully')
  } catch (error: any) {
    return handleApiError(error, 'calendly_list_event_types')
  }
}

// Tool 3: Get event type details
async function calendly_get_event_type(event_type_uri: string) {
  try {
    const uuid = event_type_uri.split('/').pop()
    const response = await calendlyClient.get(`/event_types/${uuid}`)
    return handleApiSuccess(response.data, 'Event type details retrieved successfully')
  } catch (error: any) {
    return handleApiError(error, 'calendly_get_event_type')
  }
}

// ===== SCHEDULED EVENT TOOLS =====

// Tool 4: List scheduled events
async function calendly_list_scheduled_events(user_uri: string, options: any = {}) {
  try {
    const params: any = { user: user_uri }
    if (options.count) params.count = options.count
    if (options.page_token) params.page_token = options.page_token
    if (options.sort) params.sort = options.sort
    if (options.status) params.status = options.status
    if (options.min_start_time) params.min_start_time = options.min_start_time
    if (options.max_start_time) params.max_start_time = options.max_start_time

    const response = await calendlyClient.get('/scheduled_events', { params })
    return handleApiSuccess(response.data, 'Scheduled events retrieved successfully')
  } catch (error: any) {
    return handleApiError(error, 'calendly_list_scheduled_events')
  }
}

// Tool 5: Get scheduled event details
async function calendly_get_scheduled_event(event_uri: string) {
  try {
    const uuid = event_uri.split('/').pop()
    const response = await calendlyClient.get(`/scheduled_events/${uuid}`)
    return handleApiSuccess(response.data, 'Scheduled event details retrieved successfully')
  } catch (error: any) {
    return handleApiError(error, 'calendly_get_scheduled_event')
  }
}

// Tool 6: Cancel scheduled event
async function calendly_cancel_scheduled_event(event_uri: string, reason?: string) {
  try {
    const uuid = event_uri.split('/').pop()
    const payload: any = {}
    if (reason) payload.reason = reason

    const response = await calendlyClient.delete(`/scheduled_events/${uuid}`, { data: payload })
    return {
      success: true,
      message: 'Scheduled event cancelled successfully',
      event_uri,
      cancellation_reason: reason
    }
  } catch (error: any) {
    return handleApiError(error, 'calendly_cancel_scheduled_event')
  }
}

// ===== INVITEE TOOLS =====

// Tool 7: List event invitees
async function calendly_list_event_invitees(event_uri: string, options: any = {}) {
  try {
    const uuid = event_uri.split('/').pop()
    const params: any = {}
    if (options.count) params.count = options.count
    if (options.page_token) params.page_token = options.page_token
    if (options.sort) params.sort = options.sort
    if (options.status) params.status = options.status
    if (options.email) params.email = options.email

    const response = await calendlyClient.get(`/scheduled_events/${uuid}/invitees`, { params })
    return handleApiSuccess(response.data, 'Event invitees retrieved successfully')
  } catch (error: any) {
    return handleApiError(error, 'calendly_list_event_invitees')
  }
}

// Tool 8: Get invitee details
async function calendly_get_invitee(invitee_uri: string) {
  try {
    const uuid = invitee_uri.split('/').pop()
    const response = await calendlyClient.get(`/invitees/${uuid}`)
    return handleApiSuccess(response.data, 'Invitee details retrieved successfully')
  } catch (error: any) {
    return handleApiError(error, 'calendly_get_invitee')
  }
}

// ===== AVAILABILITY TOOLS =====

// Tool 9: Get user availability
async function calendly_get_user_availability(user_uri: string, start_date: string, end_date: string) {
  try {
    const params = {
      user: user_uri,
      start_time: start_date,
      end_time: end_date
    }
    const response = await calendlyClient.get('/user_availability_schedules', { params })
    return handleApiSuccess(response.data, 'User availability retrieved successfully')
  } catch (error: any) {
    return handleApiError(error, 'calendly_get_user_availability')
  }
}

// ===== WEBHOOK TOOLS =====

// Tool 10: List webhooks
async function calendly_list_webhooks(organization_uri: string, options: any = {}) {
  try {
    const params: any = { organization: organization_uri }
    if (options.count) params.count = options.count
    if (options.page_token) params.page_token = options.page_token
    if (options.sort) params.sort = options.sort
    if (options.scope) params.scope = options.scope

    const response = await calendlyClient.get('/webhook_subscriptions', { params })
    return handleApiSuccess(response.data, 'Webhooks retrieved successfully')
  } catch (error: any) {
    return handleApiError(error, 'calendly_list_webhooks')
  }
}

// Tool 11: Create webhook
async function calendly_create_webhook(organization_uri: string, url: string, events: string[], options: any = {}) {
  try {
    const payload: any = {
      url,
      events,
      organization: organization_uri,
      scope: options.scope || 'organization'
    }
    if (options.signing_key) payload.signing_key = options.signing_key

    const response = await calendlyClient.post('/webhook_subscriptions', payload)
    return handleApiSuccess(response.data, 'Webhook created successfully')
  } catch (error: any) {
    return handleApiError(error, 'calendly_create_webhook')
  }
}

// Tool 12: Get webhook details
async function calendly_get_webhook(webhook_uri: string) {
  try {
    const uuid = webhook_uri.split('/').pop()
    const response = await calendlyClient.get(`/webhook_subscriptions/${uuid}`)
    return handleApiSuccess(response.data, 'Webhook details retrieved successfully')
  } catch (error: any) {
    return handleApiError(error, 'calendly_get_webhook')
  }
}

// Tool 13: Delete webhook
async function calendly_delete_webhook(webhook_uri: string) {
  try {
    const uuid = webhook_uri.split('/').pop()
    await calendlyClient.delete(`/webhook_subscriptions/${uuid}`)
    return {
      success: true,
      message: 'Webhook deleted successfully',
      webhook_uri
    }
  } catch (error: any) {
    return handleApiError(error, 'calendly_delete_webhook')
  }
}

// ===== ORGANIZATION TOOLS =====

// Tool 14: Get organization details
async function calendly_get_organization(organization_uri: string) {
  try {
    const uuid = organization_uri.split('/').pop()
    const response = await calendlyClient.get(`/organizations/${uuid}`)
    return handleApiSuccess(response.data, 'Organization details retrieved successfully')
  } catch (error: any) {
    return handleApiError(error, 'calendly_get_organization')
  }
}

// ===== API ENDPOINTS =====

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'MCP Calendly Enhanced Server',
    version: '2.0.0',
    total_mcp_tools: 14
  })
})

// ===== INDIVIDUAL TOOL TESTS =====

// User tools
app.get('/api/test/current-user', async (req, res) => {
  const result = await calendly_get_current_user()
  res.json({ tool: 'calendly_get_current_user', ...result })
})

app.get('/api/test/organization', async (req, res) => {
  const userResult = await calendly_get_current_user()
  if (!userResult.success) {
    return res.status(400).json(userResult)
  }
  
  const result = await calendly_get_organization(userResult.data.current_organization)
  res.json({ tool: 'calendly_get_organization', organization_uri: userResult.data.current_organization, ...result })
})

// Event type tools
app.get('/api/test/event-types', async (req, res) => {
  const userResult = await calendly_get_current_user()
  if (!userResult.success) return res.status(400).json(userResult)
  
  const result = await calendly_list_event_types(userResult.data.uri, {
    count: req.query.count || 20
  })
  res.json({ tool: 'calendly_list_event_types', user_uri: userResult.data.uri, ...result })
})

app.get('/api/test/event-type-details', async (req, res) => {
  const userResult = await calendly_get_current_user()
  if (!userResult.success) return res.status(400).json(userResult)
  
  const eventTypesResult = await calendly_list_event_types(userResult.data.uri)
  if (!eventTypesResult.success || eventTypesResult.data.length === 0) {
    return res.status(404).json({ success: false, message: 'No event types found' })
  }
  
  const firstEventType = eventTypesResult.data[0]
  const result = await calendly_get_event_type(firstEventType.uri)
  res.json({ tool: 'calendly_get_event_type', event_type_uri: firstEventType.uri, ...result })
})

// Scheduled event tools
app.get('/api/test/scheduled-events', async (req, res) => {
  const userResult = await calendly_get_current_user()
  if (!userResult.success) return res.status(400).json(userResult)
  
  const result = await calendly_list_scheduled_events(userResult.data.uri, {
    count: req.query.count || 10
  })
  res.json({ tool: 'calendly_list_scheduled_events', user_uri: userResult.data.uri, ...result })
})

// Availability tools
app.get('/api/test/user-availability', async (req, res) => {
  const userResult = await calendly_get_current_user()
  if (!userResult.success) return res.status(400).json(userResult)
  
  // Get availability for next 7 days
  const startDate = new Date().toISOString()
  const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  
  const result = await calendly_get_user_availability(userResult.data.uri, startDate, endDate)
  res.json({ 
    tool: 'calendly_get_user_availability', 
    user_uri: userResult.data.uri,
    date_range: { start: startDate, end: endDate },
    ...result 
  })
})

// Webhook tools
app.get('/api/test/webhooks', async (req, res) => {
  const userResult = await calendly_get_current_user()
  if (!userResult.success) return res.status(400).json(userResult)
  
  const result = await calendly_list_webhooks(userResult.data.current_organization)
  res.json({ 
    tool: 'calendly_list_webhooks', 
    organization_uri: userResult.data.current_organization,
    ...result 
  })
})

// ===== COMPREHENSIVE TEST SUITE =====

app.get('/api/test/all-tools', async (req, res) => {
  console.log('🚀 Starting comprehensive 14-tool MCP test suite...')
  
  const results = {
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    tests_completed: 0,
    tests_total: 14,
    categories: {
      user: { tests: 1, passed: 0 },
      organization: { tests: 1, passed: 0 },
      event_types: { tests: 2, passed: 0 },
      scheduled_events: { tests: 3, passed: 0 },
      invitees: { tests: 2, passed: 0 },
      availability: { tests: 1, passed: 0 },
      webhooks: { tests: 4, passed: 0 }
    },
    results: [] as any[]
  }
  
  let userUri = ''
  let organizationUri = ''
  let eventTypeUri = ''
  
  try {
    // Test 1: Get current user (FOUNDATION TEST)
    console.log('👤 Test 1: Getting current user...')
    const userResult = await calendly_get_current_user()
    results.results.push({
      test: 1,
      category: 'user',
      tool: 'calendly_get_current_user',
      status: userResult.success ? 'PASS' : 'FAIL',
      ...userResult
    })
    results.tests_completed++
    if (userResult.success) {
      results.categories.user.passed++
      userUri = userResult.data.uri
      organizationUri = userResult.data.current_organization
    }
    
    if (userResult.success) {
      // Test 2: Get organization details
      console.log('🏢 Test 2: Getting organization details...')
      const orgResult = await calendly_get_organization(organizationUri)
      results.results.push({
        test: 2,
        category: 'organization',
        tool: 'calendly_get_organization',
        status: orgResult.success ? 'PASS' : 'FAIL',
        ...orgResult
      })
      results.tests_completed++
      if (orgResult.success) results.categories.organization.passed++
      
      // Test 3: List event types
      console.log('📅 Test 3: Getting event types...')
      const eventTypesResult = await calendly_list_event_types(userUri)
      results.results.push({
        test: 3,
        category: 'event_types',
        tool: 'calendly_list_event_types',
        status: eventTypesResult.success ? 'PASS' : 'FAIL',
        ...eventTypesResult
      })
      results.tests_completed++
      if (eventTypesResult.success) {
        results.categories.event_types.passed++
        if (eventTypesResult.data.length > 0) {
          eventTypeUri = eventTypesResult.data[0].uri
        }
      }
      
      // Test 4: Get event type details (if available)
      if (eventTypeUri) {
        console.log('📋 Test 4: Getting event type details...')
        const eventTypeResult = await calendly_get_event_type(eventTypeUri)
        results.results.push({
          test: 4,
          category: 'event_types',
          tool: 'calendly_get_event_type',
          status: eventTypeResult.success ? 'PASS' : 'FAIL',
          ...eventTypeResult
        })
        results.tests_completed++
        if (eventTypeResult.success) results.categories.event_types.passed++
      } else {
        results.results.push({
          test: 4,
          category: 'event_types',
          tool: 'calendly_get_event_type',
          status: 'SKIP',
          message: 'No event types available to test'
        })
        results.tests_completed++
      }
      
      // Test 5: List scheduled events
      console.log('🗓️ Test 5: Getting scheduled events...')
      const eventsResult = await calendly_list_scheduled_events(userUri, { count: 5 })
      results.results.push({
        test: 5,
        category: 'scheduled_events',
        tool: 'calendly_list_scheduled_events',
        status: eventsResult.success ? 'PASS' : 'FAIL',
        ...eventsResult
      })
      results.tests_completed++
      if (eventsResult.success) results.categories.scheduled_events.passed++
      
      // Test 6 & 7: Scheduled event details and invitees (if events exist)
      if (eventsResult.success && eventsResult.data.length > 0) {
        const eventUri = eventsResult.data[0].uri
        
        console.log('📝 Test 6: Getting scheduled event details...')
        const eventDetailResult = await calendly_get_scheduled_event(eventUri)
        results.results.push({
          test: 6,
          category: 'scheduled_events',
          tool: 'calendly_get_scheduled_event',
          status: eventDetailResult.success ? 'PASS' : 'FAIL',
          ...eventDetailResult
        })
        results.tests_completed++
        if (eventDetailResult.success) results.categories.scheduled_events.passed++
        
        console.log('👥 Test 7: Getting event invitees...')
        const inviteesResult = await calendly_list_event_invitees(eventUri)
        results.results.push({
          test: 7,
          category: 'invitees',
          tool: 'calendly_list_event_invitees',
          status: inviteesResult.success ? 'PASS' : 'FAIL',
          ...inviteesResult
        })
        results.tests_completed++
        if (inviteesResult.success) results.categories.invitees.passed++
        
        // Test 8: Get invitee details (if invitees exist)
        if (inviteesResult.success && inviteesResult.data.length > 0) {
          const inviteeUri = inviteesResult.data[0].uri
          console.log('👤 Test 8: Getting invitee details...')
          const inviteeResult = await calendly_get_invitee(inviteeUri)
          results.results.push({
            test: 8,
            category: 'invitees',
            tool: 'calendly_get_invitee',
            status: inviteeResult.success ? 'PASS' : 'FAIL',
            ...inviteeResult
          })
          results.tests_completed++
          if (inviteeResult.success) results.categories.invitees.passed++
        } else {
          results.results.push({
            test: 8,
            category: 'invitees',
            tool: 'calendly_get_invitee',
            status: 'SKIP',
            message: 'No invitees available to test'
          })
          results.tests_completed++
        }
      } else {
        // Skip tests 6, 7, 8 if no scheduled events
        results.results.push(
          {
            test: 6,
            category: 'scheduled_events',
            tool: 'calendly_get_scheduled_event',
            status: 'SKIP',
            message: 'No scheduled events available to test'
          },
          {
            test: 7,
            category: 'invitees',
            tool: 'calendly_list_event_invitees',
            status: 'SKIP',
            message: 'No scheduled events available to test'
          },
          {
            test: 8,
            category: 'invitees',
            tool: 'calendly_get_invitee',
            status: 'SKIP',
            message: 'No scheduled events available to test'
          }
        )
        results.tests_completed += 3
      }
      
      // Test 9: User availability
      console.log('⏰ Test 9: Getting user availability...')
      const startDate = new Date().toISOString()
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const availabilityResult = await calendly_get_user_availability(userUri, startDate, endDate)
      results.results.push({
        test: 9,
        category: 'availability',
        tool: 'calendly_get_user_availability',
        status: availabilityResult.success ? 'PASS' : 'FAIL',
        date_range: { start: startDate, end: endDate },
        ...availabilityResult
      })
      results.tests_completed++
      if (availabilityResult.success) results.categories.availability.passed++
      
      // Test 10: List webhooks
      console.log('🪝 Test 10: Getting webhooks...')
      const webhooksResult = await calendly_list_webhooks(organizationUri)
      results.results.push({
        test: 10,
        category: 'webhooks',
        tool: 'calendly_list_webhooks',
        status: webhooksResult.success ? 'PASS' : 'FAIL',
        ...webhooksResult
      })
      results.tests_completed++
      if (webhooksResult.success) results.categories.webhooks.passed++
      
      // Tests 11-14: Webhook CRUD operations (limited testing due to potential side effects)
      console.log('🔧 Tests 11-14: Webhook CRUD operations (validation only)...')
      results.results.push(
        {
          test: 11,
          category: 'webhooks',
          tool: 'calendly_create_webhook',
          status: 'SKIP',
          message: 'Skipped to avoid creating test webhooks'
        },
        {
          test: 12,
          category: 'webhooks',
          tool: 'calendly_get_webhook',
          status: 'SKIP',
          message: 'Requires existing webhook to test'
        },
        {
          test: 13,
          category: 'webhooks',
          tool: 'calendly_delete_webhook',
          status: 'SKIP',
          message: 'Requires existing webhook to test'
        },
        {
          test: 14,
          category: 'scheduled_events',
          tool: 'calendly_cancel_scheduled_event',
          status: 'SKIP',
          message: 'Skipped to avoid cancelling real events'
        }
      )
      results.tests_completed += 4
    }
    
  } catch (error: any) {
    results.results.push({
      test: 'error',
      status: 'FAIL',
      error: error.message,
      message: 'Unexpected error during comprehensive testing'
    })
  }
  
  // Calculate summary statistics
  const totalPassed = Object.values(results.categories).reduce((sum, cat) => sum + cat.passed, 0)
  const totalSkipped = results.results.filter(r => r.status === 'SKIP').length
  const totalExecuted = results.tests_completed - totalSkipped
  const totalFailed = totalExecuted - totalPassed
  
  const summary = {
    total_tests: results.tests_total,
    completed_tests: results.tests_completed,
    executed_tests: totalExecuted,
    passed_tests: totalPassed,
    failed_tests: totalFailed,
    skipped_tests: totalSkipped,
    success_rate: totalExecuted > 0 ? ((totalPassed / totalExecuted) * 100).toFixed(1) + '%' : '0%',
    categories: results.categories
  }
  
  console.log('✅ Comprehensive Test Summary:', summary)
  
  res.json({
    summary,
    ...results
  })
})

// Advanced testing endpoint with specific scenarios
app.get('/api/test/scenarios', async (req, res) => {
  const scenarios = [
    {
      name: 'User Profile Complete',
      tests: ['current_user', 'organization', 'event_types']
    },
    {
      name: 'Event Management',
      tests: ['event_types', 'scheduled_events', 'availability']
    },
    {
      name: 'Webhook Integration',
      tests: ['webhooks', 'organization']
    }
  ]
  
  res.json({
    available_scenarios: scenarios,
    message: 'Use /api/test/all-tools for comprehensive testing'
  })
})

// Frontend enhanced test page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MCP Calendly Enhanced Server</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
        <div class="container mx-auto px-4 py-8 max-w-6xl">
            <div class="bg-white rounded-2xl shadow-xl p-8">
                <div class="text-center mb-8">
                    <h1 class="text-4xl font-bold text-gray-800 mb-2">
                        <i class="fas fa-rocket mr-3 text-blue-600"></i>
                        MCP Calendly Enhanced Server
                    </h1>
                    <p class="text-gray-600 text-lg">Complete 14-tool MCP test suite with real Calendly API</p>
                    <div class="flex justify-center space-x-4 mt-4">
                        <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                            <i class="fas fa-tools mr-1"></i>14 MCP Tools
                        </span>
                        <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                            <i class="fas fa-shield-alt mr-1"></i>Production Ready
                        </span>
                        <span class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                            <i class="fas fa-bolt mr-1"></i>Real-time Testing
                        </span>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Quick Tests -->
                    <div class="space-y-4">
                        <h2 class="text-xl font-bold text-gray-800 flex items-center">
                            <i class="fas fa-flash mr-2 text-yellow-500"></i>
                            Quick Tests
                        </h2>
                        
                        <button onclick="testCurrentUser()" class="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all transform hover:scale-105">
                            <i class="fas fa-user mr-2"></i>
                            Current User
                        </button>
                        
                        <button onclick="testOrganization()" class="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all transform hover:scale-105">
                            <i class="fas fa-building mr-2"></i>
                            Organization
                        </button>
                        
                        <button onclick="testEventTypes()" class="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-all transform hover:scale-105">
                            <i class="fas fa-calendar-plus mr-2"></i>
                            Event Types
                        </button>
                        
                        <button onclick="testAvailability()" class="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-all transform hover:scale-105">
                            <i class="fas fa-clock mr-2"></i>
                            Availability
                        </button>
                        
                        <button onclick="testWebhooks()" class="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg transition-all transform hover:scale-105">
                            <i class="fas fa-webhook mr-2"></i>
                            Webhooks
                        </button>
                    </div>
                    
                    <!-- Comprehensive Tests -->
                    <div class="space-y-4">
                        <h2 class="text-xl font-bold text-gray-800 flex items-center">
                            <i class="fas fa-microscope mr-2 text-indigo-500"></i>
                            Comprehensive Tests
                        </h2>
                        
                        <button onclick="testAllTools()" class="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-4 px-4 rounded-lg transition-all transform hover:scale-105 text-lg">
                            <i class="fas fa-rocket mr-2"></i>
                            Test All 14 Tools
                        </button>
                        
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h3 class="font-semibold text-gray-800 mb-2">Tool Categories:</h3>
                            <div class="grid grid-cols-2 gap-2 text-sm">
                                <div class="flex items-center">
                                    <i class="fas fa-user w-4 text-blue-500 mr-2"></i>User (1)
                                </div>
                                <div class="flex items-center">
                                    <i class="fas fa-building w-4 text-green-500 mr-2"></i>Org (1)
                                </div>
                                <div class="flex items-center">
                                    <i class="fas fa-calendar w-4 text-purple-500 mr-2"></i>Events (5)
                                </div>
                                <div class="flex items-center">
                                    <i class="fas fa-users w-4 text-orange-500 mr-2"></i>Invitees (2)
                                </div>
                                <div class="flex items-center">
                                    <i class="fas fa-clock w-4 text-indigo-500 mr-2"></i>Availability (1)
                                </div>
                                <div class="flex items-center">
                                    <i class="fas fa-webhook w-4 text-pink-500 mr-2"></i>Webhooks (4)
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Status & Results -->
                    <div class="space-y-4">
                        <h2 class="text-xl font-bold text-gray-800 flex items-center">
                            <i class="fas fa-chart-line mr-2 text-green-500"></i>
                            Status & Results
                        </h2>
                        
                        <div id="status" class="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg min-h-[120px] border-2 border-dashed border-gray-300">
                            <div class="flex items-center justify-center h-full">
                                <div class="text-center">
                                    <i class="fas fa-play-circle text-3xl text-gray-400 mb-2"></i>
                                    <p class="text-gray-600">Click a test to begin...</p>
                                </div>
                            </div>
                        </div>
                        
                        <div id="progress" class="hidden">
                            <div class="bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div id="progress-bar" class="bg-gradient-to-r from-blue-500 to-green-500 h-full transition-all duration-500" style="width: 0%"></div>
                            </div>
                            <p id="progress-text" class="text-sm text-gray-600 mt-1">0% complete</p>
                        </div>
                    </div>
                </div>
                
                <!-- Results Section -->
                <div class="mt-8">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-clipboard-list mr-2 text-blue-600"></i>
                        Test Results
                    </h2>
                    <div id="results" class="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl min-h-[300px] border border-gray-200 overflow-auto">
                        <div class="flex items-center justify-center h-full">
                            <div class="text-center">
                                <i class="fas fa-flask text-4xl text-gray-400 mb-3"></i>
                                <p class="text-gray-600 text-lg">Test results will appear here...</p>
                                <p class="text-gray-500 text-sm mt-2">Run the comprehensive test suite to see detailed analysis</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            function updateStatus(message, type = 'info') {
                const colors = {
                    info: 'from-blue-50 to-blue-100 text-blue-800 border-blue-200',
                    success: 'from-green-50 to-green-100 text-green-800 border-green-200', 
                    error: 'from-red-50 to-red-100 text-red-800 border-red-200',
                    warning: 'from-yellow-50 to-yellow-100 text-yellow-800 border-yellow-200',
                    loading: 'from-purple-50 to-purple-100 text-purple-800 border-purple-200'
                }
                const icons = {
                    info: 'fa-info-circle',
                    success: 'fa-check-circle',
                    error: 'fa-times-circle',
                    warning: 'fa-exclamation-circle',
                    loading: 'fa-spinner fa-spin'
                }
                document.getElementById('status').innerHTML = 
                    \`<div class="bg-gradient-to-r \${colors[type]} p-4 rounded-lg border-2 h-full flex items-center">
                        <i class="fas \${icons[type]} text-2xl mr-3"></i>
                        <div>
                            <p class="font-semibold">\${message}</p>
                        </div>
                    </div>\`
            }
            
            function updateProgress(percent, text) {
                const progressDiv = document.getElementById('progress')
                if (percent > 0) {
                    progressDiv.classList.remove('hidden')
                    document.getElementById('progress-bar').style.width = percent + '%'
                    document.getElementById('progress-text').textContent = text
                } else {
                    progressDiv.classList.add('hidden')
                }
            }
            
            function displayResults(data) {
                const resultsDiv = document.getElementById('results')
                if (data.summary) {
                    // Enhanced display for comprehensive results
                    const summary = data.summary
                    resultsDiv.innerHTML = \`
                        <div class="space-y-6">
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div class="bg-blue-100 p-4 rounded-lg text-center border border-blue-200">
                                    <div class="text-2xl font-bold text-blue-800">\${summary.total_tests}</div>
                                    <div class="text-blue-600 text-sm">Total Tests</div>
                                </div>
                                <div class="bg-green-100 p-4 rounded-lg text-center border border-green-200">
                                    <div class="text-2xl font-bold text-green-800">\${summary.passed_tests}</div>
                                    <div class="text-green-600 text-sm">Passed</div>
                                </div>
                                <div class="bg-red-100 p-4 rounded-lg text-center border border-red-200">
                                    <div class="text-2xl font-bold text-red-800">\${summary.failed_tests}</div>
                                    <div class="text-red-600 text-sm">Failed</div>
                                </div>
                                <div class="bg-yellow-100 p-4 rounded-lg text-center border border-yellow-200">
                                    <div class="text-2xl font-bold text-yellow-800">\${summary.success_rate}</div>
                                    <div class="text-yellow-600 text-sm">Success Rate</div>
                                </div>
                            </div>
                            <div class="bg-white p-4 rounded-lg border">
                                <h3 class="font-bold mb-3 text-gray-800">Category Breakdown:</h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    \${Object.entries(summary.categories).map(([cat, stats]) => \`
                                        <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                                            <span class="capitalize font-medium">\${cat.replace('_', ' ')}</span>
                                            <span class="text-sm">\${stats.passed}/\${stats.tests} passed</span>
                                        </div>
                                    \`).join('')}
                                </div>
                            </div>
                            <details class="bg-gray-50 p-4 rounded-lg border">
                                <summary class="font-semibold cursor-pointer text-gray-800 hover:text-gray-600">
                                    <i class="fas fa-code mr-2"></i>View Raw JSON Results
                                </summary>
                                <pre class="mt-3 text-xs overflow-auto bg-gray-800 text-green-400 p-4 rounded">\${JSON.stringify(data, null, 2)}</pre>
                            </details>
                        </div>
                    \`
                } else {
                    // Simple display for individual tests
                    resultsDiv.innerHTML = \`
                        <div class="bg-white p-4 rounded-lg border">
                            <pre class="text-sm overflow-auto">\${JSON.stringify(data, null, 2)}</pre>
                        </div>
                    \`
                }
            }
            
            // Individual test functions
            async function testCurrentUser() {
                updateStatus('Testing current user...', 'loading')
                try {
                    const response = await axios.get('/api/test/current-user')
                    updateStatus(response.data.success ? 'Current user test passed!' : 'Current user test failed!', 
                                response.data.success ? 'success' : 'error')
                    displayResults(response.data)
                } catch (error) {
                    updateStatus('Current user test failed!', 'error')
                    displayResults(error.response?.data || { error: error.message })
                }
            }
            
            async function testOrganization() {
                updateStatus('Testing organization details...', 'loading')
                try {
                    const response = await axios.get('/api/test/organization')
                    updateStatus(response.data.success ? 'Organization test passed!' : 'Organization test failed!', 
                                response.data.success ? 'success' : 'error')
                    displayResults(response.data)
                } catch (error) {
                    updateStatus('Organization test failed!', 'error')
                    displayResults(error.response?.data || { error: error.message })
                }
            }
            
            async function testEventTypes() {
                updateStatus('Testing event types...', 'loading')
                try {
                    const response = await axios.get('/api/test/event-types')
                    updateStatus(response.data.success ? 'Event types test passed!' : 'Event types test failed!', 
                                response.data.success ? 'success' : 'error')
                    displayResults(response.data)
                } catch (error) {
                    updateStatus('Event types test failed!', 'error')
                    displayResults(error.response?.data || { error: error.message })
                }
            }
            
            async function testAvailability() {
                updateStatus('Testing user availability...', 'loading')
                try {
                    const response = await axios.get('/api/test/user-availability')
                    updateStatus(response.data.success ? 'Availability test passed!' : 'Availability test failed!', 
                                response.data.success ? 'success' : 'error')
                    displayResults(response.data)
                } catch (error) {
                    updateStatus('Availability test failed!', 'error')
                    displayResults(error.response?.data || { error: error.message })
                }
            }
            
            async function testWebhooks() {
                updateStatus('Testing webhooks...', 'loading')
                try {
                    const response = await axios.get('/api/test/webhooks')
                    updateStatus(response.data.success ? 'Webhooks test passed!' : 'Webhooks test failed!', 
                                response.data.success ? 'success' : 'error')
                    displayResults(response.data)
                } catch (error) {
                    updateStatus('Webhooks test failed!', 'error')
                    displayResults(error.response?.data || { error: error.message })
                }
            }
            
            async function testAllTools() {
                updateStatus('Running comprehensive 14-tool test suite...', 'loading')
                updateProgress(0, 'Initializing comprehensive test...')
                
                try {
                    // Simulate progress updates
                    let progress = 0
                    const progressInterval = setInterval(() => {
                        progress += Math.random() * 10
                        if (progress < 90) {
                            updateProgress(Math.min(progress, 90), \`Testing tools... \${Math.floor(progress)}% complete\`)
                        }
                    }, 500)
                    
                    const response = await axios.get('/api/test/all-tools')
                    
                    clearInterval(progressInterval)
                    updateProgress(100, 'All tests completed!')
                    
                    const summary = response.data.summary
                    updateStatus(\`Comprehensive test completed! Passed: \${summary.passed_tests}/\${summary.executed_tests} (\${summary.success_rate})\`, 
                                summary.failed_tests === 0 ? 'success' : 'warning')
                    displayResults(response.data)
                    
                    setTimeout(() => updateProgress(0, ''), 3000)
                } catch (error) {
                    updateStatus('Comprehensive test failed!', 'error')
                    displayResults(error.response?.data || { error: error.message })
                    updateProgress(0, '')
                }
            }
        </script>
    </body>
    </html>
  `)
})

// Start enhanced server
server.listen(Number(PORT), '0.0.0.0', () => {
  console.log('🚀 MCP Calendly Enhanced Server started successfully!')
  console.log(`📡 Server running at: http://0.0.0.0:${PORT}`)
  console.log(`🔑 Calendly token configured: ${process.env.CALENDLY_ACCESS_TOKEN ? 'YES' : 'NO'}`)
  console.log(`🛠️ Total MCP tools available: 14`)
  console.log(`🌐 Health check: http://0.0.0.0:${PORT}/health`)
  console.log(`🧪 Enhanced test interface: http://0.0.0.0:${PORT}`)
  console.log(`📋 Ready for comprehensive production testing!`)
  console.log('')
  console.log('🎯 Available MCP Tools:')
  console.log('   👤 User: calendly_get_current_user')
  console.log('   🏢 Organization: calendly_get_organization')  
  console.log('   📅 Event Types: calendly_list_event_types, calendly_get_event_type')
  console.log('   🗓️ Scheduled Events: calendly_list_scheduled_events, calendly_get_scheduled_event, calendly_cancel_scheduled_event')
  console.log('   👥 Invitees: calendly_list_event_invitees, calendly_get_invitee')
  console.log('   ⏰ Availability: calendly_get_user_availability')
  console.log('   🪝 Webhooks: calendly_list_webhooks, calendly_create_webhook, calendly_get_webhook, calendly_delete_webhook')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down enhanced server...')
  server.close(() => {
    console.log('Enhanced server closed')
    process.exit(0)
  })
})