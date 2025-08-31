import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CalendlyService } from './dist/services/calendly.js';
import { CalendlyOAuthService } from './src/services/calendly-oauth.js';
import { CalendlyCoreTools } from './dist/tools/calendly-core.js';
import { CalendlyInviteeTools } from './dist/tools/calendly-invitees.js';
import { CalendlyWebhookTools } from './dist/tools/calendly-webhooks.js';
import { Logger } from './dist/utils/logger.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const logger = Logger.getInstance();

// Services
let calendly;
let calendlyOAuth;
let coreTools;
let inviteeTools;
let webhookTools;

// Token storage file (in production, use a database)
const TOKEN_FILE = path.join(__dirname, '.oauth-tokens.json');

// Load stored tokens if they exist
function loadStoredTokens() {
    try {
        if (fs.existsSync(TOKEN_FILE)) {
            const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
            logger.info('Loaded stored OAuth tokens');
            return tokens;
        }
    } catch (error) {
        logger.error('Failed to load stored tokens:', error);
    }
    return null;
}

// Save tokens to file
function saveTokens(tokens) {
    try {
        fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
        logger.info('OAuth tokens saved');
    } catch (error) {
        logger.error('Failed to save tokens:', error);
    }
}

// Initialize services
async function initializeServices() {
    try {
        // Initialize regular Calendly service with Personal Access Token
        const config = {
            accessToken: process.env.CALENDLY_ACCESS_TOKEN,
            timeout: 30000
        };
        
        calendly = new CalendlyService(config);
        await calendly.healthCheck();
        
        // Initialize OAuth service
        const storedTokens = loadStoredTokens();
        calendlyOAuth = new CalendlyOAuthService({
            clientId: process.env.CALENDLY_CLIENT_ID || 'mxNQwn2b0Jk-_1Ndq4iol_zwuamdnkaIRc8tY09-a10',
            clientSecret: process.env.CALENDLY_CLIENT_SECRET,
            redirectUri: process.env.CALENDLY_REDIRECT_URI || `http://localhost:${PORT}/auth/callback`,
            webhookSigningKey: process.env.CALENDLY_WEBHOOK_SIGNING_KEY,
            accessToken: storedTokens?.access_token,
            refreshToken: storedTokens?.refresh_token
        });

        if (storedTokens) {
            calendlyOAuth.setTokens(storedTokens);
        }
        
        coreTools = new CalendlyCoreTools(calendly);
        inviteeTools = new CalendlyInviteeTools(calendly);
        webhookTools = new CalendlyWebhookTools(calendly);
        
        logger.info('All services initialized successfully');
        logger.info(`OAuth authenticated: ${calendlyOAuth.isAuthenticated()}`);
        return true;
    } catch (error) {
        logger.error('Failed to initialize services:', error);
        return false;
    }
}

// Enable CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// OAuth Routes
app.get('/auth', (req, res) => {
    const authUrl = calendlyOAuth.getAuthorizationUrl(req.query.state || 'mcp-server');
    res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
    const { code, state } = req.query;
    
    if (!code) {
        return res.status(400).json({ error: 'Authorization code not provided' });
    }

    try {
        const tokens = await calendlyOAuth.exchangeCodeForTokens(code);
        saveTokens(tokens);
        
        res.send(`
            <html>
                <body>
                    <h2>✅ OAuth Authentication Successful!</h2>
                    <p>You can now use direct booking features.</p>
                    <p>Close this window and return to your application.</p>
                    <script>
                        setTimeout(() => window.close(), 3000);
                    </script>
                </body>
            </html>
        `);
    } catch (error) {
        logger.error('OAuth callback error:', error);
        res.status(500).json({ error: 'Failed to complete OAuth flow' });
    }
});

// OAuth status endpoint
app.get('/auth/status', (req, res) => {
    res.json({
        authenticated: calendlyOAuth.isAuthenticated(),
        has_tokens: !!calendlyOAuth.getTokens().access_token,
        auth_url: calendlyOAuth.isAuthenticated() ? null : `/auth`
    });
});

// Main MCP endpoint with OAuth tools
app.post('/mcp', async (req, res) => {
    const { method, params, id, jsonrpc } = req.body;
    
    logger.info(`MCP Method: ${method}`);
    
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
                        name: 'calendly-mcp-server-oauth',
                        version: '2.0.0'
                    }
                };
                break;
                
            case 'tools/list':
                response.result = {
                    tools: [
                        // All existing tools...
                        { 
                            name: 'calendly_get_current_user', 
                            description: 'Get current user information',
                            inputSchema: {
                                type: 'object',
                                properties: {},
                                required: []
                            }
                        },
                        // ... (include all existing tools from server.js)
                        
                        // New OAuth-based tools
                        { 
                            name: 'calendly_oauth_status', 
                            description: 'Check OAuth authentication status',
                            inputSchema: {
                                type: 'object',
                                properties: {},
                                required: []
                            }
                        },
                        { 
                            name: 'calendly_get_available_times', 
                            description: 'Get available time slots for direct booking (requires OAuth)',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    event_type_name: { type: 'string', description: 'Name of the event type' },
                                    start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
                                    end_date: { type: 'string', description: 'End date (YYYY-MM-DD)' },
                                    timezone: { type: 'string', description: 'Timezone (e.g., America/New_York)', default: 'America/New_York' }
                                },
                                required: ['event_type_name', 'start_date', 'end_date']
                            }
                        },
                        { 
                            name: 'calendly_book_meeting_direct', 
                            description: 'Book a meeting directly without redirecting to Calendly (requires OAuth)',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    event_type_name: { type: 'string', description: 'Name of the event type' },
                                    start_time: { type: 'string', description: 'Meeting start time (ISO 8601 format)' },
                                    invitee_name: { type: 'string', description: 'Name of the invitee' },
                                    invitee_email: { type: 'string', description: 'Email of the invitee' },
                                    timezone: { type: 'string', description: 'Timezone', default: 'America/New_York' },
                                    notes: { type: 'string', description: 'Additional notes or questions' }
                                },
                                required: ['event_type_name', 'start_time', 'invitee_name', 'invitee_email']
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
                        // Existing tools cases...
                        case 'calendly_get_current_user':
                            toolResult = await coreTools.getCurrentUser();
                            break;
                            
                        // OAuth tools
                        case 'calendly_oauth_status':
                            toolResult = {
                                authenticated: calendlyOAuth.isAuthenticated(),
                                message: calendlyOAuth.isAuthenticated() 
                                    ? 'OAuth is configured and ready for direct booking'
                                    : 'OAuth not configured. Visit /auth to authenticate',
                                auth_url: calendlyOAuth.isAuthenticated() 
                                    ? null 
                                    : `http://localhost:${PORT}/auth`
                            };
                            break;
                            
                        case 'calendly_get_available_times':
                            if (!calendlyOAuth.isAuthenticated()) {
                                toolResult = {
                                    success: false,
                                    error: 'OAuth authentication required',
                                    message: 'Please authenticate first by visiting /auth',
                                    auth_url: `http://localhost:${PORT}/auth`
                                };
                                break;
                            }
                            
                            const timeArgs = params.arguments || {};
                            // Get event type first
                            const eventTypes = await coreTools.listEventTypes({ active_only: true });
                            const matchingEventType = eventTypes.data.event_types.find(et =>
                                et.name.toLowerCase().includes(timeArgs.event_type_name.toLowerCase())
                            );
                            
                            if (matchingEventType) {
                                const startTime = new Date(timeArgs.start_date).toISOString();
                                const endTime = new Date(timeArgs.end_date + 'T23:59:59').toISOString();
                                
                                const availableTimes = await calendlyOAuth.getAvailableTimes(
                                    matchingEventType.uri,
                                    startTime,
                                    endTime,
                                    timeArgs.timezone || 'America/New_York'
                                );
                                
                                toolResult = {
                                    success: true,
                                    event_type: matchingEventType.name,
                                    timezone: timeArgs.timezone || 'America/New_York',
                                    available_slots: availableTimes.map(slot => ({
                                        start_time: slot.start_time,
                                        end_time: slot.end_time,
                                        status: slot.status
                                    })),
                                    total_slots: availableTimes.length
                                };
                            } else {
                                toolResult = {
                                    success: false,
                                    error: 'Event type not found',
                                    message: `Could not find event type: ${timeArgs.event_type_name}`
                                };
                            }
                            break;
                            
                        case 'calendly_book_meeting_direct':
                            if (!calendlyOAuth.isAuthenticated()) {
                                toolResult = {
                                    success: false,
                                    error: 'OAuth authentication required',
                                    message: 'Please authenticate first by visiting /auth',
                                    auth_url: `http://localhost:${PORT}/auth`
                                };
                                break;
                            }
                            
                            const bookingArgs = params.arguments || {};
                            // Get event type first
                            const allEventTypes = await coreTools.listEventTypes({ active_only: true });
                            const targetEventType = allEventTypes.data.event_types.find(et =>
                                et.name.toLowerCase().includes(bookingArgs.event_type_name.toLowerCase())
                            );
                            
                            if (targetEventType) {
                                const bookingParams = {
                                    event_type_uri: targetEventType.uri,
                                    start_time: bookingArgs.start_time,
                                    invitee_name: bookingArgs.invitee_name,
                                    invitee_email: bookingArgs.invitee_email,
                                    timezone: bookingArgs.timezone || 'America/New_York',
                                    questions: bookingArgs.notes ? [{
                                        answer: bookingArgs.notes,
                                        position: 0
                                    }] : []
                                };
                                
                                toolResult = await calendlyOAuth.bookMeetingDirect(bookingParams);
                            } else {
                                toolResult = {
                                    success: false,
                                    error: 'Event type not found',
                                    message: `Could not find event type: ${bookingArgs.event_type_name}`
                                };
                            }
                            break;
                            
                        default:
                            // Handle all other existing tools...
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
    res.json(response);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'calendly-mcp-server-oauth',
        version: '2.0.0',
        oauth_authenticated: calendlyOAuth?.isAuthenticated() || false
    });
});

// Start server
async function start() {
    const initialized = await initializeServices();
    if (!initialized) {
        logger.error('Failed to initialize services, starting anyway');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
        logger.info(`🚀 Calendly MCP Server with OAuth running on port ${PORT}`);
        logger.info(`Endpoint: http://0.0.0.0:${PORT}/mcp`);
        logger.info(`OAuth Status: http://0.0.0.0:${PORT}/auth/status`);
        if (!calendlyOAuth?.isAuthenticated()) {
            logger.info(`⚠️  OAuth not configured. Visit http://localhost:${PORT}/auth to authenticate`);
        }
    });
}

start().catch(error => {
    logger.error('Failed to start server:', error);
    process.exit(1);
});