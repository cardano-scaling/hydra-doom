# Hydra Doom

This repository contains the parts of the hydra doom project that are written in javascript, including the frontend UI, the dedicated backend server, and the AI agents.

## UI

To run the UI, set `VITE_SERVER_URL` in your environment to point to a hydra-control-plane API URL, then run `yarn dev`

## Dedicated Server

To run the dedicated server, switch to the `dedicated` directory, then run `yarn`, and then `npx tsx dedicated.ts`.

You can also build a docker image with `docker build -f ./dedicated/Dockerfile .`

## AI Agent

TBD