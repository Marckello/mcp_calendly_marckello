module.exports = {
  apps: [
    {
      name: 'webapp',
      script: 'src/mcp-server-minimal.ts',
      interpreter: 'npx',
      interpreter_args: 'tsx',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        CALENDLY_ACCESS_TOKEN: 'test_token_for_mcp_endpoint',
        CALENDLY_API_BASE_URL: 'https://api.calendly.com',
        CALENDLY_ORGANIZATION_URI: 'https://api.calendly.com/organizations/test-org',
        JWT_SECRET: 'test_jwt_secret_for_development_only_32_chars_minimum',
        ENCRYPTION_KEY: 'test_encryption_key_for_development_only_32_chars',
        MAX_CONNECTIONS: 1000,
        HEARTBEAT_INTERVAL: 30000,
        CONNECTION_TIMEOUT: 60000,
        RATE_LIMIT_REQUESTS_PER_MINUTE: 60,
        RATE_LIMIT_BURST: 10,
        LOG_LEVEL: 'info',
        LOG_RETENTION_DAYS: 90,
        CORS_ORIGINS: 'http://localhost:3000,https://localhost:3000'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      ignore_watch: ['node_modules', 'logs', '.git'],
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log'
    }
  ]
}