var PusherPlatform =
/******/ (function(modules) { // webpackBootstrap
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
/******/ 	return __webpack_require__(__webpack_require__.s = 10);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
function responseToHeadersObject(headerStr) {
    var headers = {};
    if (!headerStr) {
        return headers;
    }
    var headerPairs = headerStr.split('\u000d\u000a');
    for (var _i = 0, headerPairs_1 = headerPairs; _i < headerPairs_1.length; _i++) {
        var headerPair = headerPairs_1[_i];
        var index = headerPair.indexOf('\u003a\u0020');
        if (index > 0) {
            var key = headerPair.substring(0, index);
            var val = headerPair.substring(index + 2);
            headers[key] = val;
        }
    }
    return headers;
}
exports.responseToHeadersObject = responseToHeadersObject;
var ErrorResponse = (function () {
    function ErrorResponse(statusCode, headers, info) {
        this.statusCode = statusCode;
        this.headers = headers;
        this.info = info;
    }
    ErrorResponse.fromXHR = function (xhr) {
        var errorInfo = xhr.responseText;
        try {
            errorInfo = JSON.parse(xhr.responseText);
        }
        catch (e) {
        }
        return new ErrorResponse(xhr.status, responseToHeadersObject(xhr.getAllResponseHeaders()), errorInfo);
    };
    return ErrorResponse;
}());
exports.ErrorResponse = ErrorResponse;
var NetworkError = (function () {
    function NetworkError(error) {
        this.error = error;
    }
    return NetworkError;
}());
exports.NetworkError = NetworkError;
var ProtocolError = (function () {
    function ProtocolError(error) {
        this.error = error;
    }
    return ProtocolError;
}());
exports.ProtocolError = ProtocolError;
var XhrReadyState;
(function (XhrReadyState) {
    XhrReadyState[XhrReadyState["UNSENT"] = 0] = "UNSENT";
    XhrReadyState[XhrReadyState["OPENED"] = 1] = "OPENED";
    XhrReadyState[XhrReadyState["HEADERS_RECEIVED"] = 2] = "HEADERS_RECEIVED";
    XhrReadyState[XhrReadyState["LOADING"] = 3] = "LOADING";
    XhrReadyState[XhrReadyState["DONE"] = 4] = "DONE";
})(XhrReadyState = exports.XhrReadyState || (exports.XhrReadyState = {}));


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["VERBOSE"] = 1] = "VERBOSE";
    LogLevel[LogLevel["DEBUG"] = 2] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 3] = "INFO";
    LogLevel[LogLevel["WARNING"] = 4] = "WARNING";
    LogLevel[LogLevel["ERROR"] = 5] = "ERROR";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
var ConsoleLogger = (function () {
    function ConsoleLogger(threshold) {
        if (threshold === void 0) { threshold = 2; }
        this.threshold = threshold;
        var groups = Array();
        var hr = '--------------------------------------------------------------------------------';
        if (!self.console.group) {
            self.console.group = function (label) {
                groups.push(label);
                self.console.log('%c \nBEGIN GROUP: %c', hr, label);
            };
        }
        if (!self.console.groupEnd) {
            self.console.groupEnd = function () {
                self.console.log('END GROUP: %c\n%c', groups.pop(), hr);
            };
        }
    }
    ConsoleLogger.prototype.verbose = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
        this.log(self.console.log, LogLevel.VERBOSE, items);
    };
    ConsoleLogger.prototype.debug = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
        this.log(self.console.log, LogLevel.DEBUG, items);
    };
    ConsoleLogger.prototype.info = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
        this.log(self.console.info, LogLevel.INFO, items);
    };
    ConsoleLogger.prototype.warn = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
        this.log(self.console.warn, LogLevel.WARNING, items);
    };
    ConsoleLogger.prototype.error = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
        this.log(self.console.error, LogLevel.ERROR, items);
    };
    ConsoleLogger.prototype.log = function (logFunction, level, items) {
        var _this = this;
        if (level >= this.threshold) {
            var loggerSignature_1 = "Logger." + LogLevel[level];
            if (items.length > 1) {
                self.console.group();
                items.forEach(function (item) {
                    _this.errorAwareLog(logFunction, item, loggerSignature_1);
                });
                self.console.groupEnd();
            }
            else {
                this.errorAwareLog(logFunction, items[0], loggerSignature_1);
            }
        }
    };
    ConsoleLogger.prototype.errorAwareLog = function (logFunction, item, loggerSignature) {
        if (item !== undefined && item.info && item.info.error_uri) {
            var errorDesc = item.info.error_description;
            var errorIntro = errorDesc ? errorDesc : 'An error has occurred';
            logFunction(errorIntro + ". More information can be found at " + item.info.error_uri + ". Error object: ", item);
        }
        else {
            logFunction(loggerSignature + ": ", item);
        }
    };
    return ConsoleLogger;
}());
exports.ConsoleLogger = ConsoleLogger;
var EmptyLogger = (function () {
    function EmptyLogger() {
    }
    EmptyLogger.prototype.verbose = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
    };
    EmptyLogger.prototype.debug = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
    };
    EmptyLogger.prototype.info = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
    };
    EmptyLogger.prototype.warn = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
    };
    EmptyLogger.prototype.error = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
    };
    return EmptyLogger;
}());
exports.EmptyLogger = EmptyLogger;


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var network_1 = __webpack_require__(0);
exports.createRetryStrategyOptionsOrDefault = function (options) {
    var initialTimeoutMillis = options.initialTimeoutMillis || 1000;
    var maxTimeoutMillis = options.maxTimeoutMillis || 5000;
    var limit = -1;
    if (options.limit !== undefined && options.limit != null) {
        limit = options.limit;
    }
    var increaseTimeout;
    if (options.increaseTimeout !== undefined) {
        increaseTimeout = options.increaseTimeout;
    }
    else {
        increaseTimeout = function (currentTimeout) {
            if (currentTimeout * 2 > maxTimeoutMillis) {
                return maxTimeoutMillis;
            }
            else {
                return currentTimeout * 2;
            }
        };
    }
    return {
        increaseTimeout: increaseTimeout,
        initialTimeoutMillis: initialTimeoutMillis,
        limit: limit,
        maxTimeoutMillis: maxTimeoutMillis,
    };
};
var Retry = (function () {
    function Retry(waitTimeMillis) {
        this.waitTimeMillis = waitTimeMillis;
    }
    return Retry;
}());
exports.Retry = Retry;
var DoNotRetry = (function () {
    function DoNotRetry(error) {
        this.error = error;
    }
    return DoNotRetry;
}());
exports.DoNotRetry = DoNotRetry;
var requestMethodIsSafe = function (method) {
    method = method.toUpperCase();
    return (method === 'GET' ||
        method === 'HEAD' ||
        method === 'OPTIONS' ||
        method === 'SUBSCRIBE');
};
var RetryResolution = (function () {
    function RetryResolution(options, logger, retryUnsafeRequests) {
        this.options = options;
        this.logger = logger;
        this.retryUnsafeRequests = retryUnsafeRequests;
        this.currentRetryCount = 0;
        this.initialTimeoutMillis = options.initialTimeoutMillis;
        this.maxTimeoutMillis = options.maxTimeoutMillis;
        this.limit = options.limit;
        this.increaseTimeoutFunction = options.increaseTimeout;
        this.currentBackoffMillis = this.initialTimeoutMillis;
    }
    RetryResolution.prototype.attemptRetry = function (error) {
        this.logger.verbose(this.constructor.name + ": Error received", error);
        if (this.currentRetryCount >= this.limit && this.limit >= 0) {
            this.logger.verbose(this.constructor.name + ": Retry count is over the maximum limit: " + this.limit);
            return new DoNotRetry(error);
        }
        if (error instanceof network_1.ErrorResponse && error.headers['Retry-After']) {
            this.logger.verbose(this.constructor.name + ": Retry-After header is present, retrying in " + error.headers['Retry-After']);
            return new Retry(parseInt(error.headers['Retry-After'], 10) * 1000);
        }
        if (error instanceof network_1.NetworkError ||
            (error instanceof network_1.ErrorResponse &&
                requestMethodIsSafe(error.headers['Request-Method'])) ||
            this.retryUnsafeRequests) {
            return this.shouldSafeRetry(error);
        }
        if (error instanceof network_1.NetworkError) {
            return this.shouldSafeRetry(error);
        }
        this.logger.verbose(this.constructor.name + ": Encountered an error, will retry", error);
        return new Retry(this.calulateMillisToRetry());
    };
    RetryResolution.prototype.shouldSafeRetry = function (error) {
        if (error instanceof network_1.NetworkError) {
            this.logger.verbose(this.constructor.name + ": Encountered a network error, will retry", error);
            return new Retry(this.calulateMillisToRetry());
        }
        else if (error instanceof network_1.ProtocolError) {
            this.logger.verbose(this.constructor.name + ": Encountered a protocol error, will retry", error);
            return new Retry(this.calulateMillisToRetry());
        }
        else if (error instanceof network_1.ErrorResponse) {
            if (error.statusCode >= 500 && error.statusCode < 600) {
                this.logger.verbose(this.constructor.name + ": Error 5xx, will retry");
                return new Retry(this.calulateMillisToRetry());
            }
            else {
                this.logger.verbose(this.constructor.name + ": Error is not retryable", error);
                return new DoNotRetry(error);
            }
        }
        return new Retry(this.calulateMillisToRetry());
    };
    RetryResolution.prototype.calulateMillisToRetry = function () {
        this.currentBackoffMillis = this.increaseTimeoutFunction(this.currentBackoffMillis);
        this.logger.verbose(this.constructor.name + ": Retrying in " + this.currentBackoffMillis + "ms");
        return this.currentBackoffMillis;
    };
    return RetryResolution;
}());
exports.RetryResolution = RetryResolution;


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var logger_1 = __webpack_require__(1);
var request_1 = __webpack_require__(4);
var resuming_subscription_1 = __webpack_require__(5);
var retrying_subscription_1 = __webpack_require__(6);
var subscribe_strategy_1 = __webpack_require__(11);
var subscription_1 = __webpack_require__(12);
var token_providing_subscription_1 = __webpack_require__(7);
var http_1 = __webpack_require__(13);
var websocket_1 = __webpack_require__(14);
var transports_1 = __webpack_require__(8);
var BaseClient = (function () {
    function BaseClient(options) {
        this.options = options;
        this.host = options.host.replace(/(\/)+$/, '');
        this.logger = options.logger || new logger_1.ConsoleLogger();
        this.websocketTransport = new websocket_1.default(this.host);
        this.httpTransport = new http_1.default(this.host, options.encrypted);
        this.sdkProduct = options.sdkProduct || 'unknown';
        this.sdkVersion = options.sdkVersion || 'unknown';
        this.sdkPlatform = navigator
            ? navigator.product === 'ReactNative' ? 'react-native' : 'web'
            : 'node';
    }
    BaseClient.prototype.request = function (options, tokenParams) {
        var _this = this;
        if (options.tokenProvider) {
            return options.tokenProvider
                .fetchToken(tokenParams)
                .then(function (token) {
                if (options.headers !== undefined) {
                    options.headers['Authorization'] = "Bearer " + token;
                }
                else {
                    options.headers = (_a = {},
                        _a['Authorization'] = "Bearer " + token,
                        _a);
                }
                return options;
                var _a;
            })
                .then(function (optionsWithToken) { return _this.makeRequest(optionsWithToken); });
        }
        return this.makeRequest(options);
    };
    BaseClient.prototype.subscribeResuming = function (path, headers, listeners, retryStrategyOptions, initialEventId, tokenProvider) {
        var completeListeners = subscription_1.replaceMissingListenersWithNoOps(listeners);
        var subscribeStrategyListeners = subscribe_strategy_1.subscribeStrategyListenersFromSubscriptionListeners(completeListeners);
        var subscriptionStrategy = resuming_subscription_1.createResumingStrategy(retryStrategyOptions, token_providing_subscription_1.createTokenProvidingStrategy(transports_1.createTransportStrategy(path, this.websocketTransport, this.logger), this.logger, tokenProvider), this.logger, initialEventId);
        var opened = false;
        return subscriptionStrategy({
            onEnd: subscribeStrategyListeners.onEnd,
            onError: subscribeStrategyListeners.onError,
            onEvent: subscribeStrategyListeners.onEvent,
            onOpen: function (subHeaders) {
                if (!opened) {
                    opened = true;
                    subscribeStrategyListeners.onOpen(subHeaders);
                }
                completeListeners.onSubscribe();
            },
            onRetrying: subscribeStrategyListeners.onRetrying,
        }, __assign({}, headers, this.infoHeaders()));
    };
    BaseClient.prototype.subscribeNonResuming = function (path, headers, listeners, retryStrategyOptions, tokenProvider) {
        var completeListeners = subscription_1.replaceMissingListenersWithNoOps(listeners);
        var subscribeStrategyListeners = subscribe_strategy_1.subscribeStrategyListenersFromSubscriptionListeners(completeListeners);
        var subscriptionStrategy = retrying_subscription_1.createRetryingStrategy(retryStrategyOptions, token_providing_subscription_1.createTokenProvidingStrategy(transports_1.createTransportStrategy(path, this.websocketTransport, this.logger), this.logger, tokenProvider), this.logger);
        var opened = false;
        return subscriptionStrategy({
            onEnd: subscribeStrategyListeners.onEnd,
            onError: subscribeStrategyListeners.onError,
            onEvent: subscribeStrategyListeners.onEvent,
            onOpen: function (subHeaders) {
                if (!opened) {
                    opened = true;
                    subscribeStrategyListeners.onOpen(subHeaders);
                }
                completeListeners.onSubscribe();
            },
            onRetrying: subscribeStrategyListeners.onRetrying,
        }, __assign({}, headers, this.infoHeaders()));
    };
    BaseClient.prototype.infoHeaders = function () {
        return {
            'X-SDK-Language': 'javascript',
            'X-SDK-Platform': this.sdkPlatform,
            'X-SDK-Product': this.sdkProduct,
            'X-SDK-Version': this.sdkVersion,
        };
    };
    BaseClient.prototype.makeRequest = function (options) {
        var _this = this;
        return request_1.executeNetworkRequest(function () {
            return _this.httpTransport.request(__assign({}, options, { headers: __assign({}, options.headers, _this.infoHeaders()) }));
        }, options).catch(function (error) {
            _this.logger.error(error);
            throw error;
        });
    };
    return BaseClient;
}());
exports.BaseClient = BaseClient;


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var network_1 = __webpack_require__(0);
function executeNetworkRequest(createXhr, options) {
    return new Promise(function (resolve, reject) {
        var xhr = attachOnReadyStateChangeHandler(createXhr(), resolve, reject);
        sendBody(xhr, options);
    });
}
exports.executeNetworkRequest = executeNetworkRequest;
function sendBody(xhr, options) {
    if (options.json) {
        xhr.send(JSON.stringify(options.json));
    }
    else {
        xhr.send(options.body);
    }
}
function sendRawRequest(options) {
    return new Promise(function (resolve, reject) {
        var xhr = attachOnReadyStateChangeHandler(new self.XMLHttpRequest(), resolve, reject);
        xhr.open(options.method.toUpperCase(), options.url, true);
        if (options.headers) {
            for (var key in options.headers) {
                if (options.headers.hasOwnProperty(key)) {
                    xhr.setRequestHeader(key, options.headers[key]);
                }
            }
        }
        xhr.send(options.body);
    });
}
exports.sendRawRequest = sendRawRequest;
function attachOnReadyStateChangeHandler(xhr, resolve, reject) {
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.response);
            }
            else if (xhr.status !== 0) {
                reject(network_1.ErrorResponse.fromXHR(xhr));
            }
            else {
                reject(new network_1.NetworkError('No Connection'));
            }
        }
    };
    return xhr;
}


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var network_1 = __webpack_require__(0);
var retry_strategy_1 = __webpack_require__(2);
exports.createResumingStrategy = function (retryOptions, nextSubscribeStrategy, logger, initialEventId) {
    var completeRetryOptions = retry_strategy_1.createRetryStrategyOptionsOrDefault(retryOptions);
    var retryResolution = new retry_strategy_1.RetryResolution(completeRetryOptions, logger);
    return function (listeners, headers) {
        return new ResumingSubscription(logger, headers, nextSubscribeStrategy, listeners, retryResolution);
    };
};
var ResumingSubscription = (function () {
    function ResumingSubscription(logger, headers, nextSubscribeStrategy, listeners, retryResolution) {
        var _this = this;
        this.unsubscribe = function () {
            _this.state.unsubscribe();
        };
        this.onTransition = function (newState) {
            _this.state = newState;
        };
        this.state = new OpeningSubscriptionState(this.onTransition, logger, headers, nextSubscribeStrategy, listeners, retryResolution);
    }
    return ResumingSubscription;
}());
var OpeningSubscriptionState = (function () {
    function OpeningSubscriptionState(onTransition, logger, headers, nextSubscribeStrategy, listeners, retryResolution, initialEventId) {
        var _this = this;
        this.onTransition = onTransition;
        this.logger = logger;
        this.headers = headers;
        this.nextSubscribeStrategy = nextSubscribeStrategy;
        this.listeners = listeners;
        this.retryResolution = retryResolution;
        this.initialEventId = initialEventId;
        var lastEventId = initialEventId;
        logger.verbose("ResumingSubscription: transitioning to OpeningSubscriptionState");
        if (lastEventId) {
            headers['Last-Event-Id'] = lastEventId;
            logger.verbose("ResumingSubscription: initialEventId is " + lastEventId);
        }
        this.underlyingSubscription = nextSubscribeStrategy({
            onEnd: function (error) {
                onTransition(new EndedSubscriptionState(logger, listeners, error));
            },
            onError: function (error) {
                onTransition(new ResumingSubscriptionState(error, onTransition, logger, headers, listeners, nextSubscribeStrategy, retryResolution, lastEventId));
            },
            onEvent: function (event) {
                lastEventId = event.eventId;
                listeners.onEvent(event);
            },
            onOpen: function (subHeaders) {
                onTransition(new OpenSubscriptionState(logger, subHeaders, listeners, _this.underlyingSubscription, onTransition));
            },
            onRetrying: listeners.onRetrying,
        }, headers);
    }
    OpeningSubscriptionState.prototype.unsubscribe = function () {
        this.onTransition(new EndingSubscriptionState(this.logger));
        this.underlyingSubscription.unsubscribe();
    };
    return OpeningSubscriptionState;
}());
var OpenSubscriptionState = (function () {
    function OpenSubscriptionState(logger, headers, listeners, underlyingSubscription, onTransition) {
        this.logger = logger;
        this.headers = headers;
        this.listeners = listeners;
        this.underlyingSubscription = underlyingSubscription;
        this.onTransition = onTransition;
        logger.verbose("ResumingSubscription: transitioning to OpenSubscriptionState");
        listeners.onOpen(headers);
    }
    OpenSubscriptionState.prototype.unsubscribe = function () {
        this.onTransition(new EndingSubscriptionState(this.logger));
        this.underlyingSubscription.unsubscribe();
    };
    return OpenSubscriptionState;
}());
var ResumingSubscriptionState = (function () {
    function ResumingSubscriptionState(error, onTransition, logger, headers, listeners, nextSubscribeStrategy, retryResolution, lastEventId) {
        var _this = this;
        this.onTransition = onTransition;
        this.logger = logger;
        this.headers = headers;
        this.listeners = listeners;
        this.nextSubscribeStrategy = nextSubscribeStrategy;
        this.retryResolution = retryResolution;
        logger.verbose("ResumingSubscription: transitioning to ResumingSubscriptionState");
        var executeSubscriptionOnce = function (subError, subLastEventId) {
            listeners.onRetrying();
            var resolveError = function (errToResolve) {
                if (errToResolve instanceof network_1.ErrorResponse) {
                    errToResolve.headers['Request-Method'] = 'SUBSCRIBE';
                }
                return retryResolution.attemptRetry(errToResolve);
            };
            var errorResolution = resolveError(subError);
            if (errorResolution instanceof retry_strategy_1.Retry) {
                _this.timeout = self.setTimeout(function () {
                    executeNextSubscribeStrategy(subLastEventId);
                }, errorResolution.waitTimeMillis);
            }
            else {
                onTransition(new FailedSubscriptionState(logger, listeners, subError));
            }
        };
        var executeNextSubscribeStrategy = function (subLastEventId) {
            logger.verbose("ResumingSubscription: trying to re-establish the subscription");
            if (subLastEventId) {
                logger.verbose("ResumingSubscription: lastEventId: " + subLastEventId);
                headers['Last-Event-Id'] = subLastEventId;
            }
            _this.underlyingSubscription = nextSubscribeStrategy({
                onEnd: function (endError) {
                    onTransition(new EndedSubscriptionState(logger, listeners, endError));
                },
                onError: function (subError) {
                    executeSubscriptionOnce(subError, lastEventId);
                },
                onEvent: function (event) {
                    lastEventId = event.eventId;
                    listeners.onEvent(event);
                },
                onOpen: function (openHeaders) {
                    onTransition(new OpenSubscriptionState(logger, openHeaders, listeners, _this.underlyingSubscription, onTransition));
                },
                onRetrying: listeners.onRetrying,
            }, headers);
        };
        executeSubscriptionOnce(error, lastEventId);
    }
    ResumingSubscriptionState.prototype.unsubscribe = function () {
        this.onTransition(new EndingSubscriptionState(this.logger));
        self.clearTimeout(this.timeout);
        this.underlyingSubscription.unsubscribe();
    };
    return ResumingSubscriptionState;
}());
var EndingSubscriptionState = (function () {
    function EndingSubscriptionState(logger, error) {
        this.logger = logger;
        logger.verbose("ResumingSubscription: transitioning to EndingSubscriptionState");
    }
    EndingSubscriptionState.prototype.unsubscribe = function () {
        throw new Error('Subscription is already ending');
    };
    return EndingSubscriptionState;
}());
var EndedSubscriptionState = (function () {
    function EndedSubscriptionState(logger, listeners, error) {
        this.logger = logger;
        this.listeners = listeners;
        logger.verbose("ResumingSubscription: transitioning to EndedSubscriptionState");
        listeners.onEnd(error);
    }
    EndedSubscriptionState.prototype.unsubscribe = function () {
        throw new Error('Subscription has already ended');
    };
    return EndedSubscriptionState;
}());
var FailedSubscriptionState = (function () {
    function FailedSubscriptionState(logger, listeners, error) {
        this.logger = logger;
        this.listeners = listeners;
        logger.verbose("ResumingSubscription: transitioning to FailedSubscriptionState", error);
        listeners.onError(error);
    }
    FailedSubscriptionState.prototype.unsubscribe = function () {
        throw new Error('Subscription has already ended');
    };
    return FailedSubscriptionState;
}());


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var network_1 = __webpack_require__(0);
var retry_strategy_1 = __webpack_require__(2);
exports.createRetryingStrategy = function (retryOptions, nextSubscribeStrategy, logger) {
    var enrichedRetryOptions = retry_strategy_1.createRetryStrategyOptionsOrDefault(retryOptions);
    var retryResolution = new retry_strategy_1.RetryResolution(enrichedRetryOptions, logger);
    return function (listeners, headers) {
        return new RetryingSubscription(logger, headers, listeners, nextSubscribeStrategy, retryResolution);
    };
};
var RetryingSubscription = (function () {
    function RetryingSubscription(logger, headers, listeners, nextSubscribeStrategy, retryResolution) {
        var _this = this;
        this.unsubscribe = function () {
            _this.state.unsubscribe();
        };
        this.onTransition = function (newState) {
            _this.state = newState;
        };
        this.state = new OpeningSubscriptionState(this.onTransition, logger, headers, listeners, nextSubscribeStrategy, retryResolution);
    }
    return RetryingSubscription;
}());
var OpeningSubscriptionState = (function () {
    function OpeningSubscriptionState(onTransition, logger, headers, listeners, nextSubscribeStrategy, retryResolution) {
        var _this = this;
        this.logger = logger;
        this.headers = headers;
        this.listeners = listeners;
        this.nextSubscribeStrategy = nextSubscribeStrategy;
        this.retryResolution = retryResolution;
        logger.verbose("RetryingSubscription: transitioning to OpeningSubscriptionState");
        this.underlyingSubscription = nextSubscribeStrategy({
            onEnd: function (error) {
                return onTransition(new EndedSubscriptionState(logger, listeners, error));
            },
            onError: function (error) {
                return onTransition(new RetryingSubscriptionState(error, onTransition, logger, headers, listeners, nextSubscribeStrategy, retryResolution));
            },
            onEvent: listeners.onEvent,
            onOpen: function (subHeaders) {
                return onTransition(new OpenSubscriptionState(logger, listeners, subHeaders, _this.underlyingSubscription, onTransition));
            },
            onRetrying: listeners.onRetrying,
        }, headers);
    }
    OpeningSubscriptionState.prototype.unsubscribe = function () {
        this.underlyingSubscription.unsubscribe();
        throw new Error('Method not implemented.');
    };
    return OpeningSubscriptionState;
}());
var RetryingSubscriptionState = (function () {
    function RetryingSubscriptionState(error, onTransition, logger, headers, listeners, nextSubscribeStrategy, retryResolution) {
        var _this = this;
        this.onTransition = onTransition;
        this.logger = logger;
        this.headers = headers;
        this.listeners = listeners;
        this.nextSubscribeStrategy = nextSubscribeStrategy;
        this.retryResolution = retryResolution;
        logger.verbose("RetryingSubscription: transitioning to RetryingSubscriptionState");
        var executeSubscriptionOnce = function (subError) {
            listeners.onRetrying();
            var resolveError = function (errToResolve) {
                if (errToResolve instanceof network_1.ErrorResponse) {
                    errToResolve.headers['Request-Method'] = 'SUBSCRIBE';
                }
                return retryResolution.attemptRetry(errToResolve);
            };
            var errorResolution = resolveError(subError);
            if (errorResolution instanceof retry_strategy_1.Retry) {
                _this.timeout = self.setTimeout(function () {
                    executeNextSubscribeStrategy();
                }, errorResolution.waitTimeMillis);
            }
            else {
                onTransition(new FailedSubscriptionState(logger, listeners, subError));
            }
        };
        var executeNextSubscribeStrategy = function () {
            logger.verbose("RetryingSubscription: trying to re-establish the subscription");
            var underlyingSubscription = nextSubscribeStrategy({
                onEnd: function (endError) {
                    return onTransition(new EndedSubscriptionState(logger, listeners, endError));
                },
                onError: function (subError) { return executeSubscriptionOnce(subError); },
                onEvent: listeners.onEvent,
                onOpen: function (openHeaders) {
                    onTransition(new OpenSubscriptionState(logger, listeners, openHeaders, underlyingSubscription, onTransition));
                },
                onRetrying: listeners.onRetrying,
            }, headers);
        };
        executeSubscriptionOnce(error);
    }
    RetryingSubscriptionState.prototype.unsubscribe = function () {
        self.clearTimeout(this.timeout);
        this.onTransition(new EndedSubscriptionState(this.logger, this.listeners));
    };
    return RetryingSubscriptionState;
}());
var OpenSubscriptionState = (function () {
    function OpenSubscriptionState(logger, listeners, headers, underlyingSubscription, onTransition) {
        this.logger = logger;
        this.listeners = listeners;
        this.headers = headers;
        this.underlyingSubscription = underlyingSubscription;
        this.onTransition = onTransition;
        logger.verbose("RetryingSubscription: transitioning to OpenSubscriptionState");
        listeners.onOpen(headers);
    }
    OpenSubscriptionState.prototype.unsubscribe = function () {
        this.underlyingSubscription.unsubscribe();
        this.onTransition(new EndedSubscriptionState(this.logger, this.listeners));
    };
    return OpenSubscriptionState;
}());
var EndedSubscriptionState = (function () {
    function EndedSubscriptionState(logger, listeners, error) {
        this.logger = logger;
        this.listeners = listeners;
        logger.verbose("RetryingSubscription: transitioning to EndedSubscriptionState");
        listeners.onEnd(error);
    }
    EndedSubscriptionState.prototype.unsubscribe = function () {
        throw new Error('Subscription has already ended');
    };
    return EndedSubscriptionState;
}());
var FailedSubscriptionState = (function () {
    function FailedSubscriptionState(logger, listeners, error) {
        this.logger = logger;
        this.listeners = listeners;
        logger.verbose("RetryingSubscription: transitioning to FailedSubscriptionState", error);
        listeners.onError(error);
    }
    FailedSubscriptionState.prototype.unsubscribe = function () {
        throw new Error('Subscription has already ended');
    };
    return FailedSubscriptionState;
}());


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var network_1 = __webpack_require__(0);
exports.createTokenProvidingStrategy = function (nextSubscribeStrategy, logger, tokenProvider) {
    if (tokenProvider) {
        return function (listeners, headers) {
            return new TokenProvidingSubscription(logger, listeners, headers, tokenProvider, nextSubscribeStrategy);
        };
    }
    return nextSubscribeStrategy;
};
var TokenProvidingSubscription = (function () {
    function TokenProvidingSubscription(logger, listeners, headers, tokenProvider, nextSubscribeStrategy) {
        var _this = this;
        this.logger = logger;
        this.listeners = listeners;
        this.headers = headers;
        this.tokenProvider = tokenProvider;
        this.nextSubscribeStrategy = nextSubscribeStrategy;
        this.unsubscribe = function () {
            _this.state.unsubscribe();
            _this.state = new InactiveState(_this.logger);
        };
        this.state = new ActiveState(logger, headers, nextSubscribeStrategy);
        this.subscribe();
    }
    TokenProvidingSubscription.prototype.subscribe = function () {
        var _this = this;
        this.tokenProvider
            .fetchToken()
            .then(function (token) {
            var existingListeners = Object.assign({}, _this.listeners);
            _this.state.subscribe(token, {
                onEnd: function (error) {
                    _this.state = new InactiveState(_this.logger);
                    existingListeners.onEnd(error);
                },
                onError: function (error) {
                    if (_this.isTokenExpiredError(error)) {
                        _this.tokenProvider.clearToken(token);
                        _this.subscribe();
                    }
                    else {
                        _this.state = new InactiveState(_this.logger);
                        existingListeners.onError(error);
                    }
                },
                onEvent: _this.listeners.onEvent,
                onOpen: _this.listeners.onOpen,
            });
        })
            .catch(function (error) {
            _this.logger.debug('TokenProvidingSubscription: error when fetching token:', error);
            _this.state = new InactiveState(_this.logger);
            _this.listeners.onError(error);
        });
    };
    TokenProvidingSubscription.prototype.isTokenExpiredError = function (error) {
        return (error instanceof network_1.ErrorResponse &&
            error.statusCode === 401 &&
            error.info === 'authentication/expired');
    };
    return TokenProvidingSubscription;
}());
var ActiveState = (function () {
    function ActiveState(logger, headers, nextSubscribeStrategy) {
        this.logger = logger;
        this.headers = headers;
        this.nextSubscribeStrategy = nextSubscribeStrategy;
        logger.verbose('TokenProvidingSubscription: transitioning to ActiveState');
    }
    ActiveState.prototype.subscribe = function (token, listeners) {
        var _this = this;
        this.putTokenIntoHeader(token);
        this.underlyingSubscription = this.nextSubscribeStrategy({
            onEnd: function (error) {
                _this.logger.verbose('TokenProvidingSubscription: subscription ended');
                listeners.onEnd(error);
            },
            onError: function (error) {
                _this.logger.verbose('TokenProvidingSubscription: subscription errored:', error);
                listeners.onError(error);
            },
            onEvent: listeners.onEvent,
            onOpen: function (headers) {
                _this.logger.verbose("TokenProvidingSubscription: subscription opened");
                listeners.onOpen(headers);
            },
            onRetrying: listeners.onRetrying,
        }, this.headers);
    };
    ActiveState.prototype.unsubscribe = function () {
        this.underlyingSubscription.unsubscribe();
    };
    ActiveState.prototype.putTokenIntoHeader = function (token) {
        this.headers['Authorization'] = "Bearer " + token;
        this.logger.verbose("TokenProvidingSubscription: token fetched: " + token);
    };
    return ActiveState;
}());
var InactiveState = (function () {
    function InactiveState(logger) {
        this.logger = logger;
        logger.verbose('TokenProvidingSubscription: transitioning to InactiveState');
    }
    InactiveState.prototype.subscribe = function (token, listeners) {
        this.logger.verbose('TokenProvidingSubscription: subscribe called in Inactive state; doing nothing');
    };
    InactiveState.prototype.unsubscribe = function () {
        this.logger.verbose('TokenProvidingSubscription: unsubscribe called in Inactive state; doing nothing');
    };
    return InactiveState;
}());


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.createTransportStrategy = function (path, transport, logger) {
    return function (listeners, headers) { return transport.subscribe(path, listeners, headers); };
};


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.HOST_BASE = 'pusherplatform.io';


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var base_client_1 = __webpack_require__(3);
exports.BaseClient = base_client_1.BaseClient;
var host_base_1 = __webpack_require__(9);
exports.HOST_BASE = host_base_1.HOST_BASE;
var instance_1 = __webpack_require__(15);
exports.Instance = instance_1.default;
var logger_1 = __webpack_require__(1);
exports.ConsoleLogger = logger_1.ConsoleLogger;
exports.EmptyLogger = logger_1.EmptyLogger;
var network_1 = __webpack_require__(0);
exports.ErrorResponse = network_1.ErrorResponse;
exports.NetworkError = network_1.NetworkError;
exports.responseToHeadersObject = network_1.responseToHeadersObject;
exports.XhrReadyState = network_1.XhrReadyState;
var request_1 = __webpack_require__(4);
exports.executeNetworkRequest = request_1.executeNetworkRequest;
exports.sendRawRequest = request_1.sendRawRequest;
var resuming_subscription_1 = __webpack_require__(5);
exports.createResumingStrategy = resuming_subscription_1.createResumingStrategy;
var retry_strategy_1 = __webpack_require__(2);
exports.createRetryStrategyOptionsOrDefault = retry_strategy_1.createRetryStrategyOptionsOrDefault;
exports.DoNotRetry = retry_strategy_1.DoNotRetry;
exports.Retry = retry_strategy_1.Retry;
exports.RetryResolution = retry_strategy_1.RetryResolution;
var retrying_subscription_1 = __webpack_require__(6);
exports.createRetryingStrategy = retrying_subscription_1.createRetryingStrategy;
var token_providing_subscription_1 = __webpack_require__(7);
exports.createTokenProvidingStrategy = token_providing_subscription_1.createTokenProvidingStrategy;
var transports_1 = __webpack_require__(8);
exports.createTransportStrategy = transports_1.createTransportStrategy;
exports.default = {
    BaseClient: base_client_1.BaseClient,
    ConsoleLogger: logger_1.ConsoleLogger,
    EmptyLogger: logger_1.EmptyLogger,
    Instance: instance_1.default,
};


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeStrategyListenersFromSubscriptionListeners = function (subListeners) {
    return {
        onEnd: subListeners.onEnd,
        onError: subListeners.onError,
        onEvent: subListeners.onEvent,
        onOpen: subListeners.onOpen,
        onRetrying: subListeners.onRetrying,
    };
};


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceMissingListenersWithNoOps = function (listeners) {
    var onEndNoOp = function (error) { };
    var onEnd = listeners.onEnd || onEndNoOp;
    var onErrorNoOp = function (error) { };
    var onError = listeners.onError || onErrorNoOp;
    var onEventNoOp = function (event) { };
    var onEvent = listeners.onEvent || onEventNoOp;
    var onOpenNoOp = function (headers) { };
    var onOpen = listeners.onOpen || onOpenNoOp;
    var onRetryingNoOp = function () { };
    var onRetrying = listeners.onRetrying || onRetryingNoOp;
    var onSubscribeNoOp = function () { };
    var onSubscribe = listeners.onSubscribe || onSubscribeNoOp;
    return {
        onEnd: onEnd,
        onError: onError,
        onEvent: onEvent,
        onOpen: onOpen,
        onRetrying: onRetrying,
        onSubscribe: onSubscribe,
    };
};


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var network_1 = __webpack_require__(0);
var HttpTransportState;
(function (HttpTransportState) {
    HttpTransportState[HttpTransportState["UNOPENED"] = 0] = "UNOPENED";
    HttpTransportState[HttpTransportState["OPENING"] = 1] = "OPENING";
    HttpTransportState[HttpTransportState["OPEN"] = 2] = "OPEN";
    HttpTransportState[HttpTransportState["ENDING"] = 3] = "ENDING";
    HttpTransportState[HttpTransportState["ENDED"] = 4] = "ENDED";
})(HttpTransportState = exports.HttpTransportState || (exports.HttpTransportState = {}));
var HttpSubscription = (function () {
    function HttpSubscription(xhr, listeners) {
        var _this = this;
        this.gotEOS = false;
        this.lastNewlineIndex = 0;
        this.state = HttpTransportState.UNOPENED;
        this.xhr = xhr;
        this.listeners = listeners;
        this.xhr.onreadystatechange = function () {
            switch (_this.xhr.readyState) {
                case network_1.XhrReadyState.UNSENT:
                case network_1.XhrReadyState.OPENED:
                case network_1.XhrReadyState.HEADERS_RECEIVED:
                    _this.assertStateIsIn(HttpTransportState.OPENING);
                    break;
                case network_1.XhrReadyState.LOADING:
                    _this.onLoading();
                    break;
                case network_1.XhrReadyState.DONE:
                    _this.onDone();
                    break;
            }
        };
        this.state = HttpTransportState.OPENING;
        this.xhr.send();
        return this;
    }
    HttpSubscription.prototype.unsubscribe = function () {
        this.state = HttpTransportState.ENDED;
        this.xhr.abort();
        if (this.listeners.onEnd) {
            this.listeners.onEnd(null);
        }
    };
    HttpSubscription.prototype.onLoading = function () {
        this.assertStateIsIn(HttpTransportState.OPENING, HttpTransportState.OPEN, HttpTransportState.ENDING);
        if (this.xhr.status === 200) {
            if (this.state === HttpTransportState.OPENING) {
                this.state = HttpTransportState.OPEN;
                self.console.log(network_1.responseToHeadersObject(this.xhr.getAllResponseHeaders()));
                if (this.listeners.onOpen) {
                    this.listeners.onOpen(network_1.responseToHeadersObject(this.xhr.getAllResponseHeaders()));
                }
            }
            this.assertStateIsIn(HttpTransportState.OPEN);
            var err = this.onChunk();
            this.assertStateIsIn(HttpTransportState.OPEN, HttpTransportState.ENDING);
            if (err) {
                this.state = HttpTransportState.ENDED;
                if (err instanceof network_1.ErrorResponse && err.statusCode !== 204) {
                    if (this.listeners.onError) {
                        this.listeners.onError(err);
                    }
                }
            }
            else {
            }
        }
    };
    HttpSubscription.prototype.onDone = function () {
        if (this.xhr.status === 200) {
            if (this.state === HttpTransportState.OPENING) {
                this.state = HttpTransportState.OPEN;
                if (this.listeners.onOpen) {
                    this.listeners.onOpen(network_1.responseToHeadersObject(this.xhr.getAllResponseHeaders()));
                }
            }
            this.assertStateIsIn(HttpTransportState.OPEN, HttpTransportState.ENDING);
            var err = this.onChunk();
            if (err) {
                this.state = HttpTransportState.ENDED;
                if (err.statusCode === 204) {
                    if (this.listeners.onEnd) {
                        this.listeners.onEnd(null);
                    }
                }
                else {
                    if (this.listeners.onError) {
                        this.listeners.onError(err);
                    }
                }
            }
            else if (this.state <= HttpTransportState.ENDING) {
                if (this.listeners.onError) {
                    this.listeners.onError(new Error('HTTP response ended without receiving EOS message'));
                }
            }
            else {
                if (this.listeners.onEnd) {
                    this.listeners.onEnd(null);
                }
            }
        }
        else {
            this.assertStateIsIn(HttpTransportState.OPENING, HttpTransportState.OPEN, HttpTransportState.ENDED);
            if (this.state === HttpTransportState.ENDED) {
                return;
            }
            else if (this.xhr.status === 0) {
                if (this.listeners.onError) {
                    this.listeners.onError(new network_1.NetworkError('Connection lost.'));
                }
            }
            else {
                if (this.listeners.onError) {
                    this.listeners.onError(network_1.ErrorResponse.fromXHR(this.xhr));
                }
            }
        }
    };
    HttpSubscription.prototype.onChunk = function () {
        this.assertStateIsIn(HttpTransportState.OPEN);
        var response = this.xhr.responseText;
        var newlineIndex = response.lastIndexOf('\n');
        if (newlineIndex > this.lastNewlineIndex) {
            var rawEvents = response
                .slice(this.lastNewlineIndex, newlineIndex)
                .split('\n');
            this.lastNewlineIndex = newlineIndex;
            for (var _i = 0, rawEvents_1 = rawEvents; _i < rawEvents_1.length; _i++) {
                var rawEvent = rawEvents_1[_i];
                if (rawEvent.length === 0) {
                    continue;
                }
                var data = JSON.parse(rawEvent);
                var err = this.onMessage(data);
                if (err != null) {
                    return err;
                }
            }
        }
    };
    HttpSubscription.prototype.assertStateIsIn = function () {
        var _this = this;
        var validStates = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            validStates[_i] = arguments[_i];
        }
        var stateIsValid = validStates.some(function (validState) { return validState === _this.state; });
        if (!stateIsValid) {
            var expectedStates = validStates
                .map(function (state) { return HttpTransportState[state]; })
                .join(', ');
            var actualState = HttpTransportState[this.state];
            self.console.warn("Expected this.state to be one of [" + expectedStates + "] but it is " + actualState);
        }
    };
    HttpSubscription.prototype.onMessage = function (message) {
        this.assertStateIsIn(HttpTransportState.OPEN);
        this.verifyMessage(message);
        switch (message[0]) {
            case 0:
                return null;
            case 1:
                return this.onEventMessage(message);
            case 255:
                return this.onEOSMessage(message);
            default:
                return new Error('Unknown Message: ' + JSON.stringify(message));
        }
    };
    HttpSubscription.prototype.onEventMessage = function (eventMessage) {
        this.assertStateIsIn(HttpTransportState.OPEN);
        if (eventMessage.length !== 4) {
            return new Error('Event message has ' + eventMessage.length + ' elements (expected 4)');
        }
        var _ = eventMessage[0], id = eventMessage[1], headers = eventMessage[2], body = eventMessage[3];
        if (typeof id !== 'string') {
            return new Error('Invalid event ID in message: ' + JSON.stringify(eventMessage));
        }
        if (typeof headers !== 'object' || Array.isArray(headers)) {
            return new Error('Invalid event headers in message: ' + JSON.stringify(eventMessage));
        }
        if (this.listeners.onEvent) {
            this.listeners.onEvent({ body: body, headers: headers, eventId: id });
        }
        return null;
    };
    HttpSubscription.prototype.onEOSMessage = function (eosMessage) {
        this.assertStateIsIn(HttpTransportState.OPEN);
        if (eosMessage.length !== 4) {
            return new Error('EOS message has ' + eosMessage.length + ' elements (expected 4)');
        }
        var _ = eosMessage[0], statusCode = eosMessage[1], headers = eosMessage[2], info = eosMessage[3];
        if (typeof statusCode !== 'number') {
            return new Error('Invalid EOS Status Code');
        }
        if (typeof headers !== 'object' || Array.isArray(headers)) {
            return new Error('Invalid EOS ElementsHeaders');
        }
        this.state = HttpTransportState.ENDING;
        return new network_1.ErrorResponse(statusCode, headers, info);
    };
    HttpSubscription.prototype.verifyMessage = function (message) {
        if (this.gotEOS) {
            return new Error('Got another message after EOS message');
        }
        if (!Array.isArray(message)) {
            return new Error('Message is not an array');
        }
        if (message.length < 1) {
            return new Error('Message is empty array');
        }
    };
    return HttpSubscription;
}());
var HttpTransport = (function () {
    function HttpTransport(host, encrypted) {
        if (encrypted === void 0) { encrypted = true; }
        this.baseURL = (encrypted ? 'https' : 'http') + "://" + host;
    }
    HttpTransport.prototype.request = function (requestOptions) {
        return this.createXHR(this.baseURL, requestOptions);
    };
    HttpTransport.prototype.subscribe = function (path, listeners, headers) {
        var requestOptions = {
            headers: headers,
            method: 'SUBSCRIBE',
            path: path,
        };
        return new HttpSubscription(this.createXHR(this.baseURL, requestOptions), listeners);
    };
    HttpTransport.prototype.createXHR = function (baseURL, options) {
        var xhr = new self.XMLHttpRequest();
        var path = options.path.replace(/^\/+/, '');
        var endpoint = baseURL + "/" + path;
        xhr.open(options.method.toUpperCase(), endpoint, true);
        xhr = this.setJSONHeaderIfAppropriate(xhr, options);
        if (options.jwt) {
            xhr.setRequestHeader('authorization', "Bearer " + options.jwt);
        }
        if (options.headers) {
            for (var key in options.headers) {
                if (options.headers.hasOwnProperty(key)) {
                    xhr.setRequestHeader(key, options.headers[key]);
                }
            }
        }
        return xhr;
    };
    HttpTransport.prototype.setJSONHeaderIfAppropriate = function (xhr, options) {
        if (options.json) {
            xhr.setRequestHeader('content-type', 'application/json');
        }
        return xhr;
    };
    return HttpTransport;
}());
exports.default = HttpTransport;


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var network_1 = __webpack_require__(0);
var SubscribeMessageType = 100;
var OpenMessageType = 101;
var EventMessageType = 102;
var UnsubscribeMessageType = 198;
var EosMessageType = 199;
var PingMessageType = 16;
var PongMessageType = 17;
var CloseMessageType = 99;
var WSReadyState;
(function (WSReadyState) {
    WSReadyState[WSReadyState["Connecting"] = 0] = "Connecting";
    WSReadyState[WSReadyState["Open"] = 1] = "Open";
    WSReadyState[WSReadyState["Closing"] = 2] = "Closing";
    WSReadyState[WSReadyState["Closed"] = 3] = "Closed";
})(WSReadyState = exports.WSReadyState || (exports.WSReadyState = {}));
var WsSubscriptions = (function () {
    function WsSubscriptions() {
        this.subscriptions = {};
    }
    WsSubscriptions.prototype.add = function (subID, path, listeners, headers) {
        this.subscriptions[subID] = {
            headers: headers,
            listeners: listeners,
            path: path,
        };
        return subID;
    };
    WsSubscriptions.prototype.has = function (subID) {
        return this.subscriptions[subID] !== undefined;
    };
    WsSubscriptions.prototype.isEmpty = function () {
        return Object.keys(this.subscriptions).length === 0;
    };
    WsSubscriptions.prototype.remove = function (subID) {
        return delete this.subscriptions[subID];
    };
    WsSubscriptions.prototype.get = function (subID) {
        return this.subscriptions[subID];
    };
    WsSubscriptions.prototype.getAll = function () {
        return this.subscriptions;
    };
    WsSubscriptions.prototype.getAllAsArray = function () {
        var _this = this;
        return Object.keys(this.subscriptions).map(function (subID) { return (__assign({ subID: parseInt(subID, 10) }, _this.subscriptions[parseInt(subID, 10)])); });
    };
    WsSubscriptions.prototype.removeAll = function () {
        this.subscriptions = {};
    };
    return WsSubscriptions;
}());
var WsSubscription = (function () {
    function WsSubscription(wsTransport, subID) {
        this.wsTransport = wsTransport;
        this.subID = subID;
    }
    WsSubscription.prototype.unsubscribe = function () {
        this.wsTransport.unsubscribe(this.subID);
    };
    return WsSubscription;
}());
var pingIntervalMs = 30000;
var pingTimeoutMs = 10000;
var WebSocketTransport = (function () {
    function WebSocketTransport(host) {
        this.webSocketPath = '/ws';
        this.forcedClose = false;
        this.closedError = null;
        this.baseURL = "wss://" + host + this.webSocketPath;
        this.lastSubscriptionID = 0;
        this.subscriptions = new WsSubscriptions();
        this.pendingSubscriptions = new WsSubscriptions();
        this.connect();
    }
    WebSocketTransport.prototype.subscribe = function (path, listeners, headers) {
        self.console.log("At the top of subscribe");
        this.tryReconnectIfNeeded();
        var subID = this.lastSubscriptionID++;
        if (this.socket.readyState !== WSReadyState.Open) {
            self.console.log("Adding PENDING subscription " + subID + " for path: " + path);
            this.pendingSubscriptions.add(subID, path, listeners, headers);
            return new WsSubscription(this, subID);
        }
        self.console.log("Adding subscription " + subID + " for path: " + path);
        this.subscriptions.add(subID, path, listeners, headers);
        this.sendMessage(this.getMessage(SubscribeMessageType, subID, path, headers));
        return new WsSubscription(this, subID);
    };
    WebSocketTransport.prototype.unsubscribe = function (subID) {
        this.sendMessage(this.getMessage(UnsubscribeMessageType, subID));
        var subscription = this.subscriptions.get(subID);
        if (subscription.listeners.onEnd) {
            subscription.listeners.onEnd(null);
        }
        this.subscriptions.remove(subID);
    };
    WebSocketTransport.prototype.connect = function () {
        var _this = this;
        self.console.log("At the top of connect");
        this.forcedClose = false;
        this.closedError = null;
        this.socket = new self.WebSocket(this.baseURL);
        this.socket.onopen = function (event) {
            self.console.log("At the top of socket onopen");
            var allPendingSubscriptions = _this.pendingSubscriptions.getAllAsArray();
            self.console.log("allPendingSubscriptions.length: " + allPendingSubscriptions.length);
            self.console.log(allPendingSubscriptions);
            allPendingSubscriptions.forEach(function (subscription) {
                var subID = subscription.subID, path = subscription.path, listeners = subscription.listeners, headers = subscription.headers;
                _this.subscribePending(path, listeners, headers, subID);
            });
            _this.pendingSubscriptions.removeAll();
            _this.pingInterval = self.setInterval(function () {
                if (_this.pongTimeout) {
                    return;
                }
                var now = new Date().getTime();
                if (pingTimeoutMs > now - _this.lastMessageReceivedTimestamp) {
                    return;
                }
                _this.sendMessage(_this.getMessage(PingMessageType, now));
                _this.lastSentPingID = now;
                _this.pongTimeout = self.setTimeout(function () {
                    var pongNow = new Date().getTime();
                    if (pingTimeoutMs > pongNow - _this.lastMessageReceivedTimestamp) {
                        _this.pongTimeout = null;
                        return;
                    }
                    self.console.log("Calling close because pong response timeout");
                    _this.close(new network_1.NetworkError("Pong response wasn't received until timeout."));
                }, pingTimeoutMs);
            }, pingIntervalMs);
        };
        this.socket.onmessage = function (event) { return _this.receiveMessage(event); };
        this.socket.onerror = function (event) {
            self.console.log("Received an error in onerror");
            self.console.log(event);
        };
        this.socket.onclose = function (event) {
            self.console.log("At the top of onclose, about to call trace");
            self.console.trace();
            self.console.log("Trace end");
            self.console.log("Is there a closedError?");
            self.console.log(_this.closedError);
            var callback = _this.closedError
                ? function (subscription) {
                    if (subscription.listeners.onError) {
                        subscription.listeners.onError(_this.closedError);
                    }
                }
                : function (subscription) {
                    if (subscription.listeners.onEnd) {
                        subscription.listeners.onEnd(null);
                    }
                };
            self.console.log("Pending subscriptions empty?: " + _this.pendingSubscriptions.isEmpty());
            self.console.log(_this.pendingSubscriptions);
            self.console.log("this.subscriptions list:");
            self.console.log(_this.subscriptions);
            var allSubscriptions = _this.pendingSubscriptions.isEmpty()
                ? _this.subscriptions
                : _this.pendingSubscriptions;
            allSubscriptions.getAllAsArray().forEach(callback);
            allSubscriptions.removeAll();
            self.console.log("Forced close and in onclose and there was a closedError so we will go to tryReconnectIfNeeded");
            _this.tryReconnectIfNeeded();
        };
    };
    WebSocketTransport.prototype.close = function (error) {
        if (!(this.socket instanceof self.WebSocket)) {
            return;
        }
        self.console.log("Doing a forced close");
        var onClose = this.socket.onclose.bind(this);
        delete this.socket.onclose;
        delete this.socket.onerror;
        delete this.socket.onmessage;
        delete this.socket.onopen;
        this.forcedClose = true;
        this.closedError = error;
        self.console.log("THIS.SOCKET.CLOSE ABOUT TO BE CALLED");
        this.socket.close();
        self.clearTimeout(this.pingInterval);
        self.clearTimeout(this.pongTimeout);
        delete this.pongTimeout;
        this.lastSentPingID = null;
        onClose();
    };
    WebSocketTransport.prototype.tryReconnectIfNeeded = function () {
        if (this.forcedClose || this.socket.readyState === WSReadyState.Closed) {
            self.console.log("About to try to (re)connect");
            this.connect();
        }
    };
    WebSocketTransport.prototype.subscribePending = function (path, listeners, headers, subID) {
        if (subID === undefined) {
            self.console.log("Subscription to path " + path + " has an undefined ID");
            return;
        }
        this.subscriptions.add(subID, path, listeners, headers);
        this.sendMessage(this.getMessage(SubscribeMessageType, subID, path, headers));
    };
    WebSocketTransport.prototype.getMessage = function (messageType, id, path, headers) {
        return [messageType, id, path, headers];
    };
    WebSocketTransport.prototype.sendMessage = function (message) {
        if (this.socket.readyState !== WSReadyState.Open) {
            return self.console.warn("Can't send in \"" + WSReadyState[this.socket.readyState] + "\" state");
        }
        this.socket.send(JSON.stringify(message));
    };
    WebSocketTransport.prototype.subscription = function (subID) {
        return this.subscriptions.get(subID);
    };
    WebSocketTransport.prototype.receiveMessage = function (event) {
        this.lastMessageReceivedTimestamp = new Date().getTime();
        var message;
        try {
            message = JSON.parse(event.data);
        }
        catch (err) {
            self.console.log("Calling close because invalid JSON in message");
            this.close(new network_1.ProtocolError("Message is not valid JSON format. Getting " + event.data));
            return;
        }
        var nonValidMessageError = this.validateMessage(message);
        if (nonValidMessageError) {
            self.console.log("Calling close because message is invalid");
            this.close(nonValidMessageError);
            return;
        }
        var messageType = message.shift();
        switch (messageType) {
            case PongMessageType:
                this.onPongMessage(message);
                return;
            case PingMessageType:
                this.onPingMessage(message);
                return;
            case CloseMessageType:
                this.onCloseMessage(message);
                return;
        }
        var subID = message.shift();
        var subscription = this.subscription(subID);
        if (!subscription) {
            self.console.log("Calling close because no subscription found for subID " + subID);
            this.close(new Error("Received message for non existing subscription id: \"" + subID + "\""));
            return;
        }
        var listeners = subscription.listeners;
        switch (messageType) {
            case OpenMessageType:
                this.onOpenMessage(message, subID, listeners);
                break;
            case EventMessageType:
                this.onEventMessage(message, listeners);
                break;
            case EosMessageType:
                this.onEOSMessage(message, subID, listeners);
                break;
            default:
                self.console.log("Calling close because of invalid message type");
                this.close(new network_1.ProtocolError('Received non existing type of message.'));
        }
    };
    WebSocketTransport.prototype.validateMessage = function (message) {
        if (!Array.isArray(message)) {
            return new network_1.ProtocolError("Message is expected to be an array. Getting: " + JSON.stringify(message));
        }
        if (message.length < 1) {
            return new network_1.ProtocolError("Message is empty array: " + JSON.stringify(message));
        }
        return null;
    };
    WebSocketTransport.prototype.onOpenMessage = function (message, subID, subscriptionListeners) {
        if (subscriptionListeners.onOpen) {
            subscriptionListeners.onOpen(message[1]);
        }
    };
    WebSocketTransport.prototype.onEventMessage = function (eventMessage, subscriptionListeners) {
        if (eventMessage.length !== 3) {
            new network_1.ProtocolError('Event message has ' + eventMessage.length + ' elements (expected 4)');
        }
        var eventId = eventMessage[0], headers = eventMessage[1], body = eventMessage[2];
        if (typeof eventId !== 'string') {
            new network_1.ProtocolError("Invalid event ID in message: " + JSON.stringify(eventMessage));
        }
        if (typeof headers !== 'object' || Array.isArray(headers)) {
            new network_1.ProtocolError("Invalid event headers in message: " + JSON.stringify(eventMessage));
        }
        if (subscriptionListeners.onEvent) {
            subscriptionListeners.onEvent({ eventId: eventId, headers: headers, body: body });
        }
    };
    WebSocketTransport.prototype.onEOSMessage = function (eosMessage, subID, subscriptionListeners) {
        self.console.log("Received EOS message for sub " + subID);
        this.subscriptions.remove(subID);
        if (eosMessage.length !== 3) {
            if (subscriptionListeners.onError) {
                subscriptionListeners.onError(new network_1.ProtocolError("EOS message has " + eosMessage.length + " elements (expected 4)"));
            }
            return;
        }
        var statusCode = eosMessage[0], headers = eosMessage[1], body = eosMessage[2];
        if (typeof statusCode !== 'number') {
            if (subscriptionListeners.onError) {
                subscriptionListeners.onError(new network_1.ProtocolError('Invalid EOS Status Code'));
            }
            return;
        }
        if (typeof headers !== 'object' || Array.isArray(headers)) {
            if (subscriptionListeners.onError) {
                subscriptionListeners.onError(new network_1.ProtocolError('Invalid EOS ElementsHeaders'));
            }
            return;
        }
        if (statusCode === 204) {
            if (subscriptionListeners.onEnd) {
                subscriptionListeners.onEnd(null);
            }
            return;
        }
        if (subscriptionListeners.onError) {
            subscriptionListeners.onError(new network_1.ErrorResponse(statusCode, headers, body));
        }
        return;
    };
    WebSocketTransport.prototype.onCloseMessage = function (closeMessage) {
        var statusCode = closeMessage[0], headers = closeMessage[1], body = closeMessage[2];
        if (typeof statusCode !== 'number') {
            self.console.log("Calling close because of invalid EOS Status Code");
            return this.close(new network_1.ProtocolError('Close message: Invalid EOS Status Code'));
        }
        if (typeof headers !== 'object' || Array.isArray(headers)) {
            self.console.log("Calling close because of invalid EOS ElementsHeaders");
            return this.close(new network_1.ProtocolError('Close message: Invalid EOS ElementsHeaders'));
        }
        self.console.log("NOT Calling close because at end of onCloseMessage function");
        var errorInfo = {
            error: body.error || 'network_error',
            error_description: body.error_description || 'Network error',
        };
        this.closedError = new network_1.ErrorResponse(statusCode, headers, errorInfo);
    };
    WebSocketTransport.prototype.onPongMessage = function (message) {
        var receviedPongID = message[0];
        if (this.lastSentPingID !== receviedPongID) {
            self.console.warn("Received pong with ID " + receviedPongID + " but lastSentPingID was " + this.lastSentPingID);
        }
        self.console.log("Received pong ID " + receviedPongID);
        self.clearTimeout(this.pongTimeout);
        delete this.pongTimeout;
        this.lastSentPingID = null;
    };
    WebSocketTransport.prototype.onPingMessage = function (message) {
        var receviedPingID = message[0];
        self.console.log("Received ping ID " + receviedPingID);
        this.sendMessage(this.getMessage(PongMessageType, receviedPingID));
    };
    return WebSocketTransport;
}());
exports.default = WebSocketTransport;


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var base_client_1 = __webpack_require__(3);
var host_base_1 = __webpack_require__(9);
var logger_1 = __webpack_require__(1);
var Instance = (function () {
    function Instance(options) {
        if (!options.locator) {
            throw new Error('Expected `locator` property in Instance options!');
        }
        var splitInstanceLocator = options.locator.split(':');
        if (splitInstanceLocator.length !== 3) {
            throw new Error('The instance locator supplied is invalid. Did you copy it correctly from the Pusher dashboard?');
        }
        if (!options.serviceName) {
            throw new Error('Expected `serviceName` property in Instance options!');
        }
        if (!options.serviceVersion) {
            throw new Error('Expected `serviceVersion` property in Instance options!');
        }
        this.platformVersion = splitInstanceLocator[0];
        this.cluster = splitInstanceLocator[1];
        this.id = splitInstanceLocator[2];
        this.serviceName = options.serviceName;
        this.serviceVersion = options.serviceVersion;
        this.host = options.host || this.cluster + "." + host_base_1.HOST_BASE;
        this.logger = options.logger || new logger_1.ConsoleLogger();
        this.client =
            options.client ||
                new base_client_1.BaseClient({
                    encrypted: options.encrypted,
                    host: this.host,
                    logger: this.logger,
                });
        this.tokenProvider = options.tokenProvider;
    }
    Instance.prototype.request = function (options, tokenParams) {
        options.path = this.absPath(options.path);
        if (options.headers == null || options.headers === undefined) {
            options.headers = {};
        }
        options.tokenProvider = options.tokenProvider || this.tokenProvider;
        return this.client.request(options, tokenParams);
    };
    Instance.prototype.subscribeNonResuming = function (options) {
        var headers = options.headers || {};
        var retryStrategyOptions = options.retryStrategyOptions || {};
        var tokenProvider = options.tokenProvider || this.tokenProvider;
        return this.client.subscribeNonResuming(this.absPath(options.path), headers, options.listeners, retryStrategyOptions, tokenProvider);
    };
    Instance.prototype.subscribeResuming = function (options) {
        var headers = options.headers || {};
        var retryStrategyOptions = options.retryStrategyOptions || {};
        var tokenProvider = options.tokenProvider || this.tokenProvider;
        return this.client.subscribeResuming(this.absPath(options.path), headers, options.listeners, retryStrategyOptions, options.initialEventId, tokenProvider);
    };
    Instance.prototype.absPath = function (relativePath) {
        return ("/services/" + this.serviceName + "/" + this.serviceVersion + "/" + this.id + "/" + relativePath)
            .replace(/\/+/g, '/')
            .replace(/\/+$/, '');
    };
    return Instance;
}());
exports.default = Instance;


/***/ })
/******/ ]);