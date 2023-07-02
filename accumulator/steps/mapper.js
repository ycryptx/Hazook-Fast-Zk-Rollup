#!/usr/bin/env node

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readline_1 = require("readline");
const snarkyjs_1 = require("snarkyjs");
let key = 0;
const rl = (0, readline_1.createInterface)({
    input: process.stdin,
});
const parse = (line) => {
    // "number sum hash proof"
    return `${line} ${0} ${snarkyjs_1.Poseidon.hash([(0, snarkyjs_1.Field)(parseInt(line))]).toString()}`;
};
// fire an event on each line read from RL
rl.on('line', (line) => {
    const val = parse(line);
    process.stdout.write(`${key}\t${val}\n`);
    key += 1;
});
//# sourceMappingURL=index.js.map