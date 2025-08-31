import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { CalendlyService } from './dist/services/calendly.js';
import { CalendlyCoreTools } from './dist/tools/calendly-core.js';
import { CalendlyInviteeTools } from './dist/tools/calendly-invitees.js';
import { CalendlyWebhookTools } from './dist/tools/calendly-webhooks.js';
import { Logger } from './dist/utils/logger.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;
const logger = Logger.getInstance();

// Services
let calendly;
let coreTools;
let inviteeTools;
let webhookTools;

// Initialize services
async function initializeServices() {
    try {
        const config = {
            accessToken: process.env.CALENDLY_ACCESS_TOKEN,
            timeout: 30000
        };
        
        calendly = new CalendlyService(config);
        await calendly.healthCheck();
        
        coreTools = new CalendlyCoreTools(calendly);
        inviteeTools = new CalendlyInviteeTools(calendly);
        webhookTools = new CalendlyWebhookTools(calendly);
        
        logger.info('All services initialized successfully');
        return true;
    } catch (error) {
        logger.error('Failed to initialize services:', error);
        return false;
    }
}

// Enable CORS for all origins - EXACTLY like debug server
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Log requests
app.use((req, res, next) => {
    logger.info(`Request: ${req.method} ${req.path}`);
    if (req.method === 'POST') {
        logger.info('Body:', req.body);
    }
    next();
});

// Handle OPTIONS
app.options('*', (req, res) => {
    res.status(200).end();
});

