import dotenv from 'dotenv';
dotenv.config();
import { initServer } from './server';
import { MyRollupProof, RollupProofBase } from '@ycryptx/rollup';

/**
 * @note Modify the generic argument to this function with your own implementation of {@link RollupProofBase}
 */
initServer<MyRollupProof>();
