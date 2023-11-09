#!/usr/bin/env node

/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 136:
/***/ ((module) => {

module.exports = require("o1js");

/***/ }),

/***/ 521:
/***/ ((module) => {

module.exports = require("readline");

/***/ }),

/***/ 356:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TransactionBase = exports.RollupProofBase = void 0;
/**
 * You must define a class that implements {@link RollupProofBase}.
 *
 * This class acts as a wrapper around a ZkApp's {@link Proof} object giving the sequencer and Hadoop an abstracted
 * way to serialize, deserialize, and accumulate proofs.
 *
 * Refer to {@link MyRollupProof} in [myRollup.ts](./myRollup.ts) for an example implementation.
 */
class RollupProofBase {
}
exports.RollupProofBase = RollupProofBase;
/**
 * You must define a class that implements {@link TransactionBase}
 *
 * This class acts as a wrapper around your ZkApp's transactions. You are free to structure your transaction
 * object however you like, just make sure that the implemented methods of this class are aware of the various
 * types of transactions in your ZkApp.
 *
 * The purpose of defining this class is to give the sequencer and Hadoop an abstracted way to serialize and
 * deserialize user transactions, and to produce the transaction's base proof.
 *
 * For an example implementation of a {@link TransactionBase} refer to {@link MyTransaction} in [myRollup.ts](./myRollup.ts).
 */
class TransactionBase {
}
exports.TransactionBase = TransactionBase;
//# sourceMappingURL=generics.js.map

/***/ }),

/***/ 332:
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
__exportStar(__webpack_require__(356), exports);
__exportStar(__webpack_require__(747), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 747:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/**
 * This file contains a dummy ZkApp and the associated implementation
 * of the required abstract classes (please refer to ./generics.ts)
 * for using the sequencer and hadoop. This ZkApp adds a number a
 * number to a MerkleMap and holds the state of the latest and previous
 * MerkleMap.
 *
 * @note Make sure to create your own implementation of all classes in this file.
 * Refer to (this file)[./generics.ts] for more information
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TransactionPreProcessor = exports.MyTransaction = exports.MyRollupProof = exports.Rollup = void 0;
const o1js_1 = __webpack_require__(136);
/**
 * A helper class for working with {@link Rollup}, our dummy ZkApp
 */
class RollupState extends (0, o1js_1.Struct)({
    initialRoot: o1js_1.Field,
    latestRoot: o1js_1.Field,
}) {
    static createOneStep(initialRoot, latestRoot, key, currentValue, newValue, merkleMapWitness) {
        const [witnessRootBefore, witnessKey] = merkleMapWitness.computeRootAndKey(currentValue);
        initialRoot.assertEquals(witnessRootBefore, 'createOneStep: initialRoot == witnessRootBefore');
        witnessKey.assertEquals(key, 'createOneStep: witnessKey == key');
        const [witnessRootAfter] = merkleMapWitness.computeRootAndKey(newValue);
        latestRoot.assertEquals(witnessRootAfter, 'createOneStep: latestRoot == witnessRootAfter');
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
        state1.initialRoot.assertEquals(state2.initialRoot, 'RollupState: initialRoot1 == initialRoot2');
        state1.latestRoot.assertEquals(state2.latestRoot, 'RollupState: latestRoot1 == latestRoot2');
    }
}
/**
 * Our dummy ZkApp; you should replace it with your own ZkApp.
 */
exports.Rollup = o1js_1.Experimental.ZkProgram({
    publicInput: RollupState,
    methods: {
        oneStep: {
            privateInputs: [o1js_1.Field, o1js_1.Field, o1js_1.Field, o1js_1.Field, o1js_1.Field, o1js_1.MerkleMapWitness],
            method(newState, initialRoot, latestRoot, key, currentValue, newValue, merkleMapWitness) {
                const computedState = RollupState.createOneStep(initialRoot, latestRoot, key, currentValue, newValue, merkleMapWitness);
                RollupState.assertEquals(newState, computedState);
                return undefined;
            },
        },
        merge: {
            privateInputs: [o1js_1.SelfProof, o1js_1.SelfProof],
            method(newState, rollup1proof, rollup2proof) {
                rollup1proof.verify(); // A -> B
                rollup2proof.verify(); // B -> C
                rollup1proof.publicInput.initialRoot.assertEquals(newState.initialRoot, 'merge: rollup1Proof.initialRoot == newState.initialRoot');
                rollup1proof.publicInput.latestRoot.assertEquals(rollup2proof.publicInput.initialRoot, 'merge: rollup1Proof.latestRoot == rollup2Proof.initialRoot');
                rollup2proof.publicInput.latestRoot.assertEquals(newState.latestRoot, 'merge: rollup2Proof.latestRoot == newState.latestRoot');
            },
        },
    },
});
/**
 * An implementation of {@link RollupProofBase}
 */
class MyRollupProof extends o1js_1.Experimental.ZkProgram.Proof(exports.Rollup) {
    async merge(newProof) {
        const currentState = new RollupState({
            initialRoot: this.publicInput.initialRoot,
            latestRoot: this.publicInput.latestRoot,
        });
        const newState = RollupState.createMerged(currentState, new RollupState({
            initialRoot: newProof.publicInput.initialRoot,
            latestRoot: newProof.publicInput.latestRoot,
        }));
        const mergedProof = await exports.Rollup.merge(newState, this, newProof);
        return new MyRollupProof(mergedProof);
    }
    fromJSON(json) {
        return new MyRollupProof(MyRollupProof.fromJSON(json));
    }
}
exports.MyRollupProof = MyRollupProof;
/**
 * An implementation of {@link TransactionBase}
 */
class MyTransaction {
    constructor(params) {
        if (params != null) {
            this.initialRoot = params.initialRoot;
            this.latestRoot = params.latestRoot;
            this.key = params.key;
            this.currentValue = params.currentValue;
            this.newValue = params.newValue;
            this.merkleMapWitness = params.merkleMapWitness;
        }
    }
    serialize() {
        return JSON.stringify({
            initialRoot: this.initialRoot.toJSON(),
            latestRoot: this.latestRoot.toJSON(),
            key: this.key.toJSON(),
            currentValue: this.currentValue.toJSON(),
            newValue: this.newValue.toJSON(),
            merkleMapWitness: this.merkleMapWitness.toJSON(),
        });
    }
    deserialize(serialized) {
        const txJson = JSON.parse(serialized);
        this.initialRoot = (0, o1js_1.Field)(txJson.initialRoot);
        this.latestRoot = (0, o1js_1.Field)(txJson.latestRoot);
        this.key = (0, o1js_1.Field)(txJson.key);
        this.currentValue = (0, o1js_1.Field)(txJson.currentValue);
        this.newValue = (0, o1js_1.Field)(txJson.newValue);
        this.merkleMapWitness = o1js_1.MerkleMapWitness.fromJSON(txJson.merkleMapWitness);
    }
    async baseFn() {
        const state = new RollupState({
            initialRoot: this.initialRoot,
            latestRoot: this.latestRoot,
        });
        const proof = await exports.Rollup.oneStep(state, this.initialRoot, this.latestRoot, this.key, this.currentValue, this.newValue, this.merkleMapWitness);
        return new MyRollupProof(proof);
    }
}
exports.MyTransaction = MyTransaction;
/**
 * A helper to convert a plain user transaction into a transaction that can be provable.
 * In our case a user transaction is simply an integer sent by the user.
 * The role of {@link TransactionPreProcessor} is from a set of these plain user transactions generate
 * each transaction's merkle root and convert the transaction into {@link MyTransaction}
 *
 *
 * @note you will want to implement your own TransactionPreProcessor according to the structure of your transactions
 */
class TransactionPreProcessor {
    constructor() {
        this.merkleMap = new o1js_1.MerkleMap();
        this.currentValue = (0, o1js_1.Field)(0);
    }
    processTx(tx) {
        const initialRoot = this.merkleMap.getRoot();
        const newValue = (0, o1js_1.Field)(tx);
        const key = (0, o1js_1.Field)(this.merkleMap.tree.leafCount);
        const currentValue = (0, o1js_1.Field)(this.currentValue.value);
        this.merkleMap.set(key, newValue);
        this.currentValue = newValue;
        return new MyTransaction({
            initialRoot: initialRoot,
            latestRoot: this.merkleMap.getRoot(),
            key,
            currentValue,
            newValue,
            merkleMapWitness: this.merkleMap.getWitness(key),
        });
    }
}
exports.TransactionPreProcessor = TransactionPreProcessor;
//# sourceMappingURL=myRollup.js.map

/***/ }),

/***/ 898:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.reducer = void 0;
const readline_1 = __webpack_require__(521);
const utils_1 = __webpack_require__(587);
const reducer = async (rollup, proof) => {
    let compiled = false;
    const rl = (0, readline_1.createInterface)({
        input: process.stdin,
    });
    let partitionKey;
    const intermediateProofs = {};
    for await (const line of rl) {
        const [_partitionKey, lineNumber, proofString] = line.split('\t');
        (0, utils_1.logger)('reducer', `got proof ${lineNumber}, partition ${_partitionKey}`);
        const _lineNumber = parseInt(lineNumber);
        if (!compiled) {
            (0, utils_1.logger)('reducer', `compiling zkapp`);
            try {
                await rollup.compile();
            }
            catch (err) {
                (0, utils_1.logger)('reducer', `failed compiling zkapp`);
                throw err;
            }
            (0, utils_1.logger)('reducer', `finished compiling zkapp`);
            compiled = true;
        }
        if (!partitionKey) {
            partitionKey = _partitionKey;
        }
        const deserializedProof = proof.fromJSON(JSON.parse(proofString));
        const orderedProofToAdd = {
            proof: deserializedProof,
            order: _lineNumber,
        };
        if (!intermediateProofs[_partitionKey]) {
            intermediateProofs[_partitionKey] = {
                proofs: [orderedProofToAdd],
            };
            continue;
        }
        let proofs = intermediateProofs[_partitionKey].proofs;
        // push the proof to the array in-order
        for (let i = 0; i < proofs.length; i++) {
            if (proofs[i].order < _lineNumber) {
                continue;
            }
            proofs = proofs
                .slice(0, i)
                .concat([orderedProofToAdd])
                .concat(proofs.slice(i));
            break;
        }
        // try to merge consecutive proofs
        let current = 0;
        for (let i = 0; i < proofs.length - 1; i++) {
            if (proofs[i].order == proofs[i + 1].order + 1) {
                if (proofs[i].skipped) {
                    continue;
                }
                (0, utils_1.logger)('reducer', `merging proof ${proofs[i].order} while mapper is still feeding proofs`);
                proofs[i + 1].proof = await proofs[current].proof.merge(proofs[i + 1].proof);
                (0, utils_1.logger)('reducer', `finished merging proof ${proofs[i].order}`);
                proofs[i].skipped = true;
                current = i + 1;
            }
            else {
                current += 1;
            }
        }
        intermediateProofs[_partitionKey].proofs = proofs;
    }
    // proofs accumulated by partition
    const accumulatedProofs = [];
    for (const partition of Object.keys(intermediateProofs)) {
        for (const orderedProof of intermediateProofs[partition].proofs) {
            (0, utils_1.logger)('reducer', `merging proof ${orderedProof.order} in partition ${partition}`);
            if (orderedProof.skipped) {
                continue;
            }
            try {
                if (!intermediateProofs[partition].accumulated) {
                    intermediateProofs[partition].accumulated = orderedProof.proof;
                    continue;
                }
                intermediateProofs[partition].accumulated = await intermediateProofs[partition].accumulated.merge(orderedProof.proof);
            }
            catch (err) {
                (0, utils_1.logger)('reducer', `failed merging proof ${orderedProof.order} in partition ${partition}`);
                throw err;
            }
            (0, utils_1.logger)('reducer', `finished merging proof ${orderedProof.order}`);
        }
        accumulatedProofs.push({
            order: parseInt(partition),
            proof: intermediateProofs[partition].accumulated,
        });
    }
    process.stdout.write(JSON.stringify(accumulatedProofs));
    (0, utils_1.logger)('reducer', `done: partitions ${accumulatedProofs.map((p) => p.order)}`);
    return;
};
exports.reducer = reducer;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 587:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.logger = void 0;
const logger = (instance, msg) => {
    console.error(`${new Date().toISOString()} ${instance}: ${msg}`);
};
exports.logger = logger;
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
const rollup_1 = __webpack_require__(332);
const reducer_1 = __webpack_require__(898);
/**
 * @note Modify the inputs to this function with your own ZkApp and an instantiated implementation of {@link RollupProofBase}
 */
(0, reducer_1.reducer)(rollup_1.Rollup, new rollup_1.MyRollupProof({}));
//# sourceMappingURL=reducer.js.map
})();

/******/ })()
;