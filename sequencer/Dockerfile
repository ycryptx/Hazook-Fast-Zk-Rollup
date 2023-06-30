FROM node:18.12-alpine AS builder
WORKDIR /app
COPY . .
RUN yarn install
RUN yarn build

FROM node:18.12-alpine AS final
WORKDIR /app
COPY --from=builder /app/bundle ./bundle
COPY package.json .
COPY yarn.lock .
RUN yarn install --production
CMD [ "yarn", "start" ]