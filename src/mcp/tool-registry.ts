import { Logger } from 'winston'
import { CalendlyEnterpriseService } from '../services/calendly-enterprise-service.js'
import {
  MCPTool,
  MCPToolResult,
  MCPError,
  MCPErrorCode
} from '../types/mcp-streaming.js'

// ===== MCP TOOL REGISTRY =====

export class MCPToolRegistry {
  private tools: Map<string, MCPTool> = new Map()
  private toolCategories: Map<string, string[]> = new Map()

  constructor(
    private calendlyService: CalendlyEnterpriseService,
    private logger: Logger
  ) {
    this.registerTools()
  }

  private registerTools(): void {
    const tools: MCPTool[] = [
      // ===== USER TOOLS =====
      {
        name: 'calendly_get_current_user',
        description: 'Get current authenticated user information from Calendly',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      
      // ===== EVENT TOOLS =====
      {
        name: 'calendly_list_events',
        description: 'List scheduled events with filtering and pagination options',
        inputSchema: {
          type: 'object',
          properties: {
            user: {
              type: 'string',
              description: 'User URI to filter events for specific user'
            },
            organization: {
              type: 'string',
              description: 'Organization URI to filter events for organization'
            },
            count: {
              type: 'number',
              description: 'Number of events to return (1-100)',
              minimum: 1,
              maximum: 100
            },
            invitee_email: {
              type: 'string',
              format: 'email',
              description: 'Filter events by invitee email address'
            },
            page_token: {
              type: 'string',
              description: 'Token for pagination to get next page'
            },
            sort: {
              type: 'string',
              enum: ['start_time:asc', 'start_time:desc'],
              description: 'Sort order for events'
            },
            status: {
              type: 'string',
              enum: ['active', 'canceled'],
              description: 'Filter by event status'
            },
            min_start_time: {
              type: 'string',
              format: 'date-time',
              description: 'Filter events starting after this time (ISO 8601)'
            },
            max_start_time: {
              type: 'string',
              format: 'date-time',
              description: 'Filter events starting before this time (ISO 8601)'
            }
          }
        }
      },

      {
        name: 'calendly_get_event',
        description: 'Get detailed information about a specific scheduled event',
        inputSchema: {
          type: 'object',
          properties: {
            event_uuid: {
              type: 'string',
              description: 'UUID of the scheduled event to retrieve'
            }
          },
          required: ['event_uuid']
        }
      },

      {
        name: 'calendly_cancel_event',
        description: 'Cancel a scheduled event with optional reason',
        inputSchema: {
          type: 'object',
          properties: {
            event_uuid: {
              type: 'string',
              description: 'UUID of the event to cancel'
            },
            reason: {
              type: 'string',
              description: 'Optional reason for canceling the event'
            }
          },
          required: ['event_uuid']
        }
      },

      // ===== EVENT TYPE TOOLS =====
      {
        name: 'calendly_list_event_types',
        description: 'List available event types for a specific user',
        inputSchema: {
          type: 'object',
          properties: {
            user: {
              type: 'string',
              description: 'User URI to list event types for (required)'
            },
            count: {
              type: 'number',
              description: 'Number of event types to return (1-100)',
              minimum: 1,
              maximum: 100
            },
            page_token: {
              type: 'string',
              description: 'Token for pagination'
            },
            sort: {
              type: 'string',
              enum: ['name:asc', 'name:desc'],
              description: 'Sort order for event types'
            },
            active: {
              type: 'boolean',
              description: 'Filter by active/inactive event types'
            }
          },
          required: ['user']
        }
      },

      {
        name: 'calendly_get_event_type',
        description: 'Get detailed information about a specific event type',
        inputSchema: {
          type: 'object',
          properties: {
            event_type_uuid: {
              type: 'string',
              description: 'UUID of the event type to retrieve'
            }
          },
          required: ['event_type_uuid']
        }
      },

      // ===== INVITEE TOOLS =====
      {
        name: 'calendly_list_event_invitees',
        description: 'List invitees for a specific scheduled event',
        inputSchema: {
          type: 'object',
          properties: {
            event_uuid: {
              type: 'string',
              description: 'UUID of the event to list invitees for'
            },
            count: {
              type: 'number',
              description: 'Number of invitees to return (1-100)',
              minimum: 1,
              maximum: 100
            },
            invitee_email: {
              type: 'string',
              format: 'email',
              description: 'Filter invitees by email address'
            },
            page_token: {
              type: 'string',
              description: 'Token for pagination'
            },
            sort: {
              type: 'string',
              enum: ['created_at:asc', 'created_at:desc'],
              description: 'Sort order for invitees'
            },
            status: {
              type: 'string',
              enum: ['active', 'canceled'],
              description: 'Filter by invitee status'
            }
          },
          required: ['event_uuid']
        }
      },

      {
        name: 'calendly_get_invitee',
        description: 'Get detailed information about a specific invitee',
        inputSchema: {
          type: 'object',
          properties: {
            invitee_uuid: {
              type: 'string',
              description: 'UUID of the invitee to retrieve'
            }
          },
          required: ['invitee_uuid']
        }
      },

      // ===== WEBHOOK TOOLS =====
      {
        name: 'calendly_create_webhook',
        description: 'Create a webhook subscription for Calendly events',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              format: 'uri',
              description: 'Webhook endpoint URL to receive notifications'
            },
            events: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['invitee.created', 'invitee.canceled']
              },
              description: 'List of events to subscribe to',
              minItems: 1
            },
            organization: {
              type: 'string',
              description: 'Organization URI (for organization scope)'
            },
            user: {
              type: 'string',
              description: 'User URI (for user scope)'
            },
            scope: {
              type: 'string',
              enum: ['user', 'organization'],
              description: 'Scope of webhook subscription'
            }
          },
          required: ['url', 'events']
        }
      },

      {
        name: 'calendly_list_webhooks',
        description: 'List existing webhook subscriptions',
        inputSchema: {
          type: 'object',
          properties: {
            organization: {
              type: 'string',
              description: 'Organization URI to filter webhooks'
            },
            user: {
              type: 'string',
              description: 'User URI to filter webhooks'
            },
            scope: {
              type: 'string',
              enum: ['user', 'organization'],
              description: 'Filter by webhook scope'
            }
          }
        }
      },

      {
        name: 'calendly_delete_webhook',
        description: 'Delete a webhook subscription',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_uuid: {
              type: 'string',
              description: 'UUID of the webhook to delete'
            }
          },
          required: ['webhook_uuid']
        }
      },

      // ===== AVAILABILITY TOOLS =====
      {
        name: 'calendly_list_availability_schedules',
        description: 'List availability schedules for a user',
        inputSchema: {
          type: 'object',
          properties: {
            user: {
              type: 'string',
              description: 'User URI to list availability schedules for'
            }
          },
          required: ['user']
        }
      },

      // ===== ENTERPRISE TOOLS =====
      {
        name: 'calendly_get_organization_members',
        description: 'Get members of the organization (enterprise feature)',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },

      {
        name: 'calendly_get_organization_events',
        description: 'Get events across the entire organization (enterprise feature)',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of events to return (1-100)',
              minimum: 1,
              maximum: 100
            },
            page_token: {
              type: 'string',
              description: 'Token for pagination'
            },
            status: {
              type: 'string',
              enum: ['active', 'canceled'],
              description: 'Filter by event status'
            },
            min_start_time: {
              type: 'string',
              format: 'date-time',
              description: 'Filter events starting after this time'
            },
            max_start_time: {
              type: 'string',
              format: 'date-time',
              description: 'Filter events starting before this time'
            }
          }
        }
      }
    ]

    // Register all tools
    tools.forEach(tool => {
      this.tools.set(tool.name, tool)
    })

    // Set up categories
    this.toolCategories.set('user', [
      'calendly_get_current_user'
    ])

    this.toolCategories.set('events', [
      'calendly_list_events',
      'calendly_get_event',
      'calendly_cancel_event'
    ])

    this.toolCategories.set('event_types', [
      'calendly_list_event_types',
      'calendly_get_event_type'
    ])

    this.toolCategories.set('invitees', [
      'calendly_list_event_invitees',
      'calendly_get_invitee'
    ])

    this.toolCategories.set('webhooks', [
      'calendly_create_webhook',
      'calendly_list_webhooks',
      'calendly_delete_webhook'
    ])

    this.toolCategories.set('availability', [
      'calendly_list_availability_schedules'
    ])

    this.toolCategories.set('enterprise', [
      'calendly_get_organization_members',
      'calendly_get_organization_events'
    ])

    this.logger.info(`Registered ${tools.length} MCP tools`, {
      categories: Array.from(this.toolCategories.keys()),
      tool_count: tools.length
    })
  }

  // ===== TOOL EXECUTION =====

  public async executeTool(toolName: string, args: any): Promise<MCPToolResult> {
    const startTime = Date.now()

    try {
      const tool = this.tools.get(toolName)
      if (!tool) {
        throw new MCPError(MCPErrorCode.ToolNotFound, `Tool not found: ${toolName}`)
      }

      this.logger.debug('Executing tool', {
        tool_name: toolName,
        arguments: Object.keys(args || {})
      })

      let result: any

      // Route to appropriate handler
      switch (toolName) {
        // User tools
        case 'calendly_get_current_user':
          result = await this.handleGetCurrentUser()
          break

        // Event tools
        case 'calendly_list_events':
          result = await this.handleListEvents(args)
          break
        case 'calendly_get_event':
          result = await this.handleGetEvent(args)
          break
        case 'calendly_cancel_event':
          result = await this.handleCancelEvent(args)
          break

        // Event type tools
        case 'calendly_list_event_types':
          result = await this.handleListEventTypes(args)
          break
        case 'calendly_get_event_type':
          result = await this.handleGetEventType(args)
          break

        // Invitee tools
        case 'calendly_list_event_invitees':
          result = await this.handleListEventInvitees(args)
          break
        case 'calendly_get_invitee':
          result = await this.handleGetInvitee(args)
          break

        // Webhook tools
        case 'calendly_create_webhook':
          result = await this.handleCreateWebhook(args)
          break
        case 'calendly_list_webhooks':
          result = await this.handleListWebhooks(args)
          break
        case 'calendly_delete_webhook':
          result = await this.handleDeleteWebhook(args)
          break

        // Availability tools
        case 'calendly_list_availability_schedules':
          result = await this.handleListAvailabilitySchedules(args)
          break

        // Enterprise tools
        case 'calendly_get_organization_members':
          result = await this.handleGetOrganizationMembers()
          break
        case 'calendly_get_organization_events':
          result = await this.handleGetOrganizationEvents(args)
          break

        default:
          throw new MCPError(MCPErrorCode.ToolNotFound, `Tool handler not implemented: ${toolName}`)
      }

      const duration = Date.now() - startTime

      this.logger.info('Tool executed successfully', {
        tool_name: toolName,
        duration_ms: duration,
        result_size: JSON.stringify(result).length
      })

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            tool: toolName,
            data: result,
            execution_time_ms: duration
          }, null, 2)
        }]
      }

    } catch (error) {
      const duration = Date.now() - startTime

      this.logger.error('Tool execution failed', {
        tool_name: toolName,
        duration_ms: duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            tool: toolName,
            error: {
              code: error instanceof MCPError ? error.code : MCPErrorCode.InternalError,
              message: error instanceof Error ? error.message : 'Unknown error'
            },
            execution_time_ms: duration
          }, null, 2)
        }],
        isError: true
      }
    }
  }

  // ===== TOOL HANDLERS =====

  private async handleGetCurrentUser(): Promise<any> {
    const user = await this.calendlyService.getCurrentUser()
    return {
      name: user.name,
      email: user.email,
      slug: user.slug,
      scheduling_url: user.scheduling_url,
      timezone: user.timezone,
      uri: user.uri,
      avatar_url: user.avatar_url,
      current_organization: user.current_organization,
      created_at: user.created_at,
      updated_at: user.updated_at
    }
  }

  private async handleListEvents(args: any): Promise<any> {
    const result = await this.calendlyService.listEvents(args)
    return {
      events: result.items.map(event => ({
        uri: event.uri,
        name: event.name,
        status: event.status,
        start_time: event.start_time,
        end_time: event.end_time,
        event_type: event.event_type,
        location: event.location,
        invitees_counter: event.invitees_counter,
        created_at: event.created_at,
        updated_at: event.updated_at
      })),
      pagination: result.pagination
    }
  }

  private async handleGetEvent(args: any): Promise<any> {
    if (!args.event_uuid) {
      throw new MCPError(MCPErrorCode.InvalidParams, 'event_uuid is required')
    }

    const event = await this.calendlyService.getEvent(args.event_uuid)
    return {
      uri: event.uri,
      name: event.name,
      status: event.status,
      start_time: event.start_time,
      end_time: event.end_time,
      event_type: event.event_type,
      location: event.location,
      invitees_counter: event.invitees_counter,
      event_memberships: event.event_memberships,
      event_guests: event.event_guests,
      created_at: event.created_at,
      updated_at: event.updated_at
    }
  }

  private async handleCancelEvent(args: any): Promise<any> {
    if (!args.event_uuid) {
      throw new MCPError(MCPErrorCode.InvalidParams, 'event_uuid is required')
    }

    const canceledEvent = await this.calendlyService.cancelEvent(args.event_uuid, args.reason)
    return {
      uri: canceledEvent.uri,
      name: canceledEvent.name,
      status: canceledEvent.status,
      start_time: canceledEvent.start_time,
      end_time: canceledEvent.end_time,
      updated_at: canceledEvent.updated_at,
      cancellation_reason: args.reason
    }
  }

  private async handleListEventTypes(args: any): Promise<any> {
    if (!args.user) {
      throw new MCPError(MCPErrorCode.InvalidParams, 'user is required')
    }

    const result = await this.calendlyService.listEventTypes(args)
    return {
      event_types: result.items.map(eventType => ({
        uri: eventType.uri,
        name: eventType.name,
        active: eventType.active,
        slug: eventType.slug,
        scheduling_url: eventType.scheduling_url,
        duration: eventType.duration,
        kind: eventType.kind,
        type: eventType.type,
        color: eventType.color,
        description_plain: eventType.description_plain,
        created_at: eventType.created_at,
        updated_at: eventType.updated_at
      })),
      pagination: result.pagination
    }
  }

  private async handleGetEventType(args: any): Promise<any> {
    if (!args.event_type_uuid) {
      throw new MCPError(MCPErrorCode.InvalidParams, 'event_type_uuid is required')
    }

    const eventType = await this.calendlyService.getEventType(args.event_type_uuid)
    return {
      uri: eventType.uri,
      name: eventType.name,
      active: eventType.active,
      slug: eventType.slug,
      scheduling_url: eventType.scheduling_url,
      duration: eventType.duration,
      kind: eventType.kind,
      pooling_type: eventType.pooling_type,
      type: eventType.type,
      color: eventType.color,
      internal_note: eventType.internal_note,
      description_plain: eventType.description_plain,
      description_html: eventType.description_html,
      profile: eventType.profile,
      secret: eventType.secret,
      booking_method: eventType.booking_method,
      created_at: eventType.created_at,
      updated_at: eventType.updated_at
    }
  }

  private async handleListEventInvitees(args: any): Promise<any> {
    if (!args.event_uuid) {
      throw new MCPError(MCPErrorCode.InvalidParams, 'event_uuid is required')
    }

    const result = await this.calendlyService.listEventInvitees(args.event_uuid, args)
    return {
      invitees: result.items.map(invitee => ({
        uri: invitee.uri,
        name: invitee.name,
        email: invitee.email,
        timezone: invitee.timezone,
        status: invitee.status,
        questions_and_answers: invitee.questions_and_answers,
        tracking: invitee.tracking,
        created_at: invitee.created_at,
        updated_at: invitee.updated_at
      })),
      pagination: result.pagination
    }
  }

  private async handleGetInvitee(args: any): Promise<any> {
    if (!args.invitee_uuid) {
      throw new MCPError(MCPErrorCode.InvalidParams, 'invitee_uuid is required')
    }

    const invitee = await this.calendlyService.getInvitee(args.invitee_uuid)
    return {
      uri: invitee.uri,
      name: invitee.name,
      first_name: invitee.first_name,
      last_name: invitee.last_name,
      email: invitee.email,
      text_reminder_number: invitee.text_reminder_number,
      timezone: invitee.timezone,
      status: invitee.status,
      questions_and_answers: invitee.questions_and_answers,
      tracking: invitee.tracking,
      cancel_url: invitee.cancel_url,
      reschedule_url: invitee.reschedule_url,
      created_at: invitee.created_at,
      updated_at: invitee.updated_at
    }
  }

  private async handleCreateWebhook(args: any): Promise<any> {
    const webhook = await this.calendlyService.createWebhook(args)
    return {
      message: 'Webhook created successfully',
      webhook: {
        uri: webhook.uri,
        url: webhook.url,
        state: webhook.state,
        scope: webhook.scope,
        events: webhook.events,
        created_at: webhook.created_at
      }
    }
  }

  private async handleListWebhooks(args: any): Promise<any> {
    const result = await this.calendlyService.listWebhooks(args)
    return {
      webhooks: result.items,
      pagination: result.pagination
    }
  }

  private async handleDeleteWebhook(args: any): Promise<any> {
    if (!args.webhook_uuid) {
      throw new MCPError(MCPErrorCode.InvalidParams, 'webhook_uuid is required')
    }

    await this.calendlyService.deleteWebhook(args.webhook_uuid)
    return {
      message: 'Webhook deleted successfully',
      webhook_uuid: args.webhook_uuid
    }
  }

  private async handleListAvailabilitySchedules(args: any): Promise<any> {
    if (!args.user) {
      throw new MCPError(MCPErrorCode.InvalidParams, 'user is required')
    }

    const result = await this.calendlyService.listAvailabilitySchedules(args.user)
    return {
      availability_schedules: result.items,
      pagination: result.pagination
    }
  }

  private async handleGetOrganizationMembers(): Promise<any> {
    const result = await this.calendlyService.getOrganizationMembers()
    return {
      members: result.items.map(member => ({
        name: member.name,
        email: member.email,
        slug: member.slug,
        scheduling_url: member.scheduling_url,
        timezone: member.timezone,
        uri: member.uri
      })),
      pagination: result.pagination
    }
  }

  private async handleGetOrganizationEvents(args: any): Promise<any> {
    const result = await this.calendlyService.getOrganizationEvents(args)
    return {
      events: result.items.map(event => ({
        uri: event.uri,
        name: event.name,
        status: event.status,
        start_time: event.start_time,
        end_time: event.end_time,
        event_type: event.event_type,
        invitees_counter: event.invitees_counter,
        event_memberships: event.event_memberships,
        created_at: event.created_at
      })),
      pagination: result.pagination
    }
  }

  // ===== PUBLIC METHODS =====

  public getTools(): MCPTool[] {
    return Array.from(this.tools.values())
  }

  public getToolCount(): number {
    return this.tools.size
  }

  public getToolCategories(): Record<string, string[]> {
    const categories: Record<string, string[]> = {}
    for (const [category, tools] of this.toolCategories.entries()) {
      categories[category] = tools
    }
    return categories
  }

  public getTool(toolName: string): MCPTool | undefined {
    return this.tools.get(toolName)
  }

  public hasRegisteredTool(toolName: string): boolean {
    return this.tools.has(toolName)
  }
}