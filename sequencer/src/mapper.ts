import { Rollup, MyTransaction, MyRollupProof } from '@ycryptx/rollup';
import { mapper } from './hadoop/mapper';

mapper(Rollup, new MyTransaction(null), new MyRollupProof({} as any));
