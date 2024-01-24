#!/usr/bin/env node

/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 136:
/***/ ((module) => {

module.exports = require("o1js");

/***/ }),

/***/ 17:
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ 521:
/***/ ((module) => {

module.exports = require("readline");

/***/ }),

/***/ 814:
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.compile = void 0;
const path = __importStar(__webpack_require__(17));
const o1js_1 = __webpack_require__(136);
const compilationCache = o1js_1.Cache.FileSystem(path.join(__dirname, '..', 'compilation'));
/**
 *
 * @param rollup
 * @returns
 */
const compile = async (rollup) => {
    console.log('compiling zkapp...');
    const start = Date.now();
    await rollup.compile({ cache: compilationCache });
    console.log('Finished compiling zkapp!', Date.now() - start);
    return;
};
exports.compile = compile;
//# sourceMappingURL=compilation.js.map

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
__exportStar(__webpack_require__(814), exports);
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
exports.Rollup = (0, o1js_1.ZkProgram)({
    name: 'DummyZkAppRollup',
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
class MyRollupProof extends o1js_1.ZkProgram.Proof(exports.Rollup) {
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

/***/ 830:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.mapper = void 0;
const readline_1 = __webpack_require__(521);
const utils_1 = __webpack_require__(587);
const mapper = async (rollup, tx, proof) => {
    let compiled = false;
    const deriveKey = (lineNumber, sequentialism, intermediateStage) => {
        const partition = lineNumber -
            (lineNumber % Math.pow(sequentialism, intermediateStage + 1));
        const key = `${partition}\t${lineNumber}`;
        return key;
    };
    const rl = (0, readline_1.createInterface)({
        input: process.stdin,
    });
    for await (const line of rl) {
        if (!line) {
            continue;
        }
        let lineNumber, sequentialism, intermediateStage, data;
        const split = line.split('\t');
        if (split.length == 5) {
            // the first \t separated field is a key set by nLineInputFormat
            lineNumber = split[1];
            sequentialism = split[2];
            intermediateStage = split[3];
            data = split[4];
        }
        else {
            lineNumber = split[0];
            sequentialism = split[1];
            intermediateStage = split[2];
            data = split[3];
        }
        if (!data) {
            continue;
        }
        (0, utils_1.logger)('mapper', `got line ${lineNumber}`);
        const mapKey = deriveKey(parseInt(lineNumber), parseInt(sequentialism), parseInt(intermediateStage));
        if (parseInt(intermediateStage) > 0) {
            process.stdout.write(`${mapKey}\t${sequentialism}\t${intermediateStage}\t${data}\n`);
            continue;
        }
        if (!compiled) {
            (0, utils_1.logger)('mapper', `compiling zkapp`);
            const start = Date.now();
            try {
                await rollup.compile({ cache: utils_1.compilationCache });
            }
            catch (err) {
                (0, utils_1.logger)('mapper', `failed to compile zkapp ${err}`);
                throw err;
            }
            (0, utils_1.logger)('mapper', `finished compiling, took ${Date.now() - start}ms`);
            compiled = true;
        }
        tx.deserialize(data);
        (0, utils_1.logger)('mapper', `proving ${lineNumber}`);
        try {
            proof = await tx.baseFn();
        }
        catch (err) {
            (0, utils_1.logger)('mapper', `failed to prove ${lineNumber} ${err}`);
            throw err;
        }
        (0, utils_1.logger)('mapper', `proof ${lineNumber} finished`);
        const proofString = JSON.stringify(proof.toJSON());
        process.stdout.write(`${mapKey}\t${sequentialism}\t${intermediateStage}\t${proofString}\n`);
        (0, utils_1.logger)('mapper', `done`);
    }
};
exports.mapper = mapper;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 587:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.compilationCache = exports.logger = exports.COMPILATION_CACHE_PATH = void 0;
const o1js_1 = __webpack_require__(136);
exports.COMPILATION_CACHE_PATH = `/compilation`;
const logger = (instance, msg) => {
    console.error(`${new Date().toISOString()} ${instance}: ${msg}`);
};
exports.logger = logger;
exports.compilationCache = o1js_1.Cache.FileSystem(exports.COMPILATION_CACHE_PATH);
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
const mapper_1 = __webpack_require__(830);
/**
 * @note Modify the inputs to this function with your own ZkApp and an instantiated implementation of {@link TransactionBase} and {@link RollupProofBase}
 */
(0, mapper_1.mapper)(rollup_1.Rollup, new rollup_1.MyTransaction(null), new rollup_1.MyRollupProof({}));
//# sourceMappingURL=mapper.js.map
})();

/******/ })()
;