#!/usr/bin/env node

/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 521:
/***/ ((module) => {

module.exports = require("readline");

/***/ }),

/***/ 701:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.mapper = void 0;
const readline_1 = __webpack_require__(521);
const mapper = () => {
    let key = 0;
    const rl = (0, readline_1.createInterface)({
        input: process.stdin,
    });
    const parse = (line) => {
        // "number sum proof"
        const sum = 0;
        const proof = '';
        return `${line} ${sum} ${proof}`;
    };
    // fire an event on each line read from RL
    rl.on('line', (line) => {
        const val = parse(line);
        process.stdout.write(`${key}\t${val}\n`);
        key += 1;
    });
};
exports.mapper = mapper;
//# sourceMappingURL=mapper.js.map

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