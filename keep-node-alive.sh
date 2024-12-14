#!/bin/bash
PROCESS=$1
while true; do
    echo "Starting $PROCESS..."
    curl -XPOST "http://localhost:8000/server_unavailable"

    npx -y tsx $PROCESS

    EXIT_CODE=$?
    echo "$PROCESS exited with status $EXIT_CODE"

    # Sleeping here to avoid DDOSing our nodes
    echo "Restarting $PROCESS in 3 seconds..."
    sleep 3

done
