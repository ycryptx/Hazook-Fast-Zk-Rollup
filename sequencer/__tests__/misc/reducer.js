#!/usr/bin/env node

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readline_1 = require("readline");
const rl = (0, readline_1.createInterface)({
    input: process.stdin,
});
// variable used as an accumulator
const summary = {
    count: 0,
};
const processData = (line) => {
    const [,, val] = line.split('\t');
    const num = parseInt(val);
    summary.count += num;
};
// fire an event on each line read from RL
rl.on('line', (line) => {
    processData(line);
});
// final event when the file is closed, to flush the final accumulated value
rl.on('close', () => {
    process.stdout.write(`${summary.count}`);
});
//# sourceMappingURL=index.js.map