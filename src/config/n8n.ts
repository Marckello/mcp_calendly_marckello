import axios from 'axios';
import { Logger } from '../utils/logger.js';
import { N8nWebhookConfig, N8nCompatibleResponse } from '../types/mcp.js';

export class N8nIntegration {
  private logger: Logger;
  private config: N8nWebhookConfig;

  constructor() {
    this.logger = Logger.getInstance();
    this.config = {
      enabled: process.env.N8N_ENABLED === 'true',
      url: process.env.N8N_WEBHOOK_URL || undefined,
      secret: process.env.N8N_WEBHOOK_SECRET || undefined,
      events: (process.env.N8N_EVENTS || 'all').split(',').map(e => e.trim())
    };

    if (this.config.enabled && !this.config.url) {
      this.logger.warn('N8n integration enabled but no webhook URL configured');
      this.config.enabled = false;
    }

    if (this.config.enabled) {
      this.logger.info('N8n integration initialized', { 
        url: this.config.url,
        events: this.config.events 
      });
    }
  }

  /**
   * Send event to n8n webhook
   */
  async sendEvent(event: string, data: any): Promise<boolean> {
    if (!this.config.enabled || !this.config.url) {
      return false;
    }

    // Check if this event should be sent
    if (this.config.events && !this.config.events.includes('all') && !this.config.events.includes(event)) {
      return false;
    }

    try {
      const payload = this.formatForN8n(event, data);
      
      const headers: any = {
        'Content-Type': 'application/json',
        'User-Agent': 'MCP-WooCommerce-Server/1.0.0'
      };

      // Add secret header if configured
      if (this.config.secret) {
        headers['X-N8N-Webhook-Secret'] = this.config.secret;
      }

      await axios.post(this.config.url, payload, {
        headers,
        timeout: 10000
      });

      this.logger.debug(`N8n event sent successfully: ${event}`, { event, dataSize: JSON.stringify(data).length });
      return true;

    } catch (error) {
      this.logger.error(`Failed to send n8n event: ${event}`, { 
        error: error instanceof Error ? error.message : error,
        url: this.config.url 
      });
      return false;
    }
  }

  /**
   * Format data for n8n compatibility
   */
  private formatForN8n(event: string, data: any): N8nCompatibleResponse {
    return {
      json: {
        event,
        timestamp: new Date().toISOString(),
        source: 'mcp-woocommerce-server',
        data: this.sanitizeForN8n(data)
      },
      pairedItem: {
        item: 0
      }
    };
  }

  /**
   * Sanitize data for n8n (remove sensitive fields, normalize structure)
   */
  private sanitizeForN8n(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeForN8n(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Skip sensitive fields
        if (this.isSensitiveField(key)) {
          continue;
        }

        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeForN8n(value);
      }

      return sanitized;
    }

    return data;
  }

  /**
   * Check if field should be excluded from n8n payload
   */
  private isSensitiveField(key: string): boolean {
    const sensitiveFields = [
      'password',
      'secret',
      'key',
      'token',
      'auth',
      'credit_card',
      'payment_details',
      'billing_phone',
      'customer_ip_address'
    ];

    return sensitiveFields.some(field => 
      key.toLowerCase().includes(field.toLowerCase())
    );
  }

  /**
   * Create n8n-compatible tool responses
   */
  static formatToolResponse(toolName: string, success: boolean, data: any, error?: string): N8nCompatibleResponse {
    return {
      json: {
        tool: toolName,
        success,
        timestamp: new Date().toISOString(),
        data: success ? data : null,
        error: error || null,
        execution_time: Date.now()
      },
      pairedItem: {
        item: 0
      }
    };
  }

  /**
   * Generate n8n workflow template for WooCommerce integration
   */
  static generateN8nWorkflowTemplate(): any {
    return {
      name: 'WooCommerce MCP Integration',
      nodes: [
        {
          parameters: {},
          type: 'n8n-nodes-base.start',
          typeVersion: 1,
          position: [240, 300],
          id: 'start-node'
        },
        {
          parameters: {
            httpMethod: 'POST',
            path: 'woocommerce-webhook',
            responseMode: 'responseNode',
            options: {}
          },
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [460, 300],
          id: 'webhook-node',
          webhookId: 'woocommerce-mcp-webhook'
        },
        {
          parameters: {
            url: 'http://mcp-woocommerce-server:3000/webhook/n8n',
            sendHeaders: true,
            headerParameters: {
              parameters: [
                {
                  name: 'Content-Type',
                  value: 'application/json'
                }
              ]
            },
            sendBody: true,
            bodyParameters: {
              parameters: [
                {
                  name: 'event',
                  value: '={{ $json.event }}'
                },
                {
                  name: 'data',
                  value: '={{ $json.data }}'
                },
                {
                  name: 'timestamp',
                  value: '={{ $json.timestamp }}'
                }
              ]
            },
            options: {}
          },
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.1,
          position: [680, 300],
          id: 'mcp-request-node'
        },
        {
          parameters: {
            respondWith: 'json',
            responseBody: '={{ { "success": true, "message": "Event processed", "timestamp": $now } }}'
          },
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [900, 300],
          id: 'response-node'
        }
      ],
      connections: {
        'Webhook': {
          main: [
            [
              {
                node: 'HTTP Request',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'HTTP Request': {
          main: [
            [
              {
                node: 'Respond to Webhook',
                type: 'main',
                index: 0
              }
            ]
          ]
        }
      },
      settings: {
        executionOrder: 'v1'
      }
    };
  }

  /**
   * Test n8n connectivity
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config.enabled || !this.config.url) {
      return {
        success: false,
        message: 'N8n integration not configured'
      };
    }

    try {
      const testPayload = {
        json: {
          event: 'test_connection',
          timestamp: new Date().toISOString(),
          source: 'mcp-woocommerce-server',
          data: { message: 'Test connection from MCP server' }
        }
      };

      const headers: any = {
        'Content-Type': 'application/json',
        'User-Agent': 'MCP-WooCommerce-Server/1.0.0'
      };

      if (this.config.secret) {
        headers['X-N8N-Webhook-Secret'] = this.config.secret;
      }

      await axios.post(this.config.url, testPayload, {
        headers,
        timeout: 5000
      });

      return {
        success: true,
        message: 'N8n connection test successful'
      };

    } catch (error) {
      return {
        success: false,
        message: `N8n connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get n8n integration status
   */
  getStatus(): {
    enabled: boolean;
    configured: boolean;
    url?: string | undefined;
    events: string[];
  } {
    return {
      enabled: this.config.enabled,
      configured: !!(this.config.url && this.config.enabled),
      url: this.config.url ? this.config.url.replace(/\/[^\/]*$/, '/***') : undefined,
      events: this.config.events || []
    };
  }
}