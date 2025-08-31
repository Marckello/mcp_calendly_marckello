import { CalendlyService } from '../services/calendly.js';
import { Logger } from '../utils/logger.js';
import { ValidationUtils } from '../utils/validation.js';

export class CalendlyCoreTools {
  private calendly: CalendlyService;
  private logger: Logger;

  constructor(calendly: CalendlyService) {
    this.calendly = calendly;
    this.logger = Logger.getInstance();
  }

  // TOOL: Get Current User
  async getCurrentUser(): Promise<any> {
    try {
      this.logger.info('Fetching current user information');
      
      const user = await this.calendly.getCurrentUser();
      
      return {
        success: true,
        data: {
          user: user,
          summary: `User: ${user.name} (${user.email})`,
          details: {
            name: user.name,
            email: user.email,
            timezone: user.timezone,
            scheduling_url: user.scheduling_url,
            organization: user.current_organization
          }
        }
      };
    } catch (error) {
      this.logger.error('Error fetching current user:', error);
      throw error;
    }
  }

  // TOOL: Get Organization
  async getOrganization(): Promise<any> {
    try {
      this.logger.info('Fetching organization information');
      
      // First get current user to get organization URI
      const user = await this.calendly.getCurrentUser();
      const organization = await this.calendly.getOrganization(user.current_organization);
      
      return {
        success: true,
        data: {
          organization: organization,
          summary: `Organization: ${organization.name}`,
          details: {
            name: organization.name,
            uri: organization.uri,
            created_at: organization.created_at
          }
        }
      };
    } catch (error) {
      this.logger.error('Error fetching organization:', error);
      throw error;
    }
  }

  // TOOL: List Event Types
  async listEventTypes(params: {
    user_uri?: string;
    organization_uri?: string;
    active_only?: boolean;
  } = {}): Promise<any> {
    try {
      this.logger.info('Fetching event types', { params });
      
      // If no user URI provided, get current user
      let userUri = params.user_uri;
      if (!userUri) {
        const user = await this.calendly.getCurrentUser();
        userUri = user.uri;
      }

      const eventTypes = await this.calendly.getEventTypes(userUri, params.organization_uri);
      
      // Filter active only if requested
      const filteredEventTypes = params.active_only 
        ? eventTypes.filter(et => et.active)
        : eventTypes;

      return {
        success: true,
        data: {
          event_types: filteredEventTypes,
          count: filteredEventTypes.length,
          summary: `Found ${filteredEventTypes.length} event types`,
          active_count: eventTypes.filter(et => et.active).length,
          inactive_count: eventTypes.filter(et => !et.active).length
        }
      };
    } catch (error) {
      this.logger.error('Error fetching event types:', error);
      throw error;
    }
  }

  // TOOL: Get Event Type Details
  async getEventType(params: { event_type_uri?: string }): Promise<any> {
    try {
      if (!params.event_type_uri) {
        throw new Error('event_type_uri parameter is required');
      }
      
      this.logger.info('Fetching event type details', { event_type_uri: params.event_type_uri });
      
      const eventType = await this.calendly.getEventType(params.event_type_uri);
      
      return {
        success: true,
        data: {
          event_type: eventType,
          summary: `Event Type: ${eventType.name} (${eventType.duration} min)`,
          details: {
            name: eventType.name,
            duration: eventType.duration,
            active: eventType.active,
            kind: eventType.kind,
            scheduling_url: eventType.scheduling_url,
            description: eventType.description_plain
          }
        }
      };
    } catch (error) {
      this.logger.error('Error fetching event type:', error);
      throw error;
    }
  }

  // TOOL: List Scheduled Events
  async listScheduledEvents(params: {
    user_uri?: string;
    organization_uri?: string;
    min_start_time?: string;
    max_start_time?: string;
    status?: 'active' | 'canceled';
    count?: number;
  } = {}): Promise<any> {
    try {
      this.logger.info('Fetching scheduled events', { params });
      
      // If no user URI provided, get current user
      let userUri = params.user_uri;
      if (!userUri) {
        const user = await this.calendly.getCurrentUser();
        userUri = user.uri;
      }

      const result = await this.calendly.getScheduledEvents({
        user: userUri,
        organization: params.organization_uri,
        min_start_time: params.min_start_time,
        max_start_time: params.max_start_time,
        status: params.status,
        count: params.count || 20
      });
      
      const events = result.collection;
      const activeEvents = events.filter(e => e.status === 'active');
      const canceledEvents = events.filter(e => e.status === 'canceled');

      return {
        success: true,
        data: {
          scheduled_events: events,
          pagination: result.pagination,
          count: events.length,
          summary: `Found ${events.length} scheduled events`,
          breakdown: {
            active: activeEvents.length,
            canceled: canceledEvents.length
          }
        }
      };
    } catch (error) {
      this.logger.error('Error fetching scheduled events:', error);
      throw error;
    }
  }

  // TOOL: Get Scheduled Event Details
  async getScheduledEvent(params: { event_uri?: string }): Promise<any> {
    try {
      if (!params.event_uri) {
        throw new Error('event_uri parameter is required');
      }
      
      this.logger.info('Fetching scheduled event details', { event_uri: params.event_uri });
      
      const event = await this.calendly.getScheduledEvent(params.event_uri);
      
      return {
        success: true,
        data: {
          scheduled_event: event,
          summary: `Event: ${event.name} - ${event.start_time}`,
          details: {
            name: event.name,
            status: event.status,
            start_time: event.start_time,
            end_time: event.end_time,
            location: event.location,
            invitees_count: event.invitees_counter.total,
            event_type: event.event_type
          }
        }
      };
    } catch (error) {
      this.logger.error('Error fetching scheduled event:', error);
      throw error;
    }
  }

  // TOOL: Cancel Scheduled Event  
  async cancelScheduledEvent(params: { 
    event_uri?: string;
    reason?: string;
  }): Promise<any> {
    try {
      if (!params.event_uri) {
        throw new Error('event_uri parameter is required');
      }
      
      this.logger.info('Canceling scheduled event', { 
        event_uri: params.event_uri,
        reason: params.reason 
      });
      
      const canceledEvent = await this.calendly.cancelScheduledEvent(
        params.event_uri, 
        params.reason
      );
      
      return {
        success: true,
        data: {
          canceled_event: canceledEvent,
          summary: `Successfully canceled event: ${canceledEvent.name}`,
          details: {
            name: canceledEvent.name,
            status: canceledEvent.status,
            cancellation: canceledEvent.cancellation
          }
        }
      };
    } catch (error) {
      this.logger.error('Error canceling scheduled event:', error);
      throw error;
    }
  }

  // TOOL: Get User Availability
  async getUserAvailability(params: { user_uri?: string } = {}): Promise<any> {
    try {
      this.logger.info('Fetching user availability', { params });
      
      // If no user URI provided, get current user
      let userUri = params.user_uri;
      if (!userUri) {
        const user = await this.calendly.getCurrentUser();
        userUri = user.uri;
      }

      const schedules = await this.calendly.getUserAvailabilitySchedules(userUri);
      
      return {
        success: true,
        data: {
          availability_schedules: schedules,
          count: schedules.length,
          summary: `Found ${schedules.length} availability schedules`,
          user_uri: userUri
        }
      };
    } catch (error) {
      this.logger.error('Error fetching user availability:', error);
      throw error;
    }
  }
}