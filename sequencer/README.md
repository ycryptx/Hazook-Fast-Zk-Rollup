## Sequencer

This is an implementation of a simple zk-rollup sequencer. A state update is a single recursive zk proof that is aggregated and proven in parallel using a MapReduce job.


### To compile protobuf

```bash
yarn codegen:buf
```