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

/***/ 701:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.mapper = void 0;
const snarkyjs_1 = __webpack_require__(476);
const readline_1 = __webpack_require__(521);
const rollup_1 = __webpack_require__(438);
const INPUT_SPLIT = process.env.mapreduce_map_input_start;
const NUM_REDUCERS = 4;
let currentReducer = 0;
const deriveKey = () => {
    const key = `${currentReducer}\t${INPUT_SPLIT}`;
    currentReducer = (currentReducer + 1) % NUM_REDUCERS;
    return key;
};
const mapper = async () => {
    await rollup_1.Rollup.compile();
    const rl = (0, readline_1.createInterface)({
        input: process.stdin,
    });
    for await (const line of rl) {
        if (!line) {
            continue;
        }
        const number = parseInt(line);
        const state = rollup_1.RollupState.createOneStep((0, snarkyjs_1.Field)(number));
        const proof = await rollup_1.Rollup.oneStep(state);
        const proofString = JSON.stringify(proof.toJSON());
        const mapOutput = `${deriveKey()}\t${proofString}\n`;
        process.stdout.write(mapOutput);
    }
};
exports.mapper = mapper;
//# sourceMappingURL=mapper.js.map

/***/ }),

/***/ 438:
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
//# sourceMappingURL=index.js.map

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
const mapper_1 = __webpack_require__(701);
(0, mapper_1.mapper)();
//# sourceMappingURL=index.js.map
})();

/******/ })()
;