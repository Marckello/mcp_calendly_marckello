module.exports = {
  apps: [
    {
      name: 'calendly-test-server',
      script: 'dist/simple-server.js',
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