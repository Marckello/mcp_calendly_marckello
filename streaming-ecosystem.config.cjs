module.exports = {
  apps: [
    {
      name: 'calendly-streaming-server',
      script: 'streaming-server.cjs',
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