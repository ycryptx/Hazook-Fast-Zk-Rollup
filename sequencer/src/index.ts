import { resolve } from 'path';
import { generateStateProof } from './generateStateProof';

const dataFilePath = resolve(__dirname, '../..', 'data/demo-0/run1.txt');

generateStateProof(dataFilePath).then((res) => console.log(res.toString()));
