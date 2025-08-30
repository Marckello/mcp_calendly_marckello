import { Request, Response, NextFunction } from 'express'
import { Logger } from 'winston'
import { SecurityService } from '../services/security-service.js'
import { AuditService } from '../services/audit-service.js'
import { MCPError, MCPErrorCode } from '../types/mcp-streaming.js'

// ===== SECURITY MIDDLEWARE =====

export function setupMiddleware(
  securityService: SecurityService,
  auditService: AuditService,
  logger: Logger
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now()
    const requestId = require('crypto').randomUUID()
    
    // Add request ID to headers
    res.setHeader('X-Request-ID', requestId)
    
    try {
      // Skip security validation for health checks and static files
      if (req.path === '/health' || req.path.startsWith('/static/')) {
        return next()
      }

      // Get client information
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown'
      const userAgent = req.headers['user-agent'] || 'unknown'
      
      // Validate connection and get security context
      const securityContext = await securityService.validateConnection(
        clientIP,
        userAgent,
        req.query
      )

      // Add security context to request
      ;(req as any).securityContext = securityContext
      ;(req as any).requestId = requestId

      // Audit log for request
      await auditService.log({
        connection_id: requestId,
        action: 'connect',
        details: {
          method: req.method,
          path: req.path,
          client_ip: clientIP,
          user_agent: userAgent,
          query_params: req.query
        },
        security_context: securityContext,
        result: 'success'
      })

      next()

    } catch (error) {
      const duration = Date.now() - startTime

      logger.error('Security middleware error', {
        request_id: requestId,
        path: req.path,
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: duration
      })

      // Log security violation
      if (error instanceof MCPError) {
        await auditService.logSecurityViolation(
          requestId,
          'middleware_validation',
          {
            error_code: error.code,
            error_message: error.message,
            client_ip: req.ip,
            path: req.path,
            method: req.method
          },
          {
            session_id: requestId,
            permissions: [],
            rate_limit: { requests_per_minute: 0, burst_limit: 0 },
            encrypted_tokens: {},
            created_at: new Date(),
            expires_at: new Date()
          }
        )

        // Return appropriate error response
        if (error.code === MCPErrorCode.RateLimitExceeded) {
          return res.status(429).json({
            error: 'Rate Limit Exceeded',
            message: error.message,
            retry_after: error.data?.retry_after || 60,
            request_id: requestId
          })
        }

        return res.status(401).json({
          error: 'Unauthorized',
          message: error.message,
          request_id: requestId
        })
      }

      // Generic error response
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Security validation failed',
        request_id: requestId
      })
    }
  }
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const securityContext = (req as any).securityContext

    if (!securityContext || !securityContext.permissions.includes(permission)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Permission required: ${permission}`,
        request_id: (req as any).requestId
      })
      return
    }

    next()
  }
}