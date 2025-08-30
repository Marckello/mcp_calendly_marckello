module.exports = {
  apps: [
    {
      name: 'calendly-enhanced-server',
      script: 'enhanced-server.cjs',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 5
    }
  ]
}