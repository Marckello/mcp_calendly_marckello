import axios from 'axios';
import { Logger } from '../utils/logger.js';

export class CalendlyOAuthService {
    constructor(config) {
        this.logger = Logger.getInstance();
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
        this.redirectUri = config.redirectUri || 'http://localhost:3000/auth/callback';
        this.webhookSigningKey = config.webhookSigningKey;
        
        // Token storage (in production, use a database)
        this.tokens = {
            access_token: config.accessToken || null,
            refresh_token: config.refreshToken || null,
            expires_at: null
        };
        
        this.apiClient = null;
        this.initializeClient();
    }

    initializeClient() {
        if (this.tokens.access_token) {
            this.apiClient = axios.create({
                baseURL: 'https://api.calendly.com',
                headers: {
                    'Authorization': `Bearer ${this.tokens.access_token}`,
                    'Content-Type': 'application/json'
                }
            });

            // Add request/response interceptors for token refresh
            this.apiClient.interceptors.response.use(
                response => response,
                async error => {
                    if (error.response?.status === 401 && this.tokens.refresh_token) {
                        await this.refreshAccessToken();
                        error.config.headers['Authorization'] = `Bearer ${this.tokens.access_token}`;
                        return this.apiClient.request(error.config);
                    }
                    return Promise.reject(error);
                }
            );
        }
    }

    // Generate OAuth authorization URL
    getAuthorizationUrl(state = '') {
        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'code',
            redirect_uri: this.redirectUri,
            state: state
        });
        
        return `https://auth.calendly.com/oauth/authorize?${params}`;
    }

    // Exchange authorization code for tokens
    async exchangeCodeForTokens(code) {
        try {
            const response = await axios.post('https://auth.calendly.com/oauth/token', {
                grant_type: 'authorization_code',
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code: code,
                redirect_uri: this.redirectUri
            });

            this.tokens = {
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token,
                expires_at: Date.now() + (response.data.expires_in * 1000)
            };

            this.initializeClient();
            this.logger.info('OAuth tokens obtained successfully');
            
            return this.tokens;
        } catch (error) {
            this.logger.error('Failed to exchange code for tokens:', error);
            throw error;
        }
    }

    // Refresh access token
    async refreshAccessToken() {
        if (!this.tokens.refresh_token) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await axios.post('https://auth.calendly.com/oauth/token', {
                grant_type: 'refresh_token',
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: this.tokens.refresh_token
            });

            this.tokens.access_token = response.data.access_token;
            this.tokens.expires_at = Date.now() + (response.data.expires_in * 1000);
            
            if (response.data.refresh_token) {
                this.tokens.refresh_token = response.data.refresh_token;
            }

            this.initializeClient();
            this.logger.info('Access token refreshed successfully');
            
            return this.tokens;
        } catch (error) {
            this.logger.error('Failed to refresh access token:', error);
            throw error;
        }
    }

    // Get available time slots for an event type
    async getAvailableTimes(eventTypeUri, startTime, endTime, timezone = 'UTC') {
        if (!this.apiClient) {
            throw new Error('Not authenticated. Please complete OAuth flow first.');
        }

        try {
            const response = await this.apiClient.get('/event_type_available_times', {
                params: {
                    event_type: eventTypeUri,
                    start_time: startTime,
                    end_time: endTime,
                    timezone: timezone
                }
            });

            return response.data.collection;
        } catch (error) {
            this.logger.error('Failed to get available times:', error);
            throw error;
        }
    }

    // Create a scheduling link (one-time use)
    async createSchedulingLink(params) {
        if (!this.apiClient) {
            throw new Error('Not authenticated. Please complete OAuth flow first.');
        }

        try {
            const response = await this.apiClient.post('/scheduling_links', {
                max_event_count: params.max_event_count || 1,
                owner: params.owner_uri,
                owner_type: 'EventType'
            });

            return response.data.resource;
        } catch (error) {
            this.logger.error('Failed to create scheduling link:', error);
            throw error;
        }
    }

    // Book a meeting directly (requires invitee scheduling permission)
    async bookMeetingDirect(params) {
        if (!this.apiClient) {
            throw new Error('Not authenticated. Please complete OAuth flow first.');
        }

        try {
            // First, create a one-time scheduling link
            const schedulingLink = await this.createSchedulingLink({
                owner_uri: params.event_type_uri,
                max_event_count: 1
            });

            // Then use the invitee scheduling endpoint
            const bookingData = {
                event: {
                    start_time: params.start_time,
                    guest_emails: params.guest_emails || [],
                    location: params.location
                },
                invitee: {
                    email: params.invitee_email,
                    name: params.invitee_name,
                    timezone: params.timezone || 'UTC',
                    // Answer any required questions
                    questions_and_answers: params.questions || []
                },
                scheduling_link: schedulingLink.booking_url
            };

            const response = await this.apiClient.post('/scheduled_events', bookingData);
            
            return {
                success: true,
                booking: response.data.resource,
                confirmation_url: response.data.resource.uri,
                calendar_event: {
                    title: response.data.resource.name,
                    start_time: response.data.resource.start_time,
                    end_time: response.data.resource.end_time,
                    location: response.data.resource.location
                }
            };
        } catch (error) {
            this.logger.error('Failed to book meeting directly:', error);
            
            // Fallback to scheduling link if direct booking fails
            if (error.response?.status === 403) {
                this.logger.info('Direct booking not available, creating scheduling link instead');
                
                const schedulingLink = await this.createSchedulingLink({
                    owner_uri: params.event_type_uri,
                    max_event_count: 1
                });

                // Build URL with pre-filled parameters
                const url = new URL(schedulingLink.booking_url);
                url.searchParams.append('name', params.invitee_name);
                url.searchParams.append('email', params.invitee_email);
                url.searchParams.append('a1', params.start_time); // Preferred time
                if (params.timezone) {
                    url.searchParams.append('timezone', params.timezone);
                }

                return {
                    success: false,
                    reason: 'Direct booking requires additional permissions. Use the scheduling link instead.',
                    scheduling_link: url.toString(),
                    instructions: [
                        'Direct API booking requires special Calendly permissions.',
                        'Please use the provided scheduling link to complete the booking.',
                        'The link has been pre-filled with the invitee information.'
                    ]
                };
            }
            
            throw error;
        }
    }

    // Check if tokens are valid
    isAuthenticated() {
        return !!(this.tokens.access_token && 
                 (!this.tokens.expires_at || this.tokens.expires_at > Date.now()));
    }

    // Get current tokens (for storage)
    getTokens() {
        return this.tokens;
    }

    // Set tokens (for restoration from storage)
    setTokens(tokens) {
        this.tokens = tokens;
        this.initializeClient();
    }
}