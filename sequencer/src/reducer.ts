import { MyRollupProof, Rollup } from '@ycryptx/rollup';
import { reducer } from './hadoop/reducer/reducer';

reducer<typeof Rollup, MyRollupProof>();
