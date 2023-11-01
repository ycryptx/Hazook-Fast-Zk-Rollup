import {
  Rollup,
  MyTransaction,
  MyRollupProof,
  TransactionBase,
  RollupProofBase,
} from '@ycryptx/rollup';
import { mapper } from './hadoop/mapper';

/**
 * @note Modify the inputs to this function with your own ZkApp and an instantiated implementation of {@link TransactionBase} and {@link RollupProofBase}
 */
mapper(Rollup, new MyTransaction(null), new MyRollupProof({} as any));
