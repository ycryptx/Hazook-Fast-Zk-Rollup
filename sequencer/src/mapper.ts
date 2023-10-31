import { Rollup, MyTransaction, MyRollupProof } from '@ycryptx/rollup';
import { mapper } from './hadoop/mapper';

mapper<MyTransaction, MyRollupProof>(Rollup);
