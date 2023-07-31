FROM node:18.12-alpine AS builder
WORKDIR /app
COPY . .
RUN yarn install
RUN yarn sequencer build

FROM node:18.12-alpine AS final
WORKDIR /app
COPY --from=builder /app/sequencer/bundle ./sequencer/bundle
COPY --from=builder /app/sequencer/proto/protoset.bin ./sequencer/proto/protoset.bin
COPY --from=builder /app/sequencer/preprocessed ./sequencer/preprocessed
COPY --from=builder /app/sequencer/data/ ./sequencer/data/
COPY --from=builder /app/map-reduce-scripts ./map-reduce-scripts
COPY --from=builder /app/rollup ./rollup
COPY ./sequencer/package.json ./sequencer/
COPY ./package.json .
COPY ./yarn.lock .
RUN yarn install --production

EXPOSE 8080/tcp
EXPOSE 8080/udp

CMD [ "node", "./sequencer/bundle/bundle.js" ]