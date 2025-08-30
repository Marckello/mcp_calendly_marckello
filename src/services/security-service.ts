import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { Logger } from 'winston'
import {
  SecurityContext,
  MCPError,
  MCPErrorCode
} from '../types/mcp-streaming.js'
import {
  OAuthConfig,
  SecurityConfig
} from '../types/calendly-enterprise.js'

// ===== ENTERPRISE SECURITY SERVICE =====

export interface RateLimitEntry {
  requests: number
  windowStart: number
  burstCount: number
  lastRequest: number
}

export interface EncryptionKeys {
  primary: Buffer
  secondary: Buffer
  rotationDate: Date
}

export class SecurityService {
  private rateLimitStore = new Map<string, RateLimitEntry>()
  private encryptionKeys: EncryptionKeys
  private blacklistedIPs = new Set<string>()
  private trustedProxies = new Set<string>(['127.0.0.1', '::1'])
  
  constructor(
    private logger: Logger,
    private config: SecurityConfig,
    private jwtSecret: string = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex')
  ) {
    this.initializeEncryptionKeys()
    this.setupRateLimitCleanup()
    this.setupKeyRotation()
  }

  // ===== CONNECTION VALIDATION =====

  public async validateConnection(
    clientIP: string,
    userAgent: string,
    queryParams: any
  ): Promise<SecurityContext> {
    const sessionId = crypto.randomUUID()

    try {
      // 1. IP Address Validation
      await this.validateIPAddress(clientIP)

      // 2. Rate Limit Check
      await this.checkRateLimit(clientIP)

      // 3. User Agent Validation
      this.validateUserAgent(userAgent)

      // 4. Query Parameter Validation
      const validatedParams = await this.validateQueryParams(queryParams)

      // 5. Generate Security Context
      const securityContext: SecurityContext = {
        session_id: sessionId,
        permissions: this.determinePermissions(validatedParams),
        rate_limit: {
          requests_per_minute: this.config.rate_limiting.requests_per_minute,
          burst_limit: this.config.rate_limiting.burst_limit
        },
        encrypted_tokens: await this.generateEncryptedTokens(validatedParams),
        created_at: new Date(),
        expires_at: new Date(Date.now() + (this.config.encryption.token_expiry_hours * 60 * 60 * 1000))
      }

      this.logger.info('Connection validated successfully', {
        session_id: sessionId,
        client_ip: clientIP,
        permissions: securityContext.permissions.length
      })

      return securityContext

    } catch (error) {
      this.logger.warn('Connection validation failed', {
        session_id: sessionId,
        client_ip: clientIP,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      throw new MCPError(
        MCPErrorCode.AuthenticationFailed,
        'Connection validation failed',
        { session_id: sessionId }
      )
    }
  }

  // ===== OAUTH 1.0A IMPLEMENTATION =====

  public generateOAuthSignature(
    method: string,
    url: string,
    params: Record<string, string>,
    config: OAuthConfig,
    tokenSecret?: string
  ): string {
    try {
      // 1. Create parameter string
      const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${this.percentEncode(key)}=${this.percentEncode(params[key])}`)
        .join('&')

      // 2. Create signature base string
      const baseString = [
        method.toUpperCase(),
        this.percentEncode(url),
        this.percentEncode(sortedParams)
      ].join('&')

      // 3. Create signing key
      const signingKey = [
        this.percentEncode(config.consumer_secret),
        this.percentEncode(tokenSecret || '')
      ].join('&')

      // 4. Generate signature
      let signature: string
      if (config.signature_method === 'HMAC-SHA256') {
        signature = crypto
          .createHmac('sha256', signingKey)
          .update(baseString)
          .digest('base64')
      } else {
        // Default to HMAC-SHA1
        signature = crypto
          .createHmac('sha1', signingKey)
          .update(baseString)
          .digest('base64')
      }

      this.logger.debug('OAuth signature generated', {
        method,
        signature_method: config.signature_method,
        base_string_length: baseString.length
      })

      return signature

    } catch (error) {
      this.logger.error('OAuth signature generation failed', {
        method,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      throw new MCPError(
        MCPErrorCode.AuthenticationFailed,
        'OAuth signature generation failed'
      )
    }
  }

  public validateOAuthSignature(
    receivedSignature: string,
    expectedSignature: string
  ): boolean {
    try {
      // Constant-time comparison to prevent timing attacks
      const receivedBuffer = Buffer.from(receivedSignature, 'base64')
      const expectedBuffer = Buffer.from(expectedSignature, 'base64')

      if (receivedBuffer.length !== expectedBuffer.length) {
        return false
      }

      return crypto.timingSafeEqual(receivedBuffer, expectedBuffer)

    } catch (error) {
      this.logger.warn('OAuth signature validation error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  // ===== RATE LIMITING =====

  public async checkRateLimit(identifier: string): Promise<void> {
    const now = Date.now()
    const windowMs = this.config.rate_limiting.window_ms
    const maxRequests = this.config.rate_limiting.requests_per_minute
    const burstLimit = this.config.rate_limiting.burst_limit

    let entry = this.rateLimitStore.get(identifier)

    if (!entry) {
      entry = {
        requests: 0,
        windowStart: now,
        burstCount: 0,
        lastRequest: 0
      }
    }

    // Check if we're in a new window
    if (now - entry.windowStart >= windowMs) {
      entry.requests = 0
      entry.windowStart = now
      entry.burstCount = 0
    }

    // Check burst limit (requests per second)
    const timeSinceLastRequest = now - entry.lastRequest
    if (timeSinceLastRequest < 1000) {
      entry.burstCount++
      if (entry.burstCount > burstLimit) {
        this.logger.warn('Burst rate limit exceeded', {
          identifier,
          burst_count: entry.burstCount,
          limit: burstLimit
        })

        throw new MCPError(
          MCPErrorCode.RateLimitExceeded,
          'Burst rate limit exceeded',
          {
            retry_after: 1,
            limit_type: 'burst'
          }
        )
      }
    } else {
      entry.burstCount = 0
    }

    // Check window limit
    entry.requests++
    entry.lastRequest = now

    if (entry.requests > maxRequests) {
      const retryAfter = Math.ceil((windowMs - (now - entry.windowStart)) / 1000)
      
      this.logger.warn('Rate limit exceeded', {
        identifier,
        requests: entry.requests,
        limit: maxRequests,
        retry_after: retryAfter
      })

      throw new MCPError(
        MCPErrorCode.RateLimitExceeded,
        'Rate limit exceeded',
        {
          retry_after: retryAfter,
          limit_type: 'window'
        }
      )
    }

    this.rateLimitStore.set(identifier, entry)
  }

  // ===== ENCRYPTION & TOKENS =====

  public encryptSensitiveData(data: string, useSecondaryKey = false): string {
    try {
      const key = useSecondaryKey ? this.encryptionKeys.secondary : this.encryptionKeys.primary
      const iv = crypto.randomBytes(16)
      
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      const authTag = cipher.getAuthTag().toString('hex')
      
      return `${iv.toString('hex')}:${encrypted}:${authTag}`

    } catch (error) {
      this.logger.error('Encryption failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new MCPError(MCPErrorCode.InternalError, 'Encryption failed')
    }
  }

  public decryptSensitiveData(encryptedData: string, useSecondaryKey = false): string {
    try {
      const parts = encryptedData.split(':')
      if (parts.length < 2) {
        throw new Error('Invalid encrypted data format')
      }

      const [ivHex, encrypted, authTagHex] = parts
      const key = useSecondaryKey ? this.encryptionKeys.secondary : this.encryptionKeys.primary
      const iv = Buffer.from(ivHex, 'hex')
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
      
      if (authTagHex) {
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
      }

      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted

    } catch (error) {
      this.logger.error('Decryption failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      // Try with secondary key if primary failed
      if (!useSecondaryKey) {
        try {
          return this.decryptSensitiveData(encryptedData, true)
        } catch {
          // Both keys failed
        }
      }

      throw new MCPError(MCPErrorCode.SecurityViolation, 'Decryption failed')
    }
  }

  public generateJWT(payload: any, expiresIn = '24h'): string {
    try {
      return jwt.sign(payload, this.jwtSecret, { 
        expiresIn,
        issuer: 'mcp-calendly-streaming',
        audience: 'mcp-client'
      })
    } catch (error) {
      this.logger.error('JWT generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new MCPError(MCPErrorCode.InternalError, 'Token generation failed')
    }
  }

  public validateJWT(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'mcp-calendly-streaming',
        audience: 'mcp-client'
      })
    } catch (error) {
      this.logger.warn('JWT validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      if (error instanceof jwt.TokenExpiredError) {
        throw new MCPError(MCPErrorCode.TokenExpired, 'Token has expired')
      }

      throw new MCPError(MCPErrorCode.AuthenticationFailed, 'Invalid token')
    }
  }

  // ===== PRIVATE METHODS =====

  private async validateIPAddress(clientIP: string): Promise<void> {
    // Remove proxy headers to get real IP
    const realIP = this.extractRealIP(clientIP)

    // Check blacklist
    if (this.blacklistedIPs.has(realIP)) {
      throw new MCPError(
        MCPErrorCode.SecurityViolation,
        'IP address is blacklisted'
      )
    }

    // Additional IP validation logic can be added here
    // e.g., geolocation checks, threat intelligence lookups
  }

  private validateUserAgent(userAgent: string): void {
    if (!userAgent || userAgent.trim().length === 0) {
      throw new MCPError(
        MCPErrorCode.SecurityViolation,
        'User agent is required'
      )
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i
    ]

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent))
    
    if (isSuspicious) {
      this.logger.warn('Suspicious user agent detected', { userAgent })
      // Could throw error or just log depending on policy
    }
  }

  private async validateQueryParams(params: any): Promise<any> {
    // Sanitize and validate query parameters
    const sanitized: any = {}

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // Basic XSS prevention
        const cleanValue = (value as string)
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .trim()

        if (cleanValue.length > 0) {
          sanitized[key] = cleanValue
        }
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  private determinePermissions(params: any): string[] {
    const permissions: string[] = ['mcp:connect']

    // Add permissions based on query parameters or context
    if (params.admin === 'true') {
      permissions.push('mcp:admin')
    }

    if (params.tools === 'true' || !params.tools) {
      permissions.push('mcp:tools:call', 'mcp:tools:list')
    }

    if (params.streaming === 'true') {
      permissions.push('mcp:streaming:subscribe')
    }

    return permissions
  }

  private async generateEncryptedTokens(params: any): Promise<Record<string, string>> {
    const tokens: Record<string, string> = {}

    // Generate session token
    const sessionData = {
      timestamp: Date.now(),
      random: crypto.randomBytes(16).toString('hex')
    }
    tokens.session = this.encryptSensitiveData(JSON.stringify(sessionData))

    // Generate access token if needed
    if (params.access_token) {
      tokens.access = this.encryptSensitiveData(params.access_token)
    }

    return tokens
  }

  private extractRealIP(clientIP: string): string {
    // Handle proxy headers (X-Forwarded-For, etc.)
    // This is a simplified version - in production, you'd want more robust handling
    return clientIP.split(',')[0].trim()
  }

  private percentEncode(str: string): string {
    return encodeURIComponent(str)
      .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
  }

  private initializeEncryptionKeys(): void {
    // In production, these should come from secure key management
    this.encryptionKeys = {
      primary: crypto.randomBytes(32),
      secondary: crypto.randomBytes(32),
      rotationDate: new Date()
    }

    this.logger.info('Encryption keys initialized')
  }

  private setupRateLimitCleanup(): void {
    // Clean up old rate limit entries every 5 minutes
    setInterval(() => {
      const now = Date.now()
      const cutoff = now - (this.config.rate_limiting.window_ms * 2)

      let cleanedCount = 0
      for (const [identifier, entry] of this.rateLimitStore.entries()) {
        if (entry.windowStart < cutoff) {
          this.rateLimitStore.delete(identifier)
          cleanedCount++
        }
      }

      if (cleanedCount > 0) {
        this.logger.debug('Rate limit store cleaned', {
          removed_entries: cleanedCount,
          remaining_entries: this.rateLimitStore.size
        })
      }
    }, 5 * 60 * 1000)
  }

  private setupKeyRotation(): void {
    // Rotate encryption keys based on configuration
    setInterval(() => {
      const daysSinceRotation = Math.floor(
        (Date.now() - this.encryptionKeys.rotationDate.getTime()) / (24 * 60 * 60 * 1000)
      )

      if (daysSinceRotation >= this.config.encryption.key_rotation_days) {
        // Move primary to secondary, generate new primary
        this.encryptionKeys.secondary = this.encryptionKeys.primary
        this.encryptionKeys.primary = crypto.randomBytes(32)
        this.encryptionKeys.rotationDate = new Date()

        this.logger.info('Encryption keys rotated', {
          days_since_last_rotation: daysSinceRotation
        })
      }
    }, 24 * 60 * 60 * 1000) // Check daily
  }

  // ===== PUBLIC UTILITY METHODS =====

  public addToBlacklist(ip: string): void {
    this.blacklistedIPs.add(ip)
    this.logger.warn('IP added to blacklist', { ip })
  }

  public removeFromBlacklist(ip: string): void {
    this.blacklistedIPs.delete(ip)
    this.logger.info('IP removed from blacklist', { ip })
  }

  public getRateLimitStatus(identifier: string): RateLimitEntry | null {
    return this.rateLimitStore.get(identifier) || null
  }

  public clearRateLimit(identifier: string): void {
    this.rateLimitStore.delete(identifier)
    this.logger.info('Rate limit cleared', { identifier })
  }
}