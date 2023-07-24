#!/usr/bin/env node

/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 476:
/***/ ((module) => {

module.exports = require("snarkyjs");

/***/ }),

/***/ 521:
/***/ ((module) => {

module.exports = require("readline");

/***/ }),

/***/ 599:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.reducer = exports.MyProof = exports.RecursiveProgram = exports.PublicInput = void 0;
const readline_1 = __webpack_require__(521);
const snarkyjs_1 = __webpack_require__(476);
class PublicInput extends (0, snarkyjs_1.Struct)({
    sum: snarkyjs_1.Field,
    number: snarkyjs_1.Field,
}) {
}
exports.PublicInput = PublicInput;
exports.RecursiveProgram = snarkyjs_1.Experimental.ZkProgram({
    publicInput: PublicInput,
    publicOutput: snarkyjs_1.Field,
    methods: {
        init: {
            privateInputs: [],
            method(publicInput) {
                const { sum, number } = publicInput;
                sum.assertEquals(snarkyjs_1.Field.from(0));
                return snarkyjs_1.Poseidon.hash([sum.add(number)]);
            },
        },
        step: {
            privateInputs: [snarkyjs_1.SelfProof],
            method(publicInput, earlierProof) {
                earlierProof.verify();
                const { number, sum } = publicInput;
                const { sum: earlierSum } = earlierProof.publicInput;
                sum.assertEquals(earlierSum.add(number));
                const newSum = earlierSum.add(number);
                const hash = snarkyjs_1.Poseidon.hash([newSum]);
                return hash;
            },
        },
    },
});
class MyProof extends snarkyjs_1.Experimental.ZkProgram.Proof(exports.RecursiveProgram) {
}
exports.MyProof = MyProof;
const reducer = () => {
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
        const [, val] = line.split('\t');
        const [_num, _sum, proof] = val.split(' ');
        console.log('>>>>>>REDUCE STEP START: ', val);
        const num = parseInt(_num);
        const sum = parseInt(_sum);
        const newSum = num + sum + summary.sum;
        const publicInput = new PublicInput({
            sum: (0, snarkyjs_1.Field)(newSum),
            number: (0, snarkyjs_1.Field)(num),
        });
        let _proof;
        if (!proof && !summary.proof) {
            // this is the first line of the reduce step
            _proof = await exports.RecursiveProgram.init(publicInput);
        }
        else if (proof && !summary.proof) {
            // this is the first line of a combine step
            _proof = await exports.RecursiveProgram.step(publicInput, MyProof.fromJSON(JSON.parse(proof)));
        }
        else {
            // this is within the reduce
            _proof = await exports.RecursiveProgram.step(publicInput, MyProof.fromJSON(JSON.parse(summary.proof)));
        }
        summary.proof = JSON.stringify(_proof.toJSON());
        summary.sum = newSum;
        summary.number = num;
        summary.hash = _proof.publicOutput.toString();
        console.log('>>>>>>REDUCE STEP DONE: ', JSON.stringify(summary));
    };
    const queue = [];
    let closed = false;
    const runProving = async () => {
        await exports.RecursiveProgram.compile();
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const line = queue.shift();
            if (line) {
                await processData(line);
            }
            else if (closed) {
                const { number, sum, proof } = summary;
                process.stdout.write(`${number} ${sum} ${proof}`);
                return;
            }
        }
    };
    runProving();
    // fire an event on each line read from RL
    rl.on('line', async (line) => {
        queue.push(line);
    });
    // final event when the file is closed, to flush the final accumulated value
    rl.on('close', () => {
        closed = true;
    });
};
exports.reducer = reducer;
//# sourceMappingURL=reducer.js.map

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
const reducer_1 = __webpack_require__(599);
(0, reducer_1.reducer)();
//# sourceMappingURL=index.js.map
})();

/******/ })()
;