#!/usr/bin/env node

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readline_1 = require("readline");
const INPUT_SPLIT = process.env.mapreduce_map_input_start;
const NUM_REDUCERS = 4;
let currentReducer = 0;
const deriveKey = () => {
    const key = `${currentReducer},${INPUT_SPLIT}`;
    currentReducer = (currentReducer + 1) % NUM_REDUCERS;
    return key;
};
const rl = (0, readline_1.createInterface)({
    input: process.stdin,
});
const parse = (line) => {
    return `${parseInt(line)}`;
};
// fire an event on each line read from RL
rl.on('line', (line) => {
    const [, value] = line.split('\t'); // mapper input is in k:v form of offset \t line due to NLineInputFormat
    const val = parse(value);
    const keyVal = `${deriveKey()},${val}\n`
    process.stdout.write(keyVal);
});
//# sourceMappingURL=index.js.map