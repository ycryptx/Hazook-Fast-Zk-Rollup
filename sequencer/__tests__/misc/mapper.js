#!/usr/bin/env node

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readline_1 = require("readline");
const INPUT_SPLIT = process.env.mapreduce_map_input_start;
const NUM_REDUCERS = 2;
let currentReducer = 0;
const deriveKey = () => {
    const key = `${currentReducer}\t${INPUT_SPLIT}`;
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
    const val = parse(line);
    const keyVal = `${deriveKey()}\t${val}\n`
    process.stdout.write(keyVal);
});
//# sourceMappingURL=index.js.map