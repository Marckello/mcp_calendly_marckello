import { Logger } from 'winston'
import { v4 as uuidv4 } from 'uuid'
import {
  AuditLog,
  SecurityContext
} from '../types/mcp-streaming.js'

// ===== ENTERPRISE AUDIT SERVICE =====

export interface AuditServiceConfig {
  retentionDays: number
  logSensitiveData: boolean
  batchSize: number
  flushIntervalMs: number
  alertThresholds: {
    errorRate: number // errors per minute to trigger alert
    suspiciousActivity: number // suspicious actions per hour
  }
}

export interface AuditEvent {
  connection_id: string
  action: 'connect' | 'disconnect' | 'tool_call' | 'error' | 'rate_limit' | 'security_violation'
  details: Record<string, any>
  security_context: SecurityContext
  result: 'success' | 'failure' | 'blocked'
  duration_ms?: number
}

export interface AuditStats {
  total_events: number
  events_by_action: Record<string, number>
  events_by_result: Record<string, number>
  error_rate_per_minute: number
  suspicious_activity_count: number
  top_connections: Array<{ connection_id: string; event_count: number }>
  time_range: {
    start: Date
    end: Date
  }
}

export class AuditService {
  private auditBuffer: AuditLog[] = []
  private auditStats = new Map<string, number>() // Action/result counters
  private connectionActivity = new Map<string, number>() // Connection event counts
  private errorTimestamps: Date[] = []
  private suspiciousActivityTimestamps: Date[] = []
  private flushInterval: NodeJS.Timeout

  constructor(
    private logger: Logger,
    private config: AuditServiceConfig = {
      retentionDays: 90,
      logSensitiveData: false,
      batchSize: 100,
      flushIntervalMs: 30000, // 30 seconds
      alertThresholds: {
        errorRate: 10, // 10 errors per minute
        suspiciousActivity: 5 // 5 suspicious actions per hour
      }
    }
  ) {
    this.setupPeriodicFlush()
    this.setupStatsCleanup()
  }

  // ===== AUDIT LOGGING =====

  public async log(event: AuditEvent): Promise<void> {
    try {
      const auditLog: AuditLog = {
        id: uuidv4(),
        timestamp: new Date(),
        connection_id: event.connection_id,
        action: event.action,
        details: this.sanitizeDetails(event.details),
        security_context: event.security_context,
        result: event.result,
        duration_ms: event.duration_ms
      }

      // Add to buffer
      this.auditBuffer.push(auditLog)

      // Update statistics
      this.updateStats(auditLog)

      // Track connection activity
      this.trackConnectionActivity(event.connection_id)

      // Check for alerts
      await this.checkAlertThresholds(auditLog)

      // Structured logging
      this.logger.info('Audit event recorded', {
        audit_id: auditLog.id,
        connection_id: event.connection_id,
        action: event.action,
        result: event.result,
        duration_ms: event.duration_ms,
        session_id: event.security_context.session_id
      })

      // Flush buffer if it's full
      if (this.auditBuffer.length >= this.config.batchSize) {
        await this.flush()
      }

    } catch (error) {
      this.logger.error('Failed to log audit event', {
        connection_id: event.connection_id,
        action: event.action,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // ===== SECURITY MONITORING =====

  public async logSecurityViolation(
    connectionId: string,
    violationType: string,
    details: Record<string, any>,
    securityContext: SecurityContext
  ): Promise<void> {
    // Track suspicious activity
    this.suspiciousActivityTimestamps.push(new Date())

    await this.log({
      connection_id: connectionId,
      action: 'security_violation',
      details: {
        violation_type: violationType,
        ...details
      },
      security_context: securityContext,
      result: 'blocked'
    })

    // Immediate alert for security violations
    this.logger.warn('Security violation detected', {
      connection_id: connectionId,
      violation_type: violationType,
      client_ip: details.client_ip,
      session_id: securityContext.session_id
    })
  }

  public async logRateLimitExceeded(
    connectionId: string,
    limitType: 'burst' | 'window',
    currentRate: number,
    limit: number,
    securityContext: SecurityContext
  ): Promise<void> {
    await this.log({
      connection_id: connectionId,
      action: 'rate_limit',
      details: {
        limit_type: limitType,
        current_rate: currentRate,
        limit: limit,
        exceeded_by: currentRate - limit
      },
      security_context: securityContext,
      result: 'blocked'
    })
  }

  public async logToolExecution(
    connectionId: string,
    toolName: string,
    arguments_: any,
    result: 'success' | 'failure',
    durationMs: number,
    securityContext: SecurityContext,
    error?: string
  ): Promise<void> {
    const details: any = {
      tool_name: toolName,
      arguments_count: arguments_ ? Object.keys(arguments_).length : 0
    }

    // Only log argument values if configured and not sensitive
    if (this.config.logSensitiveData) {
      details.arguments = arguments_
    }

    if (error) {
      details.error = error
    }

    await this.log({
      connection_id: connectionId,
      action: 'tool_call',
      details,
      security_context: securityContext,
      result,
      duration_ms: durationMs
    })
  }

  // ===== AUDIT ANALYSIS =====

  public getAuditStats(timeRangeHours = 24): AuditStats {
    const now = new Date()
    const startTime = new Date(now.getTime() - (timeRangeHours * 60 * 60 * 1000))

    // Filter recent audit logs
    const recentLogs = this.auditBuffer.filter(log => log.timestamp >= startTime)

    // Calculate statistics
    const eventsByAction: Record<string, number> = {}
    const eventsByResult: Record<string, number> = {}
    const connectionCounts: Record<string, number> = {}

    recentLogs.forEach(log => {
      // Count by action
      eventsByAction[log.action] = (eventsByAction[log.action] || 0) + 1

      // Count by result
      eventsByResult[log.result] = (eventsByResult[log.result] || 0) + 1

      // Count by connection
      connectionCounts[log.connection_id] = (connectionCounts[log.connection_id] || 0) + 1
    })

    // Calculate error rate per minute
    const errorLogs = recentLogs.filter(log => log.result === 'failure' || log.result === 'blocked')
    const errorRatePerMinute = errorLogs.length / (timeRangeHours * 60)

    // Get top connections
    const topConnections = Object.entries(connectionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([connection_id, event_count]) => ({ connection_id, event_count }))

    // Count suspicious activities in the last hour
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000))
    const recentSuspiciousActivity = this.suspiciousActivityTimestamps.filter(
      timestamp => timestamp >= oneHourAgo
    ).length

    return {
      total_events: recentLogs.length,
      events_by_action: eventsByAction,
      events_by_result: eventsByResult,
      error_rate_per_minute: Math.round(errorRatePerMinute * 100) / 100,
      suspicious_activity_count: recentSuspiciousActivity,
      top_connections: topConnections,
      time_range: {
        start: startTime,
        end: now
      }
    }
  }

  public getConnectionAuditTrail(connectionId: string, limit = 100): AuditLog[] {
    return this.auditBuffer
      .filter(log => log.connection_id === connectionId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  public searchAuditLogs(filters: {
    action?: string
    result?: 'success' | 'failure' | 'blocked'
    connection_id?: string
    time_range?: { start: Date; end: Date }
    limit?: number
  }): AuditLog[] {
    let filteredLogs = [...this.auditBuffer]

    // Apply filters
    if (filters.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filters.action)
    }

    if (filters.result) {
      filteredLogs = filteredLogs.filter(log => log.result === filters.result)
    }

    if (filters.connection_id) {
      filteredLogs = filteredLogs.filter(log => log.connection_id === filters.connection_id)
    }

    if (filters.time_range) {
      filteredLogs = filteredLogs.filter(log => 
        log.timestamp >= filters.time_range!.start && 
        log.timestamp <= filters.time_range!.end
      )
    }

    // Sort by timestamp (newest first) and limit
    return filteredLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, filters.limit || 1000)
  }

  // ===== ALERT MONITORING =====

  private async checkAlertThresholds(auditLog: AuditLog): Promise<void> {
    // Check error rate threshold
    if (auditLog.result === 'failure' || auditLog.result === 'blocked') {
      this.errorTimestamps.push(auditLog.timestamp)
      await this.checkErrorRateAlert()
    }

    // Check for suspicious patterns
    if (auditLog.action === 'security_violation') {
      await this.checkSuspiciousActivityAlert()
    }
  }

  private async checkErrorRateAlert(): Promise<void> {
    const oneMinuteAgo = new Date(Date.now() - 60000)
    const recentErrors = this.errorTimestamps.filter(timestamp => timestamp >= oneMinuteAgo)

    if (recentErrors.length >= this.config.alertThresholds.errorRate) {
      this.logger.error('High error rate alert triggered', {
        errors_per_minute: recentErrors.length,
        threshold: this.config.alertThresholds.errorRate,
        alert_type: 'error_rate'
      })

      // In production, you would send this to alerting system (PagerDuty, Slack, etc.)
    }
  }

  private async checkSuspiciousActivityAlert(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 3600000)
    const recentSuspicious = this.suspiciousActivityTimestamps.filter(
      timestamp => timestamp >= oneHourAgo
    )

    if (recentSuspicious.length >= this.config.alertThresholds.suspiciousActivity) {
      this.logger.error('Suspicious activity alert triggered', {
        suspicious_events_per_hour: recentSuspicious.length,
        threshold: this.config.alertThresholds.suspiciousActivity,
        alert_type: 'suspicious_activity'
      })
    }
  }

  // ===== DATA MANAGEMENT =====

  private async flush(): Promise<void> {
    if (this.auditBuffer.length === 0) return

    try {
      // In production, you would persist to database here
      const batchSize = this.auditBuffer.length
      
      this.logger.debug('Flushing audit logs', {
        batch_size: batchSize,
        buffer_size_before: this.auditBuffer.length
      })

      // For now, just clear the buffer (in production, save to DB first)
      this.auditBuffer = []

      this.logger.debug('Audit logs flushed successfully', {
        flushed_count: batchSize
      })

    } catch (error) {
      this.logger.error('Failed to flush audit logs', {
        error: error instanceof Error ? error.message : 'Unknown error',
        buffer_size: this.auditBuffer.length
      })
    }
  }

  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    if (this.config.logSensitiveData) {
      return details
    }

    const sanitized = { ...details }

    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'access_token',
      'refresh_token'
    ]

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject)
      }

      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase()
        
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          result[key] = '[REDACTED]'
        } else if (typeof value === 'object' && value !== null) {
          result[key] = sanitizeObject(value)
        } else {
          result[key] = value
        }
      }
      return result
    }

    return sanitizeObject(sanitized)
  }

  private updateStats(auditLog: AuditLog): void {
    // Update action counters
    const actionKey = `action:${auditLog.action}`
    this.auditStats.set(actionKey, (this.auditStats.get(actionKey) || 0) + 1)

    // Update result counters
    const resultKey = `result:${auditLog.result}`
    this.auditStats.set(resultKey, (this.auditStats.get(resultKey) || 0) + 1)
  }

  private trackConnectionActivity(connectionId: string): void {
    this.connectionActivity.set(connectionId, (this.connectionActivity.get(connectionId) || 0) + 1)
  }

  private setupPeriodicFlush(): void {
    this.flushInterval = setInterval(async () => {
      await this.flush()
    }, this.config.flushIntervalMs)
  }

  private setupStatsCleanup(): void {
    // Clean up old timestamps every hour
    setInterval(() => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 3600000)
      const oneDayAgo = new Date(now.getTime() - 86400000)

      // Clean error timestamps (keep last 24 hours)
      this.errorTimestamps = this.errorTimestamps.filter(timestamp => timestamp >= oneDayAgo)

      // Clean suspicious activity timestamps (keep last 24 hours)
      this.suspiciousActivityTimestamps = this.suspiciousActivityTimestamps.filter(
        timestamp => timestamp >= oneDayAgo
      )

      // Clean audit buffer based on retention policy
      const retentionCutoff = new Date(now.getTime() - (this.config.retentionDays * 24 * 60 * 60 * 1000))
      const originalSize = this.auditBuffer.length
      this.auditBuffer = this.auditBuffer.filter(log => log.timestamp >= retentionCutoff)

      if (originalSize !== this.auditBuffer.length) {
        this.logger.info('Audit log cleanup completed', {
          removed_logs: originalSize - this.auditBuffer.length,
          remaining_logs: this.auditBuffer.length,
          retention_days: this.config.retentionDays
        })
      }

    }, 60 * 60 * 1000) // Every hour
  }

  // ===== EXPORT & REPORTING =====

  public exportAuditLogs(filters?: {
    start_date?: Date
    end_date?: Date
    connection_id?: string
    action?: string
  }): AuditLog[] {
    let logs = [...this.auditBuffer]

    if (filters) {
      if (filters.start_date) {
        logs = logs.filter(log => log.timestamp >= filters.start_date!)
      }
      if (filters.end_date) {
        logs = logs.filter(log => log.timestamp <= filters.end_date!)
      }
      if (filters.connection_id) {
        logs = logs.filter(log => log.connection_id === filters.connection_id)
      }
      if (filters.action) {
        logs = logs.filter(log => log.action === filters.action)
      }
    }

    return logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }

  public generateSecurityReport(timeRangeHours = 24): {
    summary: AuditStats
    security_violations: AuditLog[]
    rate_limit_incidents: AuditLog[]
    error_analysis: { most_common_errors: Array<{ error: string; count: number }> }
  } {
    const stats = this.getAuditStats(timeRangeHours)
    const timeRange = stats.time_range

    const securityViolations = this.searchAuditLogs({
      action: 'security_violation',
      time_range: timeRange,
      limit: 100
    })

    const rateLimitIncidents = this.searchAuditLogs({
      action: 'rate_limit',
      time_range: timeRange,
      limit: 100
    })

    // Analyze common errors
    const errorLogs = this.searchAuditLogs({
      result: 'failure',
      time_range: timeRange,
      limit: 1000
    })

    const errorCounts: Record<string, number> = {}
    errorLogs.forEach(log => {
      const error = log.details.error || 'Unknown error'
      errorCounts[error] = (errorCounts[error] || 0) + 1
    })

    const mostCommonErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }))

    return {
      summary: stats,
      security_violations: securityViolations,
      rate_limit_incidents: rateLimitIncidents,
      error_analysis: {
        most_common_errors: mostCommonErrors
      }
    }
  }

  // ===== SHUTDOWN =====

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down audit service...')

    // Clear intervals
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }

    // Final flush
    await this.flush()

    this.logger.info('Audit service shutdown completed')
  }
}