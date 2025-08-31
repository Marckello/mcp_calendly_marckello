// Calendly Configuration
export interface CalendlyConfig {
  accessToken: string;
  timeout?: number;
}

// Calendly User
export interface CalendlyUser {
  uri: string;
  name: string;
  slug: string;
  email: string;
  timezone: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  current_organization: string;
  locale?: string;
  scheduling_url: string;
}

// Calendly Organization
export interface CalendlyOrganization {
  uri: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// Calendly Event Type
export interface CalendlyEventType {
  uri: string;
  name: string;
  active: boolean;
  slug: string;
  scheduling_url: string;
  duration: number;
  kind: 'solo' | 'group' | 'collective' | 'round_robin';
  pooling_type?: 'round_robin' | 'collective';
  type: 'StandardEventType' | 'AdhocEventType';
  color: string;
  created_at: string;
  updated_at: string;
  internal_note?: string;
  description_plain?: string;
  description_html?: string;
  profile: {
    type: string;
    name: string;
    owner: string;
  };
  secret: boolean;
  booking_method?: string;
  custom_questions?: any[];
  deleted_at?: string;
  admin_managed?: boolean;
}

// Calendly Scheduled Event
export interface CalendlyScheduledEvent {
  uri: string;
  name: string;
  status: 'active' | 'canceled';
  start_time: string;
  end_time: string;
  event_type: string;
  location?: {
    type: string;
    location?: string;
    status?: string;
    join_url?: string;
  };
  invitees_counter: {
    total: number;
    active: number;
    limit: number;
  };
  created_at: string;
  updated_at: string;
  event_memberships: Array<{
    user: string;
    user_email?: string;
    user_name?: string;
  }>;
  event_guests?: Array<{
    email: string;
    created_at: string;
    updated_at: string;
  }>;
  calendar_event?: {
    kind: string;
    external_id: string;
  };
  cancellation?: {
    canceled_by: string;
    reason?: string;
    canceler_type: string;
    created_at: string;
  };
}

// Calendly Invitee
export interface CalendlyInvitee {
  uri: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  status: 'active' | 'canceled';
  timezone: string;
  created_at: string;
  updated_at: string;
  event: string;
  questions_and_answers?: Array<{
    question: string;
    answer: string;
    position: number;
  }>;
  tracking?: {
    utm_campaign?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_content?: string;
    utm_term?: string;
    salesforce_uuid?: string;
  };
  text_reminder_number?: string;
  rescheduled?: boolean;
  old_invitee?: string;
  new_invitee?: string;
  cancel_url: string;
  reschedule_url: string;
  routing_form_submission?: string;
  payment?: {
    external_id: string;
    provider: string;
    amount: number;
    currency: string;
    terms: string;
    successful: boolean;
  };
}

// Calendly Webhook
export interface CalendlyWebhook {
  uri: string;
  callback_url: string;
  created_at: string;
  updated_at: string;
  retry_started_at?: string;
  state: 'active' | 'disabled';
  events: string[];
  scope: 'user' | 'organization';
  organization: string;
  user?: string;
  creator: string;
}

// Calendly Availability Schedule
export interface CalendlyAvailabilitySchedule {
  uri: string;
  name: string;
  timezone: string;
  created_at: string;
  updated_at: string;
  user: string;
  rules: Array<{
    type: 'wday';
    wday: string;
    intervals: Array<{
      from: string;
      to: string;
    }>;
  }>;
}

// Common list parameters
export interface CalendlyListParams {
  count?: number;
  page_token?: string;
  sort?: string;
}

// API Response wrapper
export interface CalendlyApiResponse<T> {
  resource?: T;
  collection?: T[];
  pagination?: {
    count: number;
    next_page?: string;
    previous_page?: string;
    next_page_token?: string;
    previous_page_token?: string;
  };
}

// Event creation parameters
export interface CreateEventParams {
  event_type: string;
  start_time: string;
  invitee: {
    email: string;
    name?: string;
    first_name?: string;
    last_name?: string;
  };
  questions_and_answers?: Array<{
    question: string;
    answer: string;
  }>;
}