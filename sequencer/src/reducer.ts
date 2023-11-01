import { MyRollupProof, Rollup, RollupProofBase } from '@ycryptx/rollup';
import { reducer } from './hadoop/reducer';

/**
 * @note Modify the inputs to this function with your own ZkApp and an instantiated implementation of {@link RollupProofBase}
 */
reducer(Rollup, new MyRollupProof({} as any));
