import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { Logger } from 'winston'
import Joi from 'joi'
import {
  CalendlyUser,
  CalendlyEvent,
  CalendlyEventType,
  CalendlyInvitee,
  CalendlyApiParams,
  CalendlyApiParamsJoiSchema,
  CalendlyListResponseSchema,
  CalendlyUserSchema,
  CalendlyEventSchema,
  CalendlyEventTypeSchema,
  CalendlyInviteeSchema
} from '../types/calendly-enterprise.js'
import { MCPError, MCPErrorCode } from '../types/mcp-streaming.js'

// ===== CALENDLY ENTERPRISE SERVICE =====

export interface CalendlyServiceConfig {
  accessToken: string
  baseUrl: string
  organizationUri?: string
  timeout: number
  retries?: number
  retryDelay?: number
}

export interface CalendlyListResult<T> {
  items: T[]
  pagination: {
    count: number
    next_page_token?: string
    previous_page_token?: string
    has_more: boolean
  }
}

export class CalendlyEnterpriseService {
  private client: AxiosInstance
  private config: CalendlyServiceConfig

  constructor(config: CalendlyServiceConfig, private logger: Logger) {
    this.config = config
    this.setupAxiosClient()
  }

  private setupAxiosClient(): void {
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'MCP-Calendly-Streaming/1.0.0'
      }
    })

    // Request interceptor for logging and retry logic
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug('Calendly API request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params
        })
        return config
      },
      (error) => {
        this.logger.error('Request interceptor error', { error: error.message })
        return Promise.reject(error)
      }
    )

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug('Calendly API response', {
          status: response.status,
          url: response.config.url,
          data_size: JSON.stringify(response.data).length
        })
        return response
      },
      (error) => {
        const status = error.response?.status
        const message = error.response?.data?.message || error.message
        
        this.logger.error('Calendly API error', {
          status,
          message,
          url: error.config?.url,
          method: error.config?.method
        })

        // Convert to MCP error
        let mcpErrorCode = MCPErrorCode.InternalError
        
        switch (status) {
          case 400:
            mcpErrorCode = MCPErrorCode.InvalidParams
            break
          case 401:
            mcpErrorCode = MCPErrorCode.AuthenticationFailed
            break
          case 403:
            mcpErrorCode = MCPErrorCode.AuthorizationFailed
            break
          case 404:
            mcpErrorCode = MCPErrorCode.ResourceNotFound
            break
          case 429:
            mcpErrorCode = MCPErrorCode.RateLimitExceeded
            break
        }

        throw new MCPError(mcpErrorCode, message, {
          status,
          response: error.response?.data
        })
      }
    )
  }

  // ===== USER METHODS =====

  public async getCurrentUser(): Promise<CalendlyUser> {
    try {
      const response = await this.client.get<{ resource: CalendlyUser }>('/users/me')
      return CalendlyUserSchema.parse(response.data.resource)
    } catch (error) {
      this.logger.error('Failed to get current user', { error })
      throw error
    }
  }

  public async getUser(userUri: string): Promise<CalendlyUser> {
    try {
      const userId = this.extractUuidFromUri(userUri)
      const response = await this.client.get<{ resource: CalendlyUser }>(`/users/${userId}`)
      return CalendlyUserSchema.parse(response.data.resource)
    } catch (error) {
      this.logger.error('Failed to get user', { userUri, error })
      throw error
    }
  }

  // ===== EVENT METHODS =====

  public async listEvents(params: CalendlyApiParams = {}): Promise<CalendlyListResult<CalendlyEvent>> {
    try {
      // Validate parameters
      const { error, value } = CalendlyApiParamsJoiSchema.validate(params)
      if (error) {
        throw new MCPError(MCPErrorCode.InvalidParams, error.message)
      }

      const cleanParams = this.cleanParams(value)
      const response = await this.client.get<any>('/scheduled_events', { params: cleanParams })
      
      const listResponse = CalendlyListResponseSchema(CalendlyEventSchema).parse(response.data)
      
      return {
        items: listResponse.collection,
        pagination: {
          count: listResponse.pagination.count,
          next_page_token: listResponse.pagination.next_page_token,
          previous_page_token: listResponse.pagination.previous_page_token,
          has_more: !!listResponse.pagination.next_page_token
        }
      }
    } catch (error) {
      this.logger.error('Failed to list events', { params, error })
      throw error
    }
  }

  public async getEvent(eventUuid: string): Promise<CalendlyEvent> {
    try {
      if (!this.isValidUuid(eventUuid)) {
        throw new MCPError(MCPErrorCode.InvalidParams, 'Invalid event UUID')
      }

      const response = await this.client.get<{ resource: CalendlyEvent }>(`/scheduled_events/${eventUuid}`)
      return CalendlyEventSchema.parse(response.data.resource)
    } catch (error) {
      this.logger.error('Failed to get event', { eventUuid, error })
      throw error
    }
  }

  public async cancelEvent(eventUuid: string, reason?: string): Promise<CalendlyEvent> {
    try {
      if (!this.isValidUuid(eventUuid)) {
        throw new MCPError(MCPErrorCode.InvalidParams, 'Invalid event UUID')
      }

      const data = reason ? { reason } : undefined
      const response = await this.client.delete<{ resource: CalendlyEvent }>(`/scheduled_events/${eventUuid}`, { data })
      
      return CalendlyEventSchema.parse(response.data.resource)
    } catch (error) {
      this.logger.error('Failed to cancel event', { eventUuid, reason, error })
      throw error
    }
  }

  // ===== EVENT TYPE METHODS =====

  public async listEventTypes(params: { user: string } & CalendlyApiParams): Promise<CalendlyListResult<CalendlyEventType>> {
    try {
      const { error, value } = CalendlyApiParamsJoiSchema.validate(params)
      if (error) {
        throw new MCPError(MCPErrorCode.InvalidParams, error.message)
      }

      if (!value.user) {
        throw new MCPError(MCPErrorCode.InvalidParams, 'User URI is required')
      }

      const cleanParams = this.cleanParams(value)
      const response = await this.client.get<any>('/event_types', { params: cleanParams })
      
      const listResponse = CalendlyListResponseSchema(CalendlyEventTypeSchema).parse(response.data)
      
      return {
        items: listResponse.collection,
        pagination: {
          count: listResponse.pagination.count,
          next_page_token: listResponse.pagination.next_page_token,
          previous_page_token: listResponse.pagination.previous_page_token,
          has_more: !!listResponse.pagination.next_page_token
        }
      }
    } catch (error) {
      this.logger.error('Failed to list event types', { params, error })
      throw error
    }
  }

  public async getEventType(eventTypeUuid: string): Promise<CalendlyEventType> {
    try {
      if (!this.isValidUuid(eventTypeUuid)) {
        throw new MCPError(MCPErrorCode.InvalidParams, 'Invalid event type UUID')
      }

      const response = await this.client.get<{ resource: CalendlyEventType }>(`/event_types/${eventTypeUuid}`)
      return CalendlyEventTypeSchema.parse(response.data.resource)
    } catch (error) {
      this.logger.error('Failed to get event type', { eventTypeUuid, error })
      throw error
    }
  }

  // ===== INVITEE METHODS =====

  public async listEventInvitees(eventUuid: string, params: CalendlyApiParams = {}): Promise<CalendlyListResult<CalendlyInvitee>> {
    try {
      if (!this.isValidUuid(eventUuid)) {
        throw new MCPError(MCPErrorCode.InvalidParams, 'Invalid event UUID')
      }

      const { error, value } = CalendlyApiParamsJoiSchema.validate(params)
      if (error) {
        throw new MCPError(MCPErrorCode.InvalidParams, error.message)
      }

      const cleanParams = this.cleanParams(value)
      const response = await this.client.get<any>(`/scheduled_events/${eventUuid}/invitees`, { params: cleanParams })
      
      const listResponse = CalendlyListResponseSchema(CalendlyInviteeSchema).parse(response.data)
      
      return {
        items: listResponse.collection,
        pagination: {
          count: listResponse.pagination.count,
          next_page_token: listResponse.pagination.next_page_token,
          previous_page_token: listResponse.pagination.previous_page_token,
          has_more: !!listResponse.pagination.next_page_token
        }
      }
    } catch (error) {
      this.logger.error('Failed to list event invitees', { eventUuid, params, error })
      throw error
    }
  }

  public async getInvitee(inviteeUuid: string): Promise<CalendlyInvitee> {
    try {
      if (!this.isValidUuid(inviteeUuid)) {
        throw new MCPError(MCPErrorCode.InvalidParams, 'Invalid invitee UUID')
      }

      const response = await this.client.get<{ resource: CalendlyInvitee }>(`/scheduled_events/invitees/${inviteeUuid}`)
      return CalendlyInviteeSchema.parse(response.data.resource)
    } catch (error) {
      this.logger.error('Failed to get invitee', { inviteeUuid, error })
      throw error
    }
  }

  // ===== WEBHOOK METHODS =====

  public async createWebhook(params: {
    url: string
    events: string[]
    organization?: string
    user?: string
    scope?: 'user' | 'organization'
  }): Promise<any> {
    try {
      const response = await this.client.post<{ resource: any }>('/webhook_subscriptions', params)
      return response.data.resource
    } catch (error) {
      this.logger.error('Failed to create webhook', { params, error })
      throw error
    }
  }

  public async listWebhooks(params: {
    organization?: string
    user?: string
    scope?: 'user' | 'organization'
  } = {}): Promise<CalendlyListResult<any>> {
    try {
      const cleanParams = this.cleanParams(params)
      const response = await this.client.get<any>('/webhook_subscriptions', { params: cleanParams })
      
      return {
        items: response.data.collection || [],
        pagination: {
          count: response.data.pagination?.count || 0,
          next_page_token: response.data.pagination?.next_page_token,
          previous_page_token: response.data.pagination?.previous_page_token,
          has_more: !!response.data.pagination?.next_page_token
        }
      }
    } catch (error) {
      this.logger.error('Failed to list webhooks', { params, error })
      throw error
    }
  }

  public async deleteWebhook(webhookUuid: string): Promise<void> {
    try {
      if (!this.isValidUuid(webhookUuid)) {
        throw new MCPError(MCPErrorCode.InvalidParams, 'Invalid webhook UUID')
      }

      await this.client.delete(`/webhook_subscriptions/${webhookUuid}`)
    } catch (error) {
      this.logger.error('Failed to delete webhook', { webhookUuid, error })
      throw error
    }
  }

  // ===== AVAILABILITY METHODS =====

  public async listAvailabilitySchedules(userUri: string): Promise<CalendlyListResult<any>> {
    try {
      const response = await this.client.get<any>('/user_availability_schedules', {
        params: { user: userUri }
      })
      
      return {
        items: response.data.collection || [],
        pagination: {
          count: response.data.pagination?.count || 0,
          next_page_token: response.data.pagination?.next_page_token,
          previous_page_token: response.data.pagination?.previous_page_token,
          has_more: !!response.data.pagination?.next_page_token
        }
      }
    } catch (error) {
      this.logger.error('Failed to list availability schedules', { userUri, error })
      throw error
    }
  }

  // ===== ENTERPRISE FEATURES =====

  public async getOrganizationMembers(): Promise<CalendlyListResult<CalendlyUser>> {
    try {
      if (!this.config.organizationUri) {
        throw new MCPError(MCPErrorCode.InvalidParams, 'Organization URI not configured')
      }

      const orgId = this.extractUuidFromUri(this.config.organizationUri)
      const response = await this.client.get<any>(`/organizations/${orgId}/memberships`)
      
      const users = response.data.collection?.map((membership: any) => membership.user) || []
      
      return {
        items: users.map((user: any) => CalendlyUserSchema.parse(user)),
        pagination: {
          count: response.data.pagination?.count || 0,
          next_page_token: response.data.pagination?.next_page_token,
          previous_page_token: response.data.pagination?.previous_page_token,
          has_more: !!response.data.pagination?.next_page_token
        }
      }
    } catch (error) {
      this.logger.error('Failed to get organization members', { error })
      throw error
    }
  }

  public async getOrganizationEvents(params: CalendlyApiParams = {}): Promise<CalendlyListResult<CalendlyEvent>> {
    try {
      if (!this.config.organizationUri) {
        throw new MCPError(MCPErrorCode.InvalidParams, 'Organization URI not configured')
      }

      const paramsWithOrg = {
        ...params,
        organization: this.config.organizationUri
      }

      return this.listEvents(paramsWithOrg)
    } catch (error) {
      this.logger.error('Failed to get organization events', { params, error })
      throw error
    }
  }

  // ===== UTILITY METHODS =====

  private extractUuidFromUri(uri: string): string {
    const parts = uri.split('/')
    return parts[parts.length - 1]
  }

  private isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  private cleanParams(params: any): Record<string, any> {
    const cleaned: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = value
      }
    }
    
    return cleaned
  }

  // ===== CONNECTION TESTING =====

  public async testConnection(): Promise<{
    success: boolean
    user?: CalendlyUser
    organization?: any
    error?: string
  }> {
    try {
      const user = await this.getCurrentUser()
      
      let organization = null
      if (this.config.organizationUri) {
        try {
          const orgId = this.extractUuidFromUri(this.config.organizationUri)
          const response = await this.client.get(`/organizations/${orgId}`)
          organization = response.data.resource
        } catch (error) {
          this.logger.warn('Failed to get organization info', { error })
        }
      }

      return {
        success: true,
        user,
        organization
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // ===== METRICS & MONITORING =====

  public getClientMetrics(): {
    requests_sent: number
    errors: number
    average_response_time: number
  } {
    // In a real implementation, you would track these metrics
    return {
      requests_sent: 0,
      errors: 0,
      average_response_time: 0
    }
  }
}