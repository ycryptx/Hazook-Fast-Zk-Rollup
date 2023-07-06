import * as fs from 'fs';
import * as path from 'path';
import { createServer } from 'nice-grpc';
import {
  ServerReflectionService,
  ServerReflection,
} from 'nice-grpc-server-reflection';
import { Sequencer, SequencerServiceDefinition } from './services';

export const initServer = (): void => {
  const grpcAddress = `0.0.0.0:${process.env.GRPC_SERVER_PORT}`;
  const server = createServer();

  server.add(SequencerServiceDefinition, new Sequencer());

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

  console.log(`grpc server listening on ${grpcAddress}`);
};
