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
const mapper = async () => {
    await rollup_1.Rollup.compile();
    let currentReducer = 0;
    let inputSplitCounter = 0;
    const deriveKey = () => {
        const key = `${currentReducer}\t${INPUT_SPLIT + inputSplitCounter}`;
        currentReducer = (currentReducer + 1) % NUM_REDUCERS;
        inputSplitCounter += 1;
        return key;
    };
    const rl = (0, readline_1.createInterface)({
        input: process.stdin,
    });
    for await (const line of rl) {
        if (!line) {
            continue;
        }
        const serialized = JSON.parse(line);
        const deserialized = {
            initialRoot: (0, snarkyjs_1.Field)(serialized.initialRoot),
            latestRoot: (0, snarkyjs_1.Field)(serialized.latestRoot),
            key: (0, snarkyjs_1.Field)(serialized.key),
            currentValue: (0, snarkyjs_1.Field)(serialized.currentValue),
            newValue: (0, snarkyjs_1.Field)(serialized.newValue),
            merkleMapWitness: snarkyjs_1.MerkleMapWitness.fromJSON(serialized.merkleMapWitness),
        };
        const state = new rollup_1.RollupState({
            initialRoot: deserialized.initialRoot,
            latestRoot: deserialized.latestRoot,
        });
        const proof = await rollup_1.Rollup.oneStep(state, deserialized.initialRoot, deserialized.latestRoot, deserialized.key, deserialized.currentValue, deserialized.newValue, deserialized.merkleMapWitness);
        const proofString = JSON.stringify(proof.toJSON());
        process.stdout.write(`${deriveKey()}\t${proofString}\n`);
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
    initialRoot: snarkyjs_1.Field,
    latestRoot: snarkyjs_1.Field,
}) {
    static createOneStep(initialRoot, latestRoot, key, currentValue, newValue, merkleMapWitness) {
        const [witnessRootBefore, witnessKey] = merkleMapWitness.computeRootAndKey(currentValue);
        initialRoot.assertEquals(witnessRootBefore);
        witnessKey.assertEquals(key);
        const [witnessRootAfter, _] = merkleMapWitness.computeRootAndKey(newValue);
        latestRoot.assertEquals(witnessRootAfter);
        return new RollupState({
            initialRoot,
            latestRoot,
        });
    }
    static createMerged(state1, state2) {
        return new RollupState({
            initialRoot: state1.initialRoot,
            latestRoot: state2.latestRoot,
        });
    }
    static assertEquals(state1, state2) {
        state1.initialRoot.assertEquals(state2.initialRoot);
        state1.latestRoot.assertEquals(state2.latestRoot);
    }
}
exports.RollupState = RollupState;
exports.Rollup = snarkyjs_1.Experimental.ZkProgram({
    publicInput: RollupState,
    methods: {
        oneStep: {
            privateInputs: [snarkyjs_1.Field, snarkyjs_1.Field, snarkyjs_1.Field, snarkyjs_1.Field, snarkyjs_1.Field, snarkyjs_1.MerkleMapWitness],
            method(newState, initialRoot, latestRoot, key, currentValue, newValue, merkleMapWitness) {
                const computedState = RollupState.createOneStep(initialRoot, latestRoot, key, currentValue, newValue, merkleMapWitness);
                RollupState.assertEquals(newState, computedState);
                return undefined;
            },
        },
        merge: {
            privateInputs: [snarkyjs_1.SelfProof, snarkyjs_1.SelfProof],
            method(newState, rollup1proof, rollup2proof) {
                rollup1proof.verify(); // A -> B
                rollup2proof.verify(); // B -> C
                rollup1proof.publicInput.initialRoot.assertEquals(newState.initialRoot);
                rollup1proof.publicInput.latestRoot.assertEquals(rollup2proof.publicInput.initialRoot);
                rollup2proof.publicInput.latestRoot.assertEquals(newState.latestRoot);
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