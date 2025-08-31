import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { CalendlyConfig, CalendlyUser, CalendlyEventType, CalendlyScheduledEvent, CalendlyInvitee, CalendlyWebhook } from '../types/calendly.js';
import { Logger } from '../utils/logger.js';

export class CalendlyService {
  private client: AxiosInstance;
  private logger: Logger;

  constructor(config: CalendlyConfig) {
    this.logger = Logger.getInstance();
    
    // Validate configuration
    if (!config.accessToken) {
      throw new Error('Calendly configuration incomplete: accessToken is required');
    }

    this.client = axios.create({
      baseURL: 'https://api.calendly.com',
      timeout: config.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MCP-Calendly-Server/1.3.0'
      }
    });

    // Request interceptor for logging
    this.client.interceptors.request.use((config) => {
      this.logger.debug(`Calendly API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data
      });
      return config;
    });

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug(`Calendly API Response: ${response.status}`, {
          data: response.data
        });
        return response;
      },
      (error) => {
        this.logger.error('Calendly API Error', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
        
        // Transform Calendly API errors to standardized format
        const errorMessage = error.response?.data?.message || error.response?.data?.title || error.message || 'Unknown API error';
        const errorCode = error.response?.data?.name || error.response?.status || 'UNKNOWN_ERROR';
        
        throw new Error(`Calendly API Error (${errorCode}): ${errorMessage}`);
      }
    );
  }

  // Generic API methods
  private async get<T = any>(endpoint: string, params?: any): Promise<T> {
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  private async post<T = any>(endpoint: string, data?: any): Promise<T> {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  private async delete<T = any>(endpoint: string, params?: any): Promise<T> {
    const response = await this.client.delete(endpoint, { params });
    return response.data;
  }

  // USER INFORMATION
  async getCurrentUser(): Promise<CalendlyUser> {
    const response = await this.get('/users/me');
    return response.resource;
  }

  async getUserById(userUri: string): Promise<CalendlyUser> {
    const response = await this.get(userUri);
    return response.resource;
  }

  // ORGANIZATION
  async getOrganization(organizationUri: string): Promise<any> {
    const response = await this.get(organizationUri);
    return response.resource;
  }

  // EVENT TYPES
  async getEventTypes(userUri?: string, organizationUri?: string): Promise<CalendlyEventType[]> {
    const params: any = {};
    if (userUri) params.user = userUri;
    if (organizationUri) params.organization = organizationUri;
    
    const response = await this.get('/event_types', params);
    return response.collection;
  }

  async getEventType(eventTypeUri: string): Promise<CalendlyEventType> {
    const response = await this.get(eventTypeUri);
    return response.resource;
  }

  // SCHEDULED EVENTS
  async getScheduledEvents(params: {
    user?: string;
    organization?: string;
    min_start_time?: string;
    max_start_time?: string;
    status?: string;
    sort?: string;
    count?: number;
    page_token?: string;
  } = {}): Promise<{ collection: CalendlyScheduledEvent[], pagination: any }> {
    const response = await this.get('/scheduled_events', params);
    return {
      collection: response.collection,
      pagination: response.pagination
    };
  }

  async getScheduledEvent(eventUri: string): Promise<CalendlyScheduledEvent> {
    const response = await this.get(eventUri);
    return response.resource;
  }

  async cancelScheduledEvent(eventUri: string, reason?: string): Promise<CalendlyScheduledEvent> {
    const data: any = {};
    if (reason) data.reason = reason;
    
    const response = await this.post(`${eventUri}/cancellation`, data);
    return response.resource;
  }

  // EVENT INVITEES
  async getEventInvitees(eventUri: string, params: {
    count?: number;
    email?: string;
    page_token?: string;
    sort?: string;
    status?: string;
  } = {}): Promise<{ collection: CalendlyInvitee[], pagination: any }> {
    const response = await this.get(`${eventUri}/invitees`, params);
    return {
      collection: response.collection,
      pagination: response.pagination
    };
  }

  async getInvitee(inviteeUri: string): Promise<CalendlyInvitee> {
    const response = await this.get(inviteeUri);
    return response.resource;
  }

  // USER AVAILABILITY SCHEDULES  
  async getUserAvailabilitySchedules(userUri: string): Promise<any[]> {
    const response = await this.get(`${userUri}/availability_schedules`);
    return response.collection;
  }

  async getAvailabilitySchedule(scheduleUri: string): Promise<any> {
    const response = await this.get(scheduleUri);
    return response.resource;
  }

  // WEBHOOKS
  async getWebhooks(organizationUri: string, scope?: string): Promise<CalendlyWebhook[]> {
    const params: any = { organization: organizationUri };
    if (scope) params.scope = scope;
    
    const response = await this.get('/webhook_subscriptions', params);
    return response.collection;
  }

  async getWebhook(webhookUri: string): Promise<CalendlyWebhook> {
    const response = await this.get(webhookUri);
    return response.resource;
  }

  async createWebhook(data: {
    url: string;
    events: string[];
    organization: string;
    user?: string;
    scope?: string;
    signing_key?: string;
  }): Promise<CalendlyWebhook> {
    const response = await this.post('/webhook_subscriptions', data);
    return response.resource;
  }

  async deleteWebhook(webhookUri: string): Promise<any> {
    return await this.delete(webhookUri);
  }

  // HEALTH CHECK
  async healthCheck(): Promise<{ status: string, timestamp: string, user?: CalendlyUser }> {
    try {
      const user = await this.getCurrentUser();
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        user: user
      };
    } catch (error) {
      throw new Error(`Calendly API health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}