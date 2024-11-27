#!/bin/bash
while true; do
    echo "Starting referee process"

    npx -y tsx referee.ts

    EXIT_CODE=$?
    echo "Referee exited with status $EXIT_CODE"

    # Sleeping here to avoid DDOSing our nodes
    echo "Restarting referee in 3 seconds..."
    sleep 3

done
