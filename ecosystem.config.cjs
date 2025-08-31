module.exports = {
  apps: [
    {
      name: 'mcp-woocommerce-server',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        HOST: '0.0.0.0'
      },
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git'],
      log_file: './logs/mcp-server.log',
      out_file: './logs/mcp-server-out.log',
      error_file: './logs/mcp-server-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '500M',
      restart_delay: 5000
    }
  ]
}