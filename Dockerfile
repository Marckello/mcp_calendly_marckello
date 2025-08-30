# ===== MCP Calendly Streaming Server Dockerfile =====
# Optimized for EasyPanel deployment with robust dependency installation

# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy package files first (for better Docker layer caching)
COPY package*.json ./

# Install dependencies with fallback strategy
# Try npm ci first (faster, more reliable), fallback to npm install if no lock file
RUN if [ -f package-lock.json ]; then \
        echo "Using npm ci with package-lock.json" && \
        npm ci --omit=dev; \
    else \
        echo "No package-lock.json found, using npm install" && \
        npm install --omit=dev; \
    fi && \
    npm cache clean --force

# Copy application code
COPY . .

# Remove development files and sensitive data
RUN rm -f .env .env.* *.backup *.bak

# Set correct permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "streaming-server.cjs"]