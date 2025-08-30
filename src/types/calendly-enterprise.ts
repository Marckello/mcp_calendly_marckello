import { z } from 'zod'
import Joi from 'joi'

// ===== CALENDLY ENTERPRISE TYPES WITH JOI VALIDATION =====

// Base Calendly Entity
export const CalendlyBaseSchema = z.object({
  uri: z.string().url(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

// Enhanced User Schema with Enterprise Fields
export const CalendlyUserSchema = CalendlyBaseSchema.extend({
  name: z.string(),
  slug: z.string(),
  email: z.string().email(),
  scheduling_url: z.string().url(),
  timezone: z.string(),
  avatar_url: z.string().url().optional(),
  resource_type: z.literal('User'),
  current_organization: z.string().url().optional(),
  locale: z.string().optional(),
  
  // Enterprise fields
  enterprise_metadata: z.object({
    department: z.string().optional(),
    role: z.string().optional(),
    manager_email: z.string().email().optional(),
    cost_center: z.string().optional(),
    permissions: z.array(z.string()).optional()
  }).optional()
})

// Enhanced Event Schema with Streaming Support
export const CalendlyEventSchema = CalendlyBaseSchema.extend({
  name: z.string(),
  status: z.enum(['active', 'canceled']),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  event_type: z.string().url(),
  location: z.object({
    type: z.string(),
    location: z.string().optional(),
    join_url: z.string().url().optional(),
    status: z.string().optional(),
    data: z.record(z.any()).optional()
  }).optional(),
  invitees_counter: z.object({
    total: z.number(),
    active: z.number(),
    limit: z.number()
  }),
  event_memberships: z.array(z.object({
    user: z.string().url(),
    user_email: z.string().email().optional(),
    user_name: z.string().optional(),
    role: z.enum(['host', 'co-host']).optional()
  })),
  event_guests: z.array(z.object({
    email: z.string().email(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime()
  })).optional(),
  calendar_event: z.object({
    kind: z.string(),
    external_id: z.string()
  }).optional(),
  
  // Enterprise streaming fields
  streaming_metadata: z.object({
    real_time_updates: z.boolean().default(false),
    webhook_events: z.array(z.string()).optional(),
    sync_status: z.enum(['pending', 'synced', 'error']).optional(),
    last_sync: z.string().datetime().optional()
  }).optional()
})

// Enterprise Event Type with Advanced Features
export const CalendlyEventTypeSchema = CalendlyBaseSchema.extend({
  name: z.string(),
  active: z.boolean(),
  slug: z.string(),
  scheduling_url: z.string().url(),
  duration: z.number().positive(),
  kind: z.enum(['solo', 'group']),
  pooling_type: z.enum(['round_robin', 'collective']).optional(),
  type: z.enum(['StandardEventType', 'GroupEventType']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  internal_note: z.string().optional(),
  description_plain: z.string().optional(),
  description_html: z.string().optional(),
  profile: z.object({
    type: z.string(),
    name: z.string(),
    owner: z.string().url()
  }),
  secret: z.boolean().optional(),
  booking_method: z.enum(['instant', 'confirmation']).optional(),
  
  // Enterprise features
  enterprise_config: z.object({
    approval_required: z.boolean().default(false),
    max_bookings_per_day: z.number().optional(),
    allowed_domains: z.array(z.string()).optional(),
    custom_fields: z.array(z.object({
      name: z.string(),
      type: z.enum(['text', 'number', 'select', 'multi_select']),
      required: z.boolean(),
      options: z.array(z.string()).optional()
    })).optional(),
    integrations: z.object({
      zoom: z.boolean().default(false),
      teams: z.boolean().default(false),
      google_meet: z.boolean().default(false)
    }).optional()
  }).optional()
})

// Advanced Invitee with Enterprise Tracking
export const CalendlyInviteeSchema = CalendlyBaseSchema.extend({
  name: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email(),
  text_reminder_number: z.string().optional(),
  timezone: z.string(),
  utm_campaign: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
  questions_and_answers: z.array(z.object({
    question: z.string(),
    answer: z.string(),
    position: z.number().optional()
  })).optional(),
  tracking: z.object({
    utm_campaign: z.string().optional(),
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_content: z.string().optional(),
    utm_term: z.string().optional(),
    salesforce_uuid: z.string().optional(),
    
    // Enterprise tracking
    lead_score: z.number().optional(),
    company: z.string().optional(),
    industry: z.string().optional(),
    revenue_potential: z.enum(['low', 'medium', 'high']).optional()
  }).optional(),
  status: z.enum(['active', 'canceled']),
  cancel_url: z.string().url().optional(),
  reschedule_url: z.string().url().optional(),
  
  // Enterprise invitee features
  enterprise_data: z.object({
    approval_status: z.enum(['pending', 'approved', 'rejected']).optional(),
    approved_by: z.string().email().optional(),
    approval_notes: z.string().optional(),
    crm_sync: z.boolean().default(false),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal')
  }).optional()
})

// ===== JOI VALIDATION SCHEMAS =====

// OAuth 1.0a Configuration Validation (WooCommerce style)
export const OAuthConfigJoiSchema = Joi.object({
  consumer_key: Joi.string().required().min(10).max(100),
  consumer_secret: Joi.string().required().min(10).max(100),
  callback_url: Joi.string().uri().required(),
  signature_method: Joi.string().valid('HMAC-SHA1', 'HMAC-SHA256').default('HMAC-SHA1'),
  version: Joi.string().valid('1.0').default('1.0'),
  realm: Joi.string().optional()
}).required()

// Request Parameter Validation
export const CalendlyApiParamsJoiSchema = Joi.object({
  // Common parameters
  count: Joi.number().integer().min(1).max(100).default(20),
  page_token: Joi.string().optional(),
  sort: Joi.string().valid(
    'start_time:asc', 'start_time:desc',
    'created_at:asc', 'created_at:desc',
    'name:asc', 'name:desc'
  ).optional(),
  
  // Date range validation
  min_start_time: Joi.date().iso().optional(),
  max_start_time: Joi.date().iso().when('min_start_time', {
    is: Joi.exist(),
    then: Joi.date().greater(Joi.ref('min_start_time')),
    otherwise: Joi.date().iso()
  }).optional(),
  
  // Email validation
  invitee_email: Joi.string().email().optional(),
  user_email: Joi.string().email().optional(),
  
  // URI validation
  user: Joi.string().uri().optional(),
  organization: Joi.string().uri().optional(),
  event_uuid: Joi.string().uuid().optional(),
  
  // Status filtering
  status: Joi.string().valid('active', 'canceled').optional(),
  active: Joi.boolean().optional(),
  
  // Enterprise parameters
  department: Joi.string().optional(),
  cost_center: Joi.string().optional(),
  approval_required: Joi.boolean().optional()
})

// Webhook Configuration Validation
export const WebhookConfigJoiSchema = Joi.object({
  url: Joi.string().uri().required(),
  events: Joi.array().items(
    Joi.string().valid(
      'invitee.created',
      'invitee.canceled',
      'invitee.rescheduled',
      'event.created',
      'event.canceled'
    )
  ).min(1).required(),
  organization: Joi.string().uri().optional(),
  user: Joi.string().uri().optional(),
  scope: Joi.string().valid('user', 'organization').default('user'),
  
  // Enterprise webhook features
  signing_key: Joi.string().min(32).optional(),
  retry_config: Joi.object({
    max_retries: Joi.number().integer().min(0).max(10).default(3),
    retry_delay_ms: Joi.number().integer().min(1000).max(300000).default(5000),
    exponential_backoff: Joi.boolean().default(true)
  }).optional(),
  filtering: Joi.object({
    event_types: Joi.array().items(Joi.string().uri()).optional(),
    user_domains: Joi.array().items(Joi.string().hostname()).optional()
  }).optional()
})

// Security & Rate Limiting Validation
export const SecurityConfigJoiSchema = Joi.object({
  rate_limiting: Joi.object({
    requests_per_minute: Joi.number().integer().min(1).max(1000).default(60),
    burst_limit: Joi.number().integer().min(1).max(100).default(10),
    window_ms: Joi.number().integer().min(1000).max(3600000).default(60000)
  }).required(),
  
  cors: Joi.object({
    origins: Joi.array().items(Joi.string().uri()).required(),
    methods: Joi.array().items(
      Joi.string().valid('GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH')
    ).default(['GET', 'POST']),
    allowed_headers: Joi.array().items(Joi.string()).optional(),
    credentials: Joi.boolean().default(false)
  }).required(),
  
  encryption: Joi.object({
    algorithm: Joi.string().valid('aes-256-gcm', 'aes-256-cbc').default('aes-256-gcm'),
    key_rotation_days: Joi.number().integer().min(1).max(365).default(90),
    token_expiry_hours: Joi.number().integer().min(1).max(8760).default(24)
  }).required(),
  
  audit: Joi.object({
    log_all_requests: Joi.boolean().default(true),
    log_sensitive_data: Joi.boolean().default(false),
    retention_days: Joi.number().integer().min(1).max(2555).default(90) // 7 years max
  }).required()
})

// ===== TYPE EXPORTS =====

export type CalendlyUser = z.infer<typeof CalendlyUserSchema>
export type CalendlyEvent = z.infer<typeof CalendlyEventSchema>
export type CalendlyEventType = z.infer<typeof CalendlyEventTypeSchema>
export type CalendlyInvitee = z.infer<typeof CalendlyInviteeSchema>

// Joi validation types
export type OAuthConfig = {
  consumer_key: string
  consumer_secret: string
  callback_url: string
  signature_method?: 'HMAC-SHA1' | 'HMAC-SHA256'
  version?: '1.0'
  realm?: string
}

export type CalendlyApiParams = {
  count?: number
  page_token?: string
  sort?: string
  min_start_time?: Date
  max_start_time?: Date
  invitee_email?: string
  user_email?: string
  user?: string
  organization?: string
  event_uuid?: string
  status?: 'active' | 'canceled'
  active?: boolean
  department?: string
  cost_center?: string
  approval_required?: boolean
}

export type WebhookConfig = {
  url: string
  events: string[]
  organization?: string
  user?: string
  scope?: 'user' | 'organization'
  signing_key?: string
  retry_config?: {
    max_retries?: number
    retry_delay_ms?: number
    exponential_backoff?: boolean
  }
  filtering?: {
    event_types?: string[]
    user_domains?: string[]
  }
}

export type SecurityConfig = {
  rate_limiting: {
    requests_per_minute: number
    burst_limit: number
    window_ms: number
  }
  cors: {
    origins: string[]
    methods?: string[]
    allowed_headers?: string[]
    credentials?: boolean
  }
  encryption: {
    algorithm: 'aes-256-gcm' | 'aes-256-cbc'
    key_rotation_days: number
    token_expiry_hours: number
  }
  audit: {
    log_all_requests: boolean
    log_sensitive_data: boolean
    retention_days: number
  }
}

// ===== API RESPONSE SCHEMAS =====

export const CalendlyListResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    collection: z.array(itemSchema),
    pagination: z.object({
      count: z.number(),
      next_page: z.string().url().optional(),
      previous_page: z.string().url().optional(),
      next_page_token: z.string().optional(),
      previous_page_token: z.string().optional()
    })
  })

export const CalendlyErrorResponseSchema = z.object({
  title: z.string(),
  message: z.string(),
  details: z.array(z.object({
    parameter: z.string(),
    message: z.string()
  })).optional(),
  
  // Enterprise error tracking
  error_id: z.string().uuid().optional(),
  timestamp: z.string().datetime().optional(),
  retry_after: z.number().optional()
})