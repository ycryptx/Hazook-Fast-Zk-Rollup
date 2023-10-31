import { MyRollupProof, Rollup } from '@ycryptx/rollup';
import { reducer } from './hadoop/reducer';

reducer(Rollup, new MyRollupProof({} as any));
