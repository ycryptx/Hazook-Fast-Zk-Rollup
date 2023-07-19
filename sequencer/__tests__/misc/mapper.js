#!/usr/bin/env node

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readline_1 = require("readline");
let key = 0;
const rl = (0, readline_1.createInterface)({
    input: process.stdin,
});
const parse = (line) => {
    return `${parseInt(line) + 1}`;
};
// fire an event on each line read from RL
rl.on('line', (line) => {
    const val = parse(line);
    process.stdout.write(`${key}\t${val}\n`);
    key += 1;
});
//# sourceMappingURL=index.js.map