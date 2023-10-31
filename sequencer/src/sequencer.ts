import dotenv from 'dotenv';
dotenv.config();
import { initServer } from './server';
import { MyRollupProof } from '@ycryptx/rollup';

initServer<MyRollupProof>();