// Main MCP endpoint - EXACTLY like debug server structure
app.post('/mcp', async (req, res) => {
    const { method, params, id, jsonrpc } = req.body;
    
    logger.info(`MCP Method: ${method}`);
    
    // Set headers like debug server
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    let response = {
        jsonrpc: jsonrpc || '2.0',
        id: id
    };
    
    try {
        switch(method) {
            case 'initialize':
                response.result = {
                    protocolVersion: params?.protocolVersion || '2025-03-26',
                    capabilities: {
                        tools: {
                            listTools: true,
                            callTool: true
                        }
                    },
                    serverInfo: {
                        name: 'calendly-mcp-server',
                        version: '1.3.0'
                    }
                };
                break;
                
            case 'tools/list':
                response.result = {
                    tools: [
                        { 
                            name: 'calendly_get_current_user', 
                            description: 'Get current user information',
                            inputSchema: {
                                type: 'object',
                                properties: {},
                                required: []
                            }
                        },
                        { 
                            name: 'calendly_get_organization', 
                            description: 'Get organization details',
                            inputSchema: {
                                type: 'object',
                                properties: {},
                                required: []
                            }
                        },
                        { 
                            name: 'calendly_list_event_types', 
                            description: 'List user event types with their scheduling URLs. Note: To schedule a meeting, users must visit the scheduling_url in their browser.',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    active_only: { type: 'boolean', description: 'Return only active event types' },
                                    count: { type: 'number', description: 'Number of results to return' }
                                },
                                required: []
                            }
                        },
                        { 
                            name: 'calendly_get_scheduling_links', 
                            description: 'Get scheduling links for booking meetings. Returns URLs that users can visit to schedule appointments.',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    active_only: { type: 'boolean', description: 'Return only active event types', default: true }
                                },
                                required: []
                            }
                        },
                        { 
                            name: 'calendly_create_booking_url', 
                            description: 'Create a pre-filled booking URL for a specific event type with invitee information',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    event_type_name: { type: 'string', description: 'Name of the event type (e.g., "30 Minute Meeting")' },
                                    invitee_name: { type: 'string', description: 'Name of the person booking the meeting' },
                                    invitee_email: { type: 'string', description: 'Email of the person booking the meeting' },
                                    timezone: { type: 'string', description: 'Timezone for the meeting (e.g., "America/New_York", "Europe/London")', default: 'America/New_York' }
                                },
                                required: ['event_type_name']
                            }
                        },
                        { 
                            name: 'calendly_get_event_type', 
                            description: 'Get event type details',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    uuid: { type: 'string', description: 'Event type UUID' }
                                },
                                required: ['uuid']
                            }
                        },
                        { 
                            name: 'calendly_list_scheduled_events', 
                            description: 'List scheduled events',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    count: { type: 'number', description: 'Number of results to return' },
                                    status: { type: 'string', description: 'Filter by status', enum: ['active', 'canceled'] }
                                },
                                required: []
                            }
                        },
                        { 
                            name: 'calendly_get_scheduled_event', 
                            description: 'Get scheduled event details',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    uuid: { type: 'string', description: 'Scheduled event UUID' }
                                },
                                required: ['uuid']
                            }
                        },
                        { 
                            name: 'calendly_cancel_scheduled_event', 
                            description: 'Cancel a scheduled event',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    uuid: { type: 'string', description: 'Event UUID to cancel' },
                                    reason: { type: 'string', description: 'Cancellation reason' }
                                },
                                required: ['uuid']
                            }
                        },
                        { 
                            name: 'calendly_get_user_availability', 
                            description: 'Get user availability schedule',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    date_start: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
                                    date_end: { type: 'string', description: 'End date (YYYY-MM-DD)' }
                                },
                                required: []
                            }
                        },
                        { 
                            name: 'calendly_list_event_invitees', 
                            description: 'List event invitees',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    uuid: { type: 'string', description: 'Scheduled event UUID' },
                                    count: { type: 'number', description: 'Number of results' }
                                },
                                required: ['uuid']
                            }
                        },
                        { 
                            name: 'calendly_get_invitee', 
                            description: 'Get invitee details',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    event_uuid: { type: 'string', description: 'Event UUID' },
                                    invitee_uuid: { type: 'string', description: 'Invitee UUID' }
                                },
                                required: ['event_uuid', 'invitee_uuid']
                            }
                        },
                        { 
                            name: 'calendly_list_webhooks', 
                            description: 'List webhooks',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    count: { type: 'number', description: 'Number of results' }
                                },
                                required: []
                            }
                        },
                        { 
                            name: 'calendly_create_webhook', 
                            description: 'Create webhook',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    url: { type: 'string', description: 'Webhook URL' },
                                    events: { type: 'array', items: { type: 'string' }, description: 'Events to subscribe' }
                                },
                                required: ['url', 'events']
                            }
                        },
                        { 
                            name: 'calendly_get_webhook', 
                            description: 'Get webhook details',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    webhook_uuid: { type: 'string', description: 'Webhook UUID' }
                                },
                                required: ['webhook_uuid']
                            }
                        },
                        { 
                            name: 'calendly_delete_webhook', 
                            description: 'Delete webhook',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    webhook_uuid: { type: 'string', description: 'Webhook UUID' }
                                },
                                required: ['webhook_uuid']
                            }
                        }
                    ]
                };
                break;
                
            case 'tools/call':
                if (!params || !params.name) {
                    response.error = {
                        code: -32602,
                        message: 'Invalid params - tool name is required'
                    };
                    break;
                }
                
                let toolResult;
                try {
                    switch (params.name) {
                        case 'calendly_get_current_user':
                            toolResult = await coreTools.getCurrentUser();
                            break;
                        case 'calendly_get_organization':
                            toolResult = await coreTools.getOrganization();
                            break;
                        case 'calendly_list_event_types':
                            toolResult = await coreTools.listEventTypes(params.arguments || {});
                            break;
                        case 'calendly_get_scheduling_links':
                            // Get event types with scheduling links formatted for users
                            const eventTypesResult = await coreTools.listEventTypes(params.arguments || { active_only: true });
                            if (eventTypesResult.success && eventTypesResult.data.event_types) {
                                const schedulingLinks = eventTypesResult.data.event_types.map(et => ({
                                    name: et.name,
                                    duration: `${et.duration} minutes`,
                                    scheduling_url: et.scheduling_url,
                                    description: et.description_plain || 'No description',
                                    active: et.active
                                }));
                                toolResult = {
                                    success: true,
                                    message: 'To schedule a meeting, please share these links with your invitees. They can click on the link and select an available time slot.',
                                    scheduling_links: schedulingLinks,
                                    instructions: [
                                        '1. Choose the appropriate meeting type from the links below',
                                        '2. Share the scheduling_url with the person who wants to book a meeting',
                                        '3. They will open the link in their browser',
                                        '4. They can select an available time slot',
                                        '5. They will enter their name, email, and any other required information',
                                        '6. The meeting will be automatically scheduled in both calendars'
                                    ],
                                    note: 'The Calendly API does not support direct booking. All scheduling must be done through the Calendly web interface using these links.'
                                };
                            } else {
                                toolResult = {
                                    success: false,
                                    error: 'Failed to retrieve event types',
                                    message: 'Could not fetch scheduling links. Please check your Calendly configuration.'
                                };
                            }
                            break;
                        case 'calendly_create_booking_url':
                            // Create a pre-filled booking URL
                            const args = params.arguments || {};
                            const eventName = args.event_type_name;
                            const inviteeName = args.invitee_name || '';
                            const inviteeEmail = args.invitee_email || '';
                            const timezone = args.timezone || 'America/New_York';
                            
                            if (!eventName) {
                                toolResult = {
                                    success: false,
                                    error: 'Missing required parameter',
                                    message: 'event_type_name is required to create a booking URL'
                                };
                                break;
                            }
                            
                            // Get event types to find the matching one
                            const allEventTypes = await coreTools.listEventTypes({ active_only: true });
                            if (allEventTypes.success && allEventTypes.data.event_types) {
                                // Find the matching event type (case insensitive)
                                const matchingEvent = allEventTypes.data.event_types.find(et => 
                                    et.name.toLowerCase().includes(eventName.toLowerCase()) ||
                                    eventName.toLowerCase().includes(et.name.toLowerCase())
                                );
                                
                                if (matchingEvent) {
                                    // Build the booking URL with parameters
                                    let bookingUrl = matchingEvent.scheduling_url;
                                    const urlParams = new URLSearchParams();
                                    
                                    // Add pre-fill parameters if provided
                                    if (inviteeName) urlParams.append('name', inviteeName);
                                    if (inviteeEmail) urlParams.append('email', inviteeEmail);
                                    if (timezone) urlParams.append('timezone', timezone);
                                    
                                    // Add parameters to URL if any
                                    if (urlParams.toString()) {
                                        bookingUrl += (bookingUrl.includes('?') ? '&' : '?') + urlParams.toString();
                                    }
                                    
                                    toolResult = {
                                        success: true,
                                        message: 'Booking URL created successfully',
                                        event_type: {
                                            name: matchingEvent.name,
                                            duration: `${matchingEvent.duration} minutes`,
                                            description: matchingEvent.description_plain || 'No description'
                                        },
                                        booking_url: bookingUrl,
                                        invitee_info: {
                                            name: inviteeName || 'Not specified',
                                            email: inviteeEmail || 'Not specified',
                                            timezone: timezone
                                        },
                                        instructions: [
                                            '1. Share this booking URL with the invitee or open it directly',
                                            '2. The invitee information will be pre-filled if provided',
                                            '3. Select an available time slot from the calendar',
                                            '4. Confirm the booking details',
                                            '5. The meeting will be automatically scheduled'
                                        ],
                                        note: 'This URL will open the Calendly booking page where the actual scheduling happens.'
                                    };
                                } else {
                                    // List available event types if no match found
                                    const availableTypes = allEventTypes.data.event_types.map(et => et.name).join(', ');
                                    toolResult = {
                                        success: false,
                                        error: 'Event type not found',
                                        message: `Could not find event type matching "${eventName}".`,
                                        available_event_types: availableTypes,
                                        suggestion: 'Please use one of the available event types listed above.'
                                    };
                                }
                            } else {
                                toolResult = {
                                    success: false,
                                    error: 'Failed to retrieve event types',
                                    message: 'Could not fetch event types to create booking URL.'
                                };
                            }
                            break;
                        case 'calendly_get_event_type':
                            toolResult = await coreTools.getEventType(params.arguments || {});
                            break;
                        case 'calendly_list_scheduled_events':
                            toolResult = await coreTools.listScheduledEvents(params.arguments || {});
                            break;
                        case 'calendly_get_scheduled_event':
                            toolResult = await coreTools.getScheduledEvent(params.arguments || {});
                            break;
                        case 'calendly_cancel_scheduled_event':
                            toolResult = await coreTools.cancelScheduledEvent(params.arguments || {});
                            break;
                        case 'calendly_get_user_availability':
                            toolResult = await coreTools.getUserAvailability(params.arguments || {});
                            break;
                        case 'calendly_list_event_invitees':
                            toolResult = await inviteeTools.listEventInvitees(params.arguments || {});
                            break;
                        case 'calendly_get_invitee':
                            toolResult = await inviteeTools.getInvitee(params.arguments || {});
                            break;
                        case 'calendly_list_webhooks':
                            toolResult = await webhookTools.listWebhooks(params.arguments || {});
                            break;
                        case 'calendly_create_webhook':
                            toolResult = await webhookTools.createWebhook(params.arguments || {});
                            break;
                        case 'calendly_get_webhook':
                            toolResult = await webhookTools.getWebhook(params.arguments || {});
                            break;
                        case 'calendly_delete_webhook':
                            toolResult = await webhookTools.deleteWebhook(params.arguments || {});
                            break;
                        default:
                            response.error = {
                                code: -32601,
                                message: `Tool not found: ${params.name}`
                            };
                            break;
                    }
                    
                    if (toolResult) {
                        response.result = {
                            content: [{
                                type: 'text',
                                text: JSON.stringify(toolResult, null, 2)
                            }]
                        };
                    }
                } catch (error) {
                    response.error = {
                        code: -32603,
                        message: error.message
                    };
                }
                break;
                
            default:
                response.error = {
                    code: -32601,
                    message: `Method not found: ${method}`
                };
        }
    } catch (error) {
        logger.error('Error processing request:', error);
        response.error = {
            code: -32603,
            message: error.message
        };
    }
    
    logger.info('Response:', JSON.stringify(response).substring(0, 200));
    
    // Send response EXACTLY like debug server
    res.json(response);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'calendly-mcp-server',
        version: '1.3.0'
    });
});

// Start server
async function start() {
    const initialized = await initializeServices();
    if (!initialized) {
        logger.error('Failed to initialize services, starting anyway for n8n compatibility');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
        logger.info(`🚀 Calendly MCP Server (Production) running on port ${PORT}`);
        logger.info(`Endpoint: http://0.0.0.0:${PORT}/mcp`);
    });
}

start().catch(error => {
    logger.error('Failed to start server:', error);
    process.exit(1);
});