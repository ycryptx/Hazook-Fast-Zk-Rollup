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
exports.reducer = void 0;
const readline_1 = __webpack_require__(521);
const rollup_1 = __webpack_require__(438);
const onNewLine = async (line, accumulatedProof) => {
    const [, , proofString] = line.split('\t');
    if (!proofString) {
        return accumulatedProof;
    }
    const proof = rollup_1.RollupProof.fromJSON(JSON.parse(proofString));
    if (!accumulatedProof) {
        return proof;
    }
    const currentState = new rollup_1.RollupState({
        initialRoot: accumulatedProof.publicInput.initialRoot,
        latestRoot: accumulatedProof.publicInput.latestRoot,
    });
    const newState = rollup_1.RollupState.createMerged(currentState, new rollup_1.RollupState({
        initialRoot: proof.publicInput.initialRoot,
        latestRoot: proof.publicInput.latestRoot,
    }));
    accumulatedProof = await rollup_1.Rollup.merge(newState, accumulatedProof, proof);
    return accumulatedProof;
};
const onClosed = async (accumulatedProof) => {
    let accumulatedProofString = '';
    if (accumulatedProof) {
        accumulatedProofString = JSON.stringify(accumulatedProof.toJSON());
    }
    process.stdout.write(accumulatedProofString);
    return;
};
const reducer = async () => {
    await rollup_1.Rollup.compile();
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
const reducer_1 = __webpack_require__(599);
(0, reducer_1.reducer)();
//# sourceMappingURL=index.js.map
})();

/******/ })()
;