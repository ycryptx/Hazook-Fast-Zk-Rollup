FROM node:18.12-alpine AS builder
WORKDIR /app
COPY . .
RUN yarn install && \
    yarn rollup build && \
    yarn sequencer build

FROM node:18.12-alpine AS final
WORKDIR /app
COPY --from=builder /app/sequencer/bundle  ./sequencer/bundle
COPY --from=builder /app/sequencer/package.json ./sequencer/
COPY --from=builder /app/sequencer/proto/protoset.bin ./sequencer/proto/
COPY --from=builder /app/sequencer/preprocessed ./sequencer/preprocessed
COPY --from=builder /app/sequencer/data ./sequencer/data
COPY --from=builder /app/sequencer/scripts  ./scripts
COPY --from=builder /app/rollup/build ./rollup/build
COPY --from=builder /app/rollup/package.json ./rollup/
COPY ./package.json ./yarn.lock ./tsconfig.json ./
RUN yarn install --production

EXPOSE 8080/tcp
EXPOSE 8080/udp

CMD [ "yarn", "sequencer", "start" ]