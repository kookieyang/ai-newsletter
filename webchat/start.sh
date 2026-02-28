#!/bin/bash
# Start the Amy Webchat server
cd "$(dirname "$0")"

PORT=${1:-8899}

# Kill any existing instance on this port
lsof -ti :$PORT | xargs kill -9 2>/dev/null

echo "🌸 Starting Amy Webchat on http://127.0.0.1:$PORT"
node server.js $PORT &

sleep 1
open "http://127.0.0.1:$PORT"
