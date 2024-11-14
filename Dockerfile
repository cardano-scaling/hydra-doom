ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine

RUN apk add openssl-dev
WORKDIR /usr/app
COPY . .
RUN yarn install
RUN npm install -g vite

EXPOSE 3000
CMD yarn start
