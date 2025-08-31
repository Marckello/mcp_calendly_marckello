import Joi from 'joi';
import { CalendlyConfig } from '../types/calendly.js';

// Configuration validation schema
export const calendlyConfigSchema = Joi.object({
  accessToken: Joi.string().min(10).required().messages({
    'string.min': 'Access token must be at least 10 characters',
    'any.required': 'Access token is required'
  }),
  timeout: Joi.number().integer().min(1000).max(120000).default(30000)
});

// Event type parameters validation
export const eventTypeParamsSchema = Joi.object({
  event_type_uri: Joi.string().uri().required(),
  user_uri: Joi.string().uri(),
  organization_uri: Joi.string().uri(),
  active_only: Joi.boolean().default(false)
});

// Scheduled event parameters validation  
export const scheduledEventParamsSchema = Joi.object({
  event_uri: Joi.string().uri().required(),
  user_uri: Joi.string().uri(),
  organization_uri: Joi.string().uri(),
  min_start_time: Joi.string().isoDate(),
  max_start_time: Joi.string().isoDate(),
  status: Joi.string().valid('active', 'canceled'),
  count: Joi.number().integer().min(1).max(100).default(20),
  reason: Joi.string().max(500)
});

// Invitee parameters validation
export const inviteeParamsSchema = Joi.object({
  invitee_uri: Joi.string().uri().required(),
  event_uri: Joi.string().uri().required(),
  count: Joi.number().integer().min(1).max(100).default(20),
  email: Joi.string().email(),
  status: Joi.string().valid('active', 'canceled'),
  sort: Joi.string()
});

// Webhook parameters validation
export const webhookParamsSchema = Joi.object({
  webhook_uri: Joi.string().uri(),
  url: Joi.string().uri().required(),
  events: Joi.array().items(Joi.string()).min(1).required(),
  organization_uri: Joi.string().uri(),
  user_uri: Joi.string().uri(),
  scope: Joi.string().valid('user', 'organization').default('organization'),
  signing_key: Joi.string()
});

// List parameters validation schema
export const listParamsSchema = Joi.object({
  count: Joi.number().integer().min(1).max(100).default(20),
  page_token: Joi.string(),
  sort: Joi.string(),
  user_uri: Joi.string().uri(),
  organization_uri: Joi.string().uri(),
  scope: Joi.string().valid('user', 'organization')
});

// Validation utility functions
export class ValidationUtils {
  static validateConfig(config: CalendlyConfig): { error?: string; value?: CalendlyConfig } {
    const { error, value } = calendlyConfigSchema.validate(config);
    if (error) {
      return { error: error.details[0].message };
    }
    return { value };
  }

  static validateRequired(params: any, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!params || params[field] === undefined || params[field] === null || params[field] === '') {
        throw new Error(`Required field '${field}' is missing or empty`);
      }
    }
  }

  static validateEventTypeParams(params: any): { error?: string; value?: any } {
    const { error, value } = eventTypeParamsSchema.validate(params);
    if (error) {
      return { error: error.details[0].message };
    }
    return { value };
  }

  static validateScheduledEventParams(params: any): { error?: string; value?: any } {
    const { error, value } = scheduledEventParamsSchema.validate(params);
    if (error) {
      return { error: error.details[0].message };
    }
    return { value };
  }

  static validateInviteeParams(params: any): { error?: string; value?: any } {
    const { error, value } = inviteeParamsSchema.validate(params);
    if (error) {
      return { error: error.details[0].message };
    }
    return { value };
  }

  static validateWebhookParams(params: any): { error?: string; value?: any } {
    const { error, value } = webhookParamsSchema.validate(params);
    if (error) {
      return { error: error.details[0].message };
    }
    return { value };
  }

  static validateListParams(params: any): { error?: string; value?: any } {
    const { error, value } = listParamsSchema.validate(params);
    if (error) {
      return { error: error.details[0].message };
    }
    return { value };
  }

  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input.trim().replace(/<script[^>]*>.*?<\/script>/gi, '');
    }
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    return input;
  }

  static validateUri(uri: string): boolean {
    try {
      new URL(uri);
      return true;
    } catch {
      return false;
    }
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateDateString(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString === date.toISOString();
  }
}