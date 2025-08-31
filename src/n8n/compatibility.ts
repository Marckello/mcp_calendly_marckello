import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../utils/logger.js';

/**
 * N8N Compatibility Layer for MCP Tools
 * Ensures all tool schemas are fully compatible with N8N's expected format
 */
export class N8nCompatibility {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Convert MCP tool schema to N8N-compatible format
   */
  convertToolForN8n(tool: Tool): any {
    const n8nTool = {
      name: tool.name,
      description: tool.description,
      schema: {
        type: 'object',
        properties: tool.inputSchema?.properties || {},
        required: tool.inputSchema?.required || [],
        additionalProperties: false
      }
    };

    // Ensure all properties have proper JSON Schema validation
    if (n8nTool.schema.properties) {
      Object.keys(n8nTool.schema.properties).forEach(key => {
        const property: any = n8nTool.schema.properties[key];
        
        // Add default values if missing
        if (!property.type) {
          property.type = 'string';
        }
        
        // Ensure proper format for N8N
        if (property.type === 'string' && !property.description) {
          property.description = `Input parameter: ${key}`;
        }
        
        // Handle enum values properly
        if (property.enum && Array.isArray(property.enum)) {
          property.enum = property.enum.map((val: any) => String(val));
        }
      });
    }

    this.logger.debug('Converted tool for N8N compatibility', { 
      toolName: tool.name, 
      originalSchema: tool.inputSchema,
      n8nSchema: n8nTool.schema 
    });

    return n8nTool;
  }

  /**
   * Validate tool input against N8N requirements
   */
  validateToolInput(toolName: string, input: any): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (typeof input !== 'object' || input === null) {
      errors.push('Input must be a valid object');
    }

    // Check for common N8N issues
    if (input && typeof input === 'object') {
      Object.keys(input).forEach(key => {
        const value = input[key];
        
        // N8N doesn't handle undefined values well
        if (value === undefined) {
          errors.push(`Property '${key}' is undefined - should be null or omitted`);
        }
        
        // Check for invalid characters in string values
        if (typeof value === 'string' && value.includes('\u0000')) {
          errors.push(`Property '${key}' contains null character`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Sanitize tool input for N8N processing
   */
  sanitizeToolInput(input: any): any {
    if (!input || typeof input !== 'object') {
      return {};
    }

    const sanitized: any = {};

    Object.keys(input).forEach(key => {
      const value = input[key];
      
      // Remove undefined values
      if (value === undefined) {
        return;
      }
      
      // Sanitize strings
      if (typeof value === 'string') {
        sanitized[key] = value.replace(/\u0000/g, '').trim();
      }
      // Handle arrays
      else if (Array.isArray(value)) {
        sanitized[key] = value.filter(item => item !== undefined);
      }
      // Handle objects
      else if (value && typeof value === 'object') {
        sanitized[key] = this.sanitizeToolInput(value);
      }
      // Handle primitives
      else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Format tool response for N8N compatibility
   */
  formatToolResponse(response: any): any {
    // Ensure response has proper structure for N8N
    if (!response || typeof response !== 'object') {
      return {
        success: false,
        error: 'Invalid response format',
        data: null
      };
    }

    // If it's already properly formatted, return as-is
    if (response.content && Array.isArray(response.content)) {
      return response;
    }

    // Convert to proper MCP response format
    return {
      content: [{
        type: 'text',
        text: typeof response === 'string' ? response : JSON.stringify(response, null, 2)
      }],
      isError: false
    };
  }

  /**
   * Create N8N-compatible error response
   */
  createErrorResponse(error: string | Error): any {
    const errorMessage = error instanceof Error ? error.message : error;
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: errorMessage,
          timestamp: new Date().toISOString()
        }, null, 2)
      }],
      isError: true
    };
  }

  /**
   * Get all available tools in N8N-compatible format
   */
  getN8nCompatibleTools(tools: Tool[]): any[] {
    return tools.map(tool => this.convertToolForN8n(tool));
  }

  /**
   * Process tool execution with N8N compatibility layer
   */
  async processToolExecution(
    toolName: string, 
    input: any, 
    originalHandler: (name: string, args: any) => Promise<any>
  ): Promise<any> {
    try {
      // Validate input
      const validation = this.validateToolInput(toolName, input);
      if (!validation.valid) {
        this.logger.error('N8N tool input validation failed', { 
          toolName, 
          input, 
          errors: validation.errors 
        });
        return this.createErrorResponse(`Input validation failed: ${validation.errors?.join(', ')}`);
      }

      // Sanitize input
      const sanitizedInput = this.sanitizeToolInput(input);
      
      // Execute original handler
      const result = await originalHandler(toolName, sanitizedInput);
      
      // Format response for N8N
      return this.formatToolResponse(result);
      
    } catch (error) {
      this.logger.error('N8N tool execution error', { 
        toolName, 
        input, 
        error: error instanceof Error ? error.message : error 
      });
      return this.createErrorResponse(error instanceof Error ? error : 'Unknown execution error');
    }
  }
}