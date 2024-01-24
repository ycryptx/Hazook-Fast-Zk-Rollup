LOCAL_HADOOP_IMAGE_NAME ?= hadoop

.PHONY: # ignore

echo:
	echo $(LOCAL_HADOOP_IMAGE_NAME)

help:
	@perl -nle'print $& if m{^[a-zA-Z_-]+:.*?## .*$$}' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

build-local-accumulator: # build a Hadoop Single Node Cluster as a Docker image
	cd accumulator/infra/hadoop-single-node-cluster; \
	rm -rf .git; \
	docker build -t $(LOCAL_HADOOP_IMAGE_NAME) .

up-local-accumulator: # stand up a Hadoop Single Node Cluster conatainer
	docker run --rm --name mina-accumulator -p 9864:9864 -p 9870:9870 -p 8088:8088 -p 9000:9000 --hostname localhost $(LOCAL_HADOOP_IMAGE_NAME) --memory="12g" --cpus=5 &

build-map-reduce-scripts: # builds mapper and reducer scripts to be uploaded to S3
	rm -rf sequencer/scripts; \
	mkdir sequencer/scripts; \
	yarn rollup build; \
	yarn sequencer build:scripts; \
	echo '#!/usr/bin/env node\n' > ./accumulator/infra/scripts/mapper.js; \
	echo '#!/usr/bin/env node\n' > ./accumulator/infra/scripts/reducer.js; \
	cat ./sequencer/bundle/map-reduce/mapper.js >> ./accumulator/infra/scripts/mapper.js; \
	cat ./sequencer/bundle/map-reduce/reducer.js >> ./accumulator/infra/scripts/reducer.js;

run-demo:
	grpc_cli call 0.0.0.0:8080 Demo "case: 1"