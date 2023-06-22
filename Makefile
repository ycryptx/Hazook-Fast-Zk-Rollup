LOCAL_HADOOP_REPO=https://github.com/rancavil/hadoop-single-node-cluster.git

.PHONY: # ignore

help:
	@perl -nle'print $& if m{^[a-zA-Z_-]+:.*?## .*$$}' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

build-local-accumulator: # build a Hadoop Single Node Cluster as a Docker image
	[ ! -d 'hadoop-single-node-cluster' ] && git clone $(LOCAL_HADOOP_REPO); \
	cd hadoop-single-node-cluster; \
	rm -rf .git; \
	docker build -t hadoop .

up-local-accumulator: # stand up a Hadoop Single Node Cluster conatainer
	docker run --rm -it --name mina-accumulator -p 9864:9864 -p 9870:9870 -p 8088:8088 -p 9000:9000 --hostname localhost hadoop