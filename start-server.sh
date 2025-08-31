#!/bin/bash

# Load environment variables
source /home/user/webapp/.env

# Export them for the Node process
export CALENDLY_ACCESS_TOKEN
export NODE_ENV
export HTTP_MODE
export PORT
export HOST
export LOG_LEVEL
export ENABLE_CORS
export ENABLE_N8N
export ENABLE_WEBSOCKET
export ENABLE_SSE

# Start the server
cd /home/user/webapp
exec node dist/index.js