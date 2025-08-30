# ===== MULTI-STAGE DOCKERFILE FOR ENTERPRISE MCP CALENDLY STREAMING =====

# ===== BUILDER STAGE =====
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json tsconfig.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci --include=dev

# Copy source code
COPY src/ ./src/

# Build the TypeScript project
RUN npm run build

# ===== PRODUCTION STAGE =====
FROM node:20-alpine AS production

# Install runtime dependencies and security tools
RUN apk add --no-cache \
    dumb-init \
    curl \
    tini \
    && addgroup -g 1001 -S nodejs \
    && adduser -S mcpserver -u 1001 -G nodejs

# Create app directory with proper ownership
WORKDIR /app
RUN chown -R mcpserver:nodejs /app

# Switch to non-root user
USER mcpserver

# Copy package files and install only production dependencies
COPY --chown=mcpserver:nodejs package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=mcpserver:nodejs /app/dist ./dist

# Copy configuration files
COPY --chown=mcpserver:nodejs .env.example ./

# Create necessary directories
RUN mkdir -p logs && chmod 755 logs

# Set environment variables
ENV NODE_ENV=production \
    HTTP_MODE=true \
    PORT=3000 \
    LOG_LEVEL=info \
    MAX_CONNECTIONS=1000 \
    HEARTBEAT_INTERVAL=30000 \
    CONNECTION_TIMEOUT=60000

# Expose port
EXPOSE 3000

# Health check with comprehensive validation
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health \
        || exit 1

# Labels for metadata
LABEL name="mcp-calendly-streaming" \
      version="1.0.0" \
      description="Enterprise MCP Calendly Streaming Server" \
      maintainer="Marckello" \
      architecture="multi-arch" \
      runtime="node:20-alpine"

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["tini", "--"]

# Start the application
CMD ["node", "dist/server.js"]

# ===== DEVELOPMENT STAGE =====
FROM node:20-alpine AS development

# Install development tools
RUN apk add --no-cache \
    git \
    curl \
    vim \
    && addgroup -g 1001 -S nodejs \
    && adduser -S mcpserver -u 1001 -G nodejs

WORKDIR /app
RUN chown -R mcpserver:nodejs /app

USER mcpserver

# Copy package files
COPY --chown=mcpserver:nodejs package*.json tsconfig.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy source code
COPY --chown=mcpserver:nodejs . .

# Create logs directory
RUN mkdir -p logs

# Set development environment
ENV NODE_ENV=development \
    LOG_LEVEL=debug \
    PORT=3000

EXPOSE 3000

# Development health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=2 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Development command with hot reload
CMD ["npm", "run", "dev"]