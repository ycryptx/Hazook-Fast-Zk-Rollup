import * as fs from 'fs';
import * as path from 'path';
import { createServer } from 'nice-grpc';
import {
  ServerReflectionService,
  ServerReflection,
} from 'nice-grpc-server-reflection';
import { Sequencer, SequencerServiceDefinition } from './services';
import { RollupProofBase } from '@ycryptx/rollup';
import { logger } from '../utils';

export const initServer = <RollupProof extends RollupProofBase>(): void => {
  const grpcAddress = `0.0.0.0:${process.env.GRPC_SERVER_PORT}`;
  const server = createServer();

  server.add(SequencerServiceDefinition, new Sequencer<RollupProof>());

  // add server reflection service
  server.add(
    ServerReflectionService,
    ServerReflection(
      fs.readFileSync(path.join(__dirname, '../', 'proto', 'protoset.bin')),
      // specify fully-qualified names of exposed services
      [SequencerServiceDefinition.fullName],
    ),
  );

  server.listen(grpcAddress);

  logger.info(`grpc server listening on ${grpcAddress}`);
};
