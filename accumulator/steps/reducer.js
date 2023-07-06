#!/usr/bin/env node

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecursiveProgram = exports.PublicInput = void 0;
const readline_1 = require("readline");
const snarkyjs_1 = require("snarkyjs");
class PublicInput extends (0, snarkyjs_1.Struct)({
    sum: snarkyjs_1.Field,
    number: snarkyjs_1.Field,
    hash: snarkyjs_1.Field,
}) {
}
exports.PublicInput = PublicInput;
exports.RecursiveProgram = snarkyjs_1.Experimental.ZkProgram({
    publicInput: PublicInput,
    methods: {
        init: {
            privateInputs: [],
            method(publicInput) {
                const { sum, hash } = publicInput;
                hash.assertEquals(snarkyjs_1.Poseidon.hash([sum]), 'incorrect sum hash');
            },
        },
        step: {
            privateInputs: [snarkyjs_1.SelfProof],
            method(publicInput, earlierProof) {
                // verify earlier proof
                earlierProof.verify();
                const { number, hash } = publicInput;
                const expectedHash = snarkyjs_1.Poseidon.hash([
                    earlierProof.publicInput.sum.add(number),
                ]);
                hash.assertEquals(expectedHash, 'incorrect sum hash');
            },
        },
    },
});
const rl = (0, readline_1.createInterface)({
    input: process.stdin,
});
// variable used as an accumulator
const summary = {
    proof: '',
    sum: 0,
    number: 0,
    hash: '',
};
const processData = async (line) => {
    await exports.RecursiveProgram.compile();
    const [, val] = line.split('\t');
    const [_num, _sum, proof] = val.split(' ');
    const num = parseInt(_num);
    const sum = parseInt(_sum);
    const newSum = num + sum;
    const publicInput = new PublicInput({
        sum: (0, snarkyjs_1.Field)(newSum),
        number: (0, snarkyjs_1.Field)(num),
        hash: snarkyjs_1.Poseidon.hash([(0, snarkyjs_1.Field)(newSum)]),
    });
    let _proof;
    if (!proof && !summary.proof) {
        // this is the first line of the reduce step
        _proof = await exports.RecursiveProgram.init(publicInput);
    }
    else if (proof && !summary.proof) {
        // this is the first line of a combine step
        _proof = await exports.RecursiveProgram.step(publicInput, snarkyjs_1.Proof.fromJSON(JSON.parse(proof)));
    }
    else {
        // this is within the reduce
        _proof = await exports.RecursiveProgram.step(publicInput, snarkyjs_1.Proof.fromJSON(JSON.parse(summary.proof)));
    }
    summary.proof = JSON.stringify(_proof.toJSON());
    summary.sum = newSum;
    summary.number = num;
    summary.hash = publicInput.hash.toString();
};
// fire an event on each line read from RL
rl.on('line', (line) => {
    processData(line);
});
// final event when the file is closed, to flush the final accumulated value
rl.on('close', () => {
    const { number, sum, proof } = summary;
    process.stdout.write(`${number} ${sum} ${proof}`);
});
//# sourceMappingURL=index.js.map