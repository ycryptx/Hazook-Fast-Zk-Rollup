FROM node:18.12-alpine AS builder
WORKDIR /app
COPY . .
RUN yarn install
RUN yarn build

FROM node:18.12-alpine AS final
WORKDIR /app
COPY --from=builder /app/bundle ./bundle
COPY --from=builder /app/proto/protoset.bin ./proto/protoset.bin
COPY package.json yarn.lock ./
RUN yarn install --production

EXPOSE 8080/tcp
EXPOSE 8080/udp

CMD [ "yarn", "start" ]