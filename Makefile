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
	docker run --rm --name mina-accumulator -p 9864:9864 -p 9870:9870 -p 8088:8088 -p 9000:9000 --hostname localhost $(LOCAL_HADOOP_IMAGE_NAME) --memory="8g" &

build-map-reduce-steps: # builds mapper and reducer nodejs sripts to be uploaded to Hadoop
	cd accumulator/steps/steps; \
	yarn build; \
	cd ..; \
	rm mapper.js reducer.js; \
	echo '#!/usr/bin/env node\n' > mapper.js; \
	echo '#!/usr/bin/env node\n' > reducer.js; \
	cat steps/build/src/mapper/index.js >> mapper.js; \
	cat steps/build/src/reducer/index.js >> reducer.js;

generate-demo-data:
	for number in {0..7} ; do \
    	echo $$number >> sequencer/data/run1.txt; \
	done
	for number in {0..63} ; do \
    	echo $$number >> sequencer/data/run2.txt; \
	done
	for number in {0..255} ; do \
    	echo $$number >> sequencer/data/run3.txt; \
	done
	for number in {0..2047} ; do \
    	echo $$number >> sequencer/data/run4.txt; \
	done

start-sequencer:
	cd sequencer; \
	yarn build; \
	yarn start; \