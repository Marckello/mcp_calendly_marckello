import { CalendlyService } from '../services/calendly.js';
import { Logger } from '../utils/logger.js';
import { ValidationUtils } from '../utils/validation.js';

export class CalendlyWebhookTools {
  private calendly: CalendlyService;
  private logger: Logger;

  constructor(calendly: CalendlyService) {
    this.calendly = calendly;
    this.logger = Logger.getInstance();
  }

  // TOOL: List Webhooks
  async listWebhooks(params: {
    organization_uri?: string;
    organization?: string; // Support both parameter names
    scope?: 'user' | 'organization';
  } = {}): Promise<any> {
    try {
      this.logger.info('Fetching webhooks', { params });
      
      // Support both parameter names for organization
      let organizationUri = params.organization_uri || params.organization;
      
      // If no organization URI provided, get current user's organization
      if (!organizationUri) {
        try {
          const user = await this.calendly.getCurrentUser();
          organizationUri = user.current_organization;
          this.logger.info('Auto-detected organization from current user', { organizationUri });
        } catch (userError) {
          this.logger.error('Failed to get current user for organization detection:', userError);
          throw new Error('organization_uri parameter is required when user detection fails');
        }
      }

      if (!organizationUri) {
        throw new Error('organization_uri parameter is required');
      }

      this.logger.info('Fetching webhooks from Calendly API', { organizationUri, scope: params.scope });
      const webhooks = await this.calendly.getWebhooks();
      
      const activeWebhooks = webhooks.filter(w => w.state === 'active');
      const disabledWebhooks = webhooks.filter(w => w.state === 'disabled');

      return {
        success: true,
        data: {
          webhooks: webhooks,
          count: webhooks.length,
          summary: `Found ${webhooks.length} webhook subscriptions`,
          breakdown: {
            active: activeWebhooks.length,
            disabled: disabledWebhooks.length
          },
          organization_uri: organizationUri
        }
      };
    } catch (error) {
      this.logger.error('Error fetching webhooks:', error);
      
      // Return a more detailed error response
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'WEBHOOK_LIST_ERROR',
          details: error
        }
      };
    }
  }

  // TOOL: Get Webhook Details
  async getWebhook(params: { webhook_uri?: string }): Promise<any> {
    try {
      if (!params.webhook_uri) {
        throw new Error('webhook_uri parameter is required');
      }
      
      this.logger.info('Fetching webhook details', { webhook_uri: params.webhook_uri });
      
      const webhook = await this.calendly.getWebhook(params.webhook_uri);
      
      return {
        success: true,
        data: {
          webhook: webhook,
          summary: `Webhook: ${webhook.callback_url} (${webhook.state})`,
          details: {
            callback_url: webhook.callback_url,
            state: webhook.state,
            events: webhook.events,
            scope: webhook.scope,
            organization: webhook.organization,
            user: webhook.user,
            created_at: webhook.created_at
          }
        }
      };
    } catch (error) {
      this.logger.error('Error fetching webhook:', error);
      throw error;
    }
  }

  // TOOL: Create Webhook
  async createWebhook(params: {
    url?: string;
    events?: string[];
    organization_uri?: string;
    user_uri?: string;
    scope?: 'user' | 'organization';
    signing_key?: string;
  }): Promise<any> {
    try {
      if (!params.url || !params.events) {
        throw new Error('url and events parameters are required');
      }
      
      this.logger.info('Creating webhook', { 
        url: params.url,
        events: params.events,
        scope: params.scope
      });
      
      // If no organization URI provided, get current user's organization
      let organizationUri = params.organization_uri;
      if (!organizationUri) {
        const user = await this.calendly.getCurrentUser();
        organizationUri = user.current_organization;
      }

      const webhookData = {
        url: params.url,
        events: params.events,
        organization: organizationUri,
        user: params.user_uri,
        scope: params.scope || 'organization',
        signing_key: params.signing_key
      };

      const webhook = await this.calendly.createWebhook(webhookData);
      
      return {
        success: true,
        data: {
          webhook: webhook,
          summary: `Successfully created webhook: ${webhook.callback_url}`,
          details: {
            uri: webhook.uri,
            callback_url: webhook.callback_url,
            state: webhook.state,
            events: webhook.events,
            scope: webhook.scope
          }
        }
      };
    } catch (error) {
      this.logger.error('Error creating webhook:', error);
      throw error;
    }
  }

  // TOOL: Delete Webhook
  async deleteWebhook(params: { webhook_uri?: string }): Promise<any> {
    try {
      if (!params.webhook_uri) {
        throw new Error('webhook_uri parameter is required');
      }
      
      this.logger.info('Deleting webhook', { webhook_uri: params.webhook_uri });
      
      // Get webhook details before deletion for response
      const webhook = await this.calendly.getWebhook(params.webhook_uri);
      
      await this.calendly.deleteWebhook(params.webhook_uri);
      
      return {
        success: true,
        data: {
          deleted_webhook: webhook,
          summary: `Successfully deleted webhook: ${webhook.callback_url}`,
          details: {
            uri: webhook.uri,
            callback_url: webhook.callback_url,
            events: webhook.events,
            scope: webhook.scope
          }
        }
      };
    } catch (error) {
      this.logger.error('Error deleting webhook:', error);
      throw error;
    }
  }
}