FROM node:20-alpine AS base

RUN apk add

WORKDIR /usr/src/app
RUN --mount=type=bind,source=referee/package.json,target=package.json \
    --mount=type=bind,source=referee/yarn.lock,target=yarn.lock \
    yarn install --frozen-lockfile
USER node

WORKDIR /usr/src
COPY ./referee ./app
COPY keep-node-alive.sh ./app/run.sh
COPY ./referee/tsconfig.docker.json ./app/tsconfig.json
COPY ./src/utils/HydraMultiplayer ./app/utils/HydraMultiplayer
COPY ./src/utils/hydra-node.ts ./app/utils/hydra.ts
COPY ./src/utils/helpers.ts ./app/utils/helpers.ts
COPY ./websockets-doom.js ./websockets-doom.js
COPY ./public/ ./public/


WORKDIR /usr/src/app
CMD ["sh", "./run.sh", "referee.ts"]
