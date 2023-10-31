import { Rollup, MyTransaction, MyRollupProof } from '@ycryptx/rollup';
import { mapper } from './hadoop/mapper/mapper';

mapper<typeof Rollup, MyTransaction, MyRollupProof>();
