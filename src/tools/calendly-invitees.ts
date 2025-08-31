import { CalendlyService } from '../services/calendly.js';
import { Logger } from '../utils/logger.js';
import { ValidationUtils } from '../utils/validation.js';

export class CalendlyInviteeTools {
  private calendly: CalendlyService;
  private logger: Logger;

  constructor(calendly: CalendlyService) {
    this.calendly = calendly;
    this.logger = Logger.getInstance();
  }

  // TOOL: List Event Invitees
  async listEventInvitees(params: {
    event_uri?: string;
    count?: number;
    email?: string;
    status?: 'active' | 'canceled';
    sort?: string;
  }): Promise<any> {
    try {
      if (!params.event_uri) {
        throw new Error('event_uri parameter is required');
      }
      
      this.logger.info('Fetching event invitees', { params });
      
      const result = await this.calendly.getEventInvitees(params.event_uri, {
        count: params.count || 20,
        email: params.email,
        status: params.status,
        sort: params.sort
      });
      
      const invitees = result.collection;
      const activeInvitees = invitees.filter(i => i.status === 'active');
      const canceledInvitees = invitees.filter(i => i.status === 'canceled');

      return {
        success: true,
        data: {
          invitees: invitees,
          pagination: result.pagination,
          count: invitees.length,
          summary: `Found ${invitees.length} invitees for event`,
          breakdown: {
            active: activeInvitees.length,
            canceled: canceledInvitees.length
          },
          event_uri: params.event_uri
        }
      };
    } catch (error) {
      this.logger.error('Error fetching event invitees:', error);
      throw error;
    }
  }

  // TOOL: Get Invitee Details
  async getInvitee(params: { invitee_uri?: string }): Promise<any> {
    try {
      if (!params.invitee_uri) {
        throw new Error('invitee_uri parameter is required');
      }
      
      this.logger.info('Fetching invitee details', { invitee_uri: params.invitee_uri });
      
      const invitee = await this.calendly.getInvitee(params.invitee_uri);
      
      return {
        success: true,
        data: {
          invitee: invitee,
          summary: `Invitee: ${invitee.name} (${invitee.email})`,
          details: {
            name: invitee.name,
            email: invitee.email,
            status: invitee.status,
            timezone: invitee.timezone,
            event: invitee.event,
            questions_and_answers: invitee.questions_and_answers,
            cancel_url: invitee.cancel_url,
            reschedule_url: invitee.reschedule_url
          }
        }
      };
    } catch (error) {
      this.logger.error('Error fetching invitee:', error);
      throw error;
    }
  }
}