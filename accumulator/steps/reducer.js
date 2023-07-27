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

/***/ 587:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(392), exports);
__exportStar(__webpack_require__(269), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 269:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Processor = void 0;
const readline_1 = __webpack_require__(521);
class Processor {
    rl;
    queue;
    closed;
    accumulator;
    onNewLine;
    onClosed;
    constructor(onNewLineFn, onClosedFn) {
        this.rl = (0, readline_1.createInterface)({
            input: process.stdin,
        });
        this.queue = [];
        this.closed = false;
        this.onNewLine = onNewLineFn;
        this.onClosed = onClosedFn;
        // on every new input add to the queue for asynchronous processing
        this.rl.on('line', (line) => {
            this.queue.push(line);
        });
        // take note when there's no more input
        this.rl.on('close', () => {
            this.closed = true;
        });
    }
    async run() {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const line = this.queue.shift();
            if (line) {
                this.accumulator = await this.onNewLine(line, this.accumulator);
            }
            else if (this.closed) {
                return this.onClosed(this.accumulator);
            }
        }
    }
}
exports.Processor = Processor;
//# sourceMappingURL=processor.js.map

/***/ }),

/***/ 392:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RollupProof = exports.Rollup = exports.RollupState = void 0;
const snarkyjs_1 = __webpack_require__(476);
class RollupState extends (0, snarkyjs_1.Struct)({
    hashedSum: snarkyjs_1.Field,
    sum: snarkyjs_1.Field,
}) {
    static createOneStep(number) {
        return new RollupState({
            hashedSum: snarkyjs_1.Poseidon.hash([number]),
            sum: number,
        });
    }
    static createMerged(state1, state2) {
        const sum = state1.sum.add(state2.sum);
        return new RollupState({
            hashedSum: snarkyjs_1.Poseidon.hash([sum]),
            sum,
        });
    }
    static assertEquals(state1, state2) {
        state1.hashedSum.assertEquals(state2.hashedSum);
        state1.sum.assertEquals(state2.sum);
    }
}
exports.RollupState = RollupState;
exports.Rollup = snarkyjs_1.Experimental.ZkProgram({
    publicInput: RollupState,
    publicOutput: snarkyjs_1.Empty,
    methods: {
        oneStep: {
            privateInputs: [],
            method(state) {
                const computedState = RollupState.createOneStep(state.sum);
                RollupState.assertEquals(state, computedState);
                return undefined;
            },
        },
        merge: {
            privateInputs: [snarkyjs_1.SelfProof, snarkyjs_1.SelfProof],
            method(newState, state1Proof, state2Proof) {
                state1Proof.verify();
                state2Proof.verify();
                const expectedSum = state1Proof.publicInput.sum.add(state2Proof.publicInput.sum);
                newState.sum.equals(expectedSum);
                newState.hashedSum.equals(snarkyjs_1.Poseidon.hash([expectedSum]));
                return undefined;
            },
        },
    },
});
class RollupProof extends snarkyjs_1.Experimental.ZkProgram.Proof(exports.Rollup) {
}
exports.RollupProof = RollupProof;
//# sourceMappingURL=rollup.js.map

/***/ }),

/***/ 599:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.reducer = void 0;
const readline_1 = __webpack_require__(521);
const common_1 = __webpack_require__(587);
const onNewLine = async (line, accumulatedProof) => {
    const [, proofString] = line.split('\t');
    const proof = common_1.RollupProof.fromJSON(JSON.parse(proofString));
    if (!accumulatedProof) {
        return proof;
    }
    const currentState = new common_1.RollupState({
        hashedSum: accumulatedProof.publicInput.hashedSum,
        sum: accumulatedProof.publicInput.sum,
    });
    const newState = common_1.RollupState.createMerged(currentState, new common_1.RollupState({
        hashedSum: proof.publicInput.hashedSum,
        sum: proof.publicInput.sum,
    }));
    console.log('REDUCER MERGING');
    accumulatedProof = await common_1.Rollup.merge(newState, accumulatedProof, proof);
    console.log('REDUCER ACCUMULATED PROOF:', JSON.stringify(accumulatedProof.toJSON()));
    return accumulatedProof;
};
const onClosed = async (accumulatedProof) => {
    const accumulatedProofString = JSON.stringify(accumulatedProof.toJSON());
    process.stdout.write(accumulatedProofString);
    return;
};
const reducer = async () => {
    await common_1.Rollup.compile();
    let rollupProof;
    const rl = (0, readline_1.createInterface)({
        input: process.stdin,
    });
    for await (const line of rl) {
        rollupProof = await onNewLine(line, rollupProof);
    }
    return onClosed(rollupProof);
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
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
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