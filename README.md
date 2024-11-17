# Hydra Doom

This repository contains the parts of the hydra doom project that are written in javascript, including the frontend UI, the backend referee server, and the AI agents.

## UI

To run the UI, set `VITE_SERVER_URL` in your environment to point to a hydra-control-plane API URL, then run `yarn dev`

## Referee Server

To run the referee server, switch to the `referee` directory, then run `yarn`, and then `npx tsx referee.ts`.

You can also build a docker image with `docker build -f ./referee/Dockerfile .`

## AI Agent

TBD