(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["Feeds"] = factory();
	else
		root["Feeds"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var FeedsHelper = (function () {
    function FeedsHelper(feedId, app) {
        this.serviceName = "feeds-service";
        this.feedId = feedId;
        this.app = app;
    }
    FeedsHelper.prototype.subscribe = function (options) {
        return this.app.resumableSubscribe({
            path: this.feedItemsPath(),
            lastEventId: options.lastEventId,
            onOpening: options.onOpening,
            onOpen: options.onOpen,
            onEvent: options.onItem,
            onEnd: options.onEnd,
            onError: options.onError
        });
    };
    FeedsHelper.prototype.fetchOlderThan = function (options) {
        var _this = this;
        var queryString = "";
        var queryParams = [];
        if (options && options.id) {
            queryParams.push("from_id=" + options.id);
        }
        if (options && options.limit) {
            queryParams.push("limit=" + options.limit);
        }
        if (queryParams.length > 0) {
            queryString = "?" + queryParams.join("&");
        }
        var pathWithQuery = this.feedItemsPath() + queryString;
        return new Promise(function (resolve, reject) {
            return _this.app.request({ method: "GET", path: pathWithQuery })
                .then(function (response) {
                try {
                    resolve(JSON.parse(response));
                }
                catch (e) {
                    reject(e);
                }
            }).catch(function (error) {
                reject(error);
            });
        });
    };
    FeedsHelper.prototype.publish = function (item) {
        return this.app.request({
            method: "POST",
            path: this.feedItemsPath(),
            body: { items: [item] }
        });
    };
    FeedsHelper.prototype.feedItemsPath = function () {
        return this.serviceName + "/feeds/" + this.feedId + "/items";
    };
    FeedsHelper.prototype.listFeeds = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.app.request({ method: "GET", path: "feeds" })
                .then(function (responseBody) {
                try {
                    resolve(JSON.parse(responseBody));
                }
                catch (e) {
                    reject(e);
                }
            })
                .catch(function (error) {
                reject(error);
            });
        });
    };
    return FeedsHelper;
}());


/***/ })
/******/ ]);
});