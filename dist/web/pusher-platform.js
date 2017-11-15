(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["PusherPlatform"] = factory();
	else
		root["PusherPlatform"] = factory();
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
/******/ 	return __webpack_require__(__webpack_require__.s = 9);
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
    for (var i = 0; i < headerPairs.length; i++) {
        var headerPair = headerPairs[i];
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
        return new ErrorResponse(xhr.status, responseToHeadersObject(xhr.getAllResponseHeaders()), xhr.responseText);
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
var network_1 = __webpack_require__(0);
exports.createRetryStrategyOptionsOrDefault = function (options) {
    var initialTimeoutMillis = options.initialTimeoutMillis || 1000;
    var maxTimeoutMillis = options.maxTimeoutMillis || 5000;
    var limit = -1;
    if (options.limit != undefined && options.limit != null) {
        limit = options.limit;
    }
    var increaseTimeout;
    if (options.increaseTimeout) {
        increaseTimeout = options.increaseTimeout;
    }
    else {
        increaseTimeout = function (currentTimeout) {
            if ((currentTimeout * 2) > maxTimeoutMillis) {
                return maxTimeoutMillis;
            }
            else {
                return currentTimeout * 2;
            }
        };
    }
    return {
        initialTimeoutMillis: initialTimeoutMillis,
        maxTimeoutMillis: maxTimeoutMillis,
        limit: limit,
        increaseTimeout: increaseTimeout
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
    return method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || method === 'SUBSCRIBE';
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
        this.logger.verbose(this.constructor.name + ":  Error received", error);
        if (this.currentRetryCount >= this.limit && this.limit >= 0) {
            this.logger.verbose(this.constructor.name + ":  Retry count is over the maximum limit: " + this.limit);
            return new DoNotRetry(error);
        }
        if (error instanceof network_1.ErrorResponse && error.headers['Retry-After']) {
            this.logger.verbose(this.constructor.name + ":  Retry-After header is present, retrying in " + error.headers['Retry-After']);
            return new Retry(parseInt(error.headers['Retry-After']) * 1000);
        }
        if (error instanceof network_1.NetworkError || (error instanceof network_1.ErrorResponse && requestMethodIsSafe(error.headers["Request-Method"])) || this.retryUnsafeRequests) {
            return this.shouldSafeRetry(error);
        }
        if (error instanceof network_1.NetworkError)
            return this.shouldSafeRetry(error);
        this.logger.verbose(this.constructor.name + ": Error is not retryable", error);
        return new DoNotRetry(error);
    };
    RetryResolution.prototype.shouldSafeRetry = function (error) {
        if (error instanceof network_1.NetworkError) {
            this.logger.verbose(this.constructor.name + ": It's a Network Error, will retry", error);
            return new Retry(this.calulateMillisToRetry());
        }
        else if (error instanceof network_1.ErrorResponse) {
            if (error.statusCode >= 500 && error.statusCode < 600) {
                this.logger.verbose(this.constructor.name + ": Error 5xx, will retry");
                return new Retry(this.calulateMillisToRetry());
            }
        }
        this.logger.verbose(this.constructor.name + ": Error is not retryable", error);
        return new DoNotRetry(error);
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
/* 2 */
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
        var groups = [];
        var hr = '--------------------------------------------------------------------------------';
        if (!window.console.group) {
            window.console.group = function (label) {
                groups.push(label);
                window.console.log('%c \nBEGIN GROUP: %c', hr, label);
            };
        }
        if (!window.console.groupEnd) {
            window.console.groupEnd = function () {
                window.console.log('END GROUP: %c\n%c', groups.pop(), hr);
            };
        }
    }
    ConsoleLogger.prototype.verbose = function (message, error) {
        this.log(window.console.log, LogLevel.VERBOSE, message, error);
    };
    ConsoleLogger.prototype.debug = function (message, error) {
        this.log(window.console.log, LogLevel.DEBUG, message, error);
    };
    ConsoleLogger.prototype.info = function (message, error) {
        this.log(window.console.info, LogLevel.INFO, message, error);
    };
    ConsoleLogger.prototype.warn = function (message, error) {
        this.log(window.console.warn, LogLevel.WARNING, message, error);
    };
    ConsoleLogger.prototype.error = function (message, error) {
        this.log(window.console.error, LogLevel.ERROR, message, error);
    };
    ConsoleLogger.prototype.log = function (logFunction, level, message, error) {
        if (level >= this.threshold) {
            var loggerSignature = "Logger." + LogLevel[level];
            if (error) {
                window.console.group();
                logFunction(loggerSignature + ": " + message);
                logFunction(error);
                window.console.groupEnd();
            }
            else {
                logFunction(loggerSignature + ": " + message);
            }
        }
    };
    return ConsoleLogger;
}());
exports.ConsoleLogger = ConsoleLogger;
var EmptyLogger = (function () {
    function EmptyLogger() {
    }
    EmptyLogger.prototype.verbose = function (message, error) { };
    ;
    EmptyLogger.prototype.debug = function (message, error) { };
    ;
    EmptyLogger.prototype.info = function (message, error) { };
    ;
    EmptyLogger.prototype.warn = function (message, error) { };
    ;
    EmptyLogger.prototype.error = function (message, error) { };
    ;
    return EmptyLogger;
}());
exports.EmptyLogger = EmptyLogger;


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.createTransportStrategy = function (path, transport, logger) {
    var strategy = function (listeners, headers) { return (transport.subscribe(path, listeners, headers)); };
    return strategy;
};


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var network_1 = __webpack_require__(0);
var PCancelable = __webpack_require__(10);
function executeNetworkRequest(createXhr, options) {
    var cancelablePromise = new PCancelable(function (onCancel, resolve, reject) {
        var xhr = createXhr();
        onCancel(function () {
            xhr.abort();
        });
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.response);
                }
                else if (xhr.status !== 0) {
                    reject(network_1.ErrorResponse.fromXHR(xhr));
                }
                else {
                    reject(new network_1.NetworkError("No Connection"));
                }
            }
        };
        xhr.send(JSON.stringify(options.body));
    });
    return cancelablePromise;
}
exports.executeNetworkRequest = executeNetworkRequest;


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var retry_strategy_1 = __webpack_require__(1);
var network_1 = __webpack_require__(0);
exports.createResumingStrategy = function (retryOptions, initialEventId, nextSubscribeStrategy, logger) {
    retryOptions = retry_strategy_1.createRetryStrategyOptionsOrDefault(retryOptions);
    var retryResolution = new retry_strategy_1.RetryResolution(retryOptions, logger);
    var ResumingSubscription = (function () {
        function ResumingSubscription(listeners, headers) {
            var _this = this;
            this.onTransition = function (newState) {
                _this.state = newState;
            };
            this.unsubscribe = function () {
                _this.state.unsubscribe();
            };
            var OpeningSubscriptionState = (function () {
                function OpeningSubscriptionState(onTransition) {
                    var _this = this;
                    this.onTransition = onTransition;
                    var lastEventId = initialEventId;
                    logger.verbose("ResumingSubscription: transitioning to OpeningSubscriptionState");
                    if (lastEventId) {
                        headers["Last-Event-Id"] = lastEventId;
                        logger.verbose("ResumingSubscription: initialEventId is " + lastEventId);
                    }
                    this.underlyingSubscription = nextSubscribeStrategy({
                        onOpen: function (headers) {
                            onTransition(new OpenSubscriptionState(headers, _this.underlyingSubscription, onTransition));
                        },
                        onRetrying: listeners.onRetrying,
                        onError: function (error) {
                            onTransition(new ResumingSubscriptionState(error, lastEventId, onTransition));
                        },
                        onEvent: function (event) {
                            lastEventId = event.eventId;
                            listeners.onEvent(event);
                        },
                        onEnd: function (error) {
                            onTransition(new EndedSubscriptionState(error));
                        }
                    }, headers);
                }
                OpeningSubscriptionState.prototype.unsubscribe = function () {
                    this.onTransition(new EndingSubscriptionState());
                    this.underlyingSubscription.unsubscribe();
                };
                return OpeningSubscriptionState;
            }());
            var OpenSubscriptionState = (function () {
                function OpenSubscriptionState(headers, underlyingSubscription, onTransition) {
                    this.underlyingSubscription = underlyingSubscription;
                    this.onTransition = onTransition;
                    logger.verbose("ResumingSubscription: transitioning to OpenSubscriptionState");
                    listeners.onOpen(headers);
                }
                OpenSubscriptionState.prototype.unsubscribe = function () {
                    this.onTransition(new EndingSubscriptionState());
                    this.underlyingSubscription.unsubscribe();
                };
                return OpenSubscriptionState;
            }());
            var ResumingSubscriptionState = (function () {
                function ResumingSubscriptionState(error, lastEventId, onTransition) {
                    var _this = this;
                    this.onTransition = onTransition;
                    logger.verbose("ResumingSubscription: transitioning to ResumingSubscriptionState");
                    var executeSubscriptionOnce = function (error, lastEventId) {
                        listeners.onRetrying();
                        var resolveError = function (error) {
                            if (error instanceof network_1.ErrorResponse) {
                                error.headers["Request-Method"] = "SUBSCRIBE";
                            }
                            return retryResolution.attemptRetry(error);
                        };
                        var errorResolution = resolveError(error);
                        if (errorResolution instanceof retry_strategy_1.Retry) {
                            _this.timeout = window.setTimeout(function () {
                                executeNextSubscribeStrategy(lastEventId);
                            }, errorResolution.waitTimeMillis);
                        }
                        else {
                            onTransition(new FailedSubscriptionState(error));
                        }
                    };
                    var executeNextSubscribeStrategy = function (lastEventId) {
                        logger.verbose("ResumingSubscription: trying to re-establish the subscription");
                        if (lastEventId) {
                            logger.verbose("ResumingSubscription: lastEventId: " + lastEventId);
                            headers["Last-Event-Id"] = lastEventId;
                        }
                        _this.underlyingSubscription = nextSubscribeStrategy({
                            onOpen: function (headers) {
                                onTransition(new OpenSubscriptionState(headers, _this.underlyingSubscription, onTransition));
                            },
                            onRetrying: listeners.onRetrying,
                            onError: function (error) {
                                executeSubscriptionOnce(error, lastEventId);
                            },
                            onEvent: function (event) {
                                lastEventId = event.eventId;
                                listeners.onEvent(event);
                            },
                            onEnd: function (error) {
                                onTransition(new EndedSubscriptionState(error));
                            },
                        }, headers);
                    };
                    executeSubscriptionOnce(error, lastEventId);
                }
                ResumingSubscriptionState.prototype.unsubscribe = function () {
                    this.onTransition(new EndingSubscriptionState());
                    this.underlyingSubscription.unsubscribe();
                    window.clearTimeout(this.timeout);
                };
                return ResumingSubscriptionState;
            }());
            var EndingSubscriptionState = (function () {
                function EndingSubscriptionState(error) {
                    logger.verbose("ResumingSubscription: transitioning to EndingSubscriptionState");
                }
                EndingSubscriptionState.prototype.unsubscribe = function () {
                    throw new Error("Subscription is already ending");
                };
                return EndingSubscriptionState;
            }());
            var EndedSubscriptionState = (function () {
                function EndedSubscriptionState(error) {
                    logger.verbose("ResumingSubscription: transitioning to EndedSubscriptionState");
                    listeners.onEnd(error);
                }
                EndedSubscriptionState.prototype.unsubscribe = function () {
                    throw new Error("Subscription has already ended");
                };
                return EndedSubscriptionState;
            }());
            var FailedSubscriptionState = (function () {
                function FailedSubscriptionState(error) {
                    logger.verbose("ResumingSubscription: transitioning to FailedSubscriptionState", error);
                    listeners.onError(error);
                }
                FailedSubscriptionState.prototype.unsubscribe = function () {
                    throw new Error("Subscription has already ended");
                };
                return FailedSubscriptionState;
            }());
            this.state = new OpeningSubscriptionState(this.onTransition);
        }
        return ResumingSubscription;
    }());
    return function (listeners, headers) {
        return new ResumingSubscription(listeners, headers);
    };
};


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var retrying_subscription_1 = __webpack_require__(7);
var resuming_subscription_1 = __webpack_require__(5);
var request_1 = __webpack_require__(4);
var logger_1 = __webpack_require__(2);
var subscription_1 = __webpack_require__(12);
var token_providing_subscription_1 = __webpack_require__(8);
var transports_1 = __webpack_require__(3);
var subscribe_strategy_1 = __webpack_require__(13);
var websocket_1 = __webpack_require__(14);
var http_1 = __webpack_require__(15);
var BaseClient = (function () {
    function BaseClient(options) {
        this.options = options;
        this.host = options.host.replace(/(\/)+$/, '');
        this.logger = options.logger || new logger_1.ConsoleLogger();
        this.websocketTransport = new websocket_1.default(this.host);
        this.httpTransport = new http_1.default(this.host);
    }
    BaseClient.prototype.request = function (options, tokenProvider, tokenParams) {
        var _this = this;
        if (tokenProvider) {
            return tokenProvider.fetchToken(tokenParams).then(function (token) {
                options.headers['Authorization'] = "Bearer " + token;
                return request_1.executeNetworkRequest(function () { return _this.httpTransport.request(options); }, options);
            }).catch(function (error) {
                _this.logger.error(error);
            });
        }
        else {
            return request_1.executeNetworkRequest(function () { return _this.httpTransport.request(options); }, options);
        }
    };
    BaseClient.prototype.subscribeResuming = function (path, headers, listeners, retryStrategyOptions, initialEventId, tokenProvider) {
        listeners = subscription_1.replaceMissingListenersWithNoOps(listeners);
        var subscribeStrategyListeners = subscribe_strategy_1.subscribeStrategyListenersFromSubscriptionListeners(listeners);
        var subscriptionStrategy = resuming_subscription_1.createResumingStrategy(retryStrategyOptions, initialEventId, token_providing_subscription_1.createTokenProvidingStrategy(tokenProvider, transports_1.createTransportStrategy(path, this.websocketTransport, this.logger), this.logger), this.logger);
        var opened = false;
        return subscriptionStrategy({
            onOpen: function (headers) {
                if (!opened) {
                    opened = true;
                    listeners.onOpen(headers);
                }
                listeners.onSubscribe();
            },
            onRetrying: subscribeStrategyListeners.onRetrying,
            onError: subscribeStrategyListeners.onError,
            onEvent: subscribeStrategyListeners.onEvent,
            onEnd: subscribeStrategyListeners.onEnd
        }, headers);
    };
    BaseClient.prototype.subscribeNonResuming = function (path, headers, listeners, retryStrategyOptions, tokenProvider) {
        listeners = subscription_1.replaceMissingListenersWithNoOps(listeners);
        var subscribeStrategyListeners = subscribe_strategy_1.subscribeStrategyListenersFromSubscriptionListeners(listeners);
        var subscriptionStrategy = retrying_subscription_1.createRetryingStrategy(retryStrategyOptions, token_providing_subscription_1.createTokenProvidingStrategy(tokenProvider, transports_1.createTransportStrategy(path, this.websocketTransport, this.logger), this.logger), this.logger);
        var opened = false;
        return subscriptionStrategy({
            onOpen: function (headers) {
                if (!opened) {
                    opened = true;
                    listeners.onOpen(headers);
                }
                listeners.onSubscribe();
            },
            onRetrying: subscribeStrategyListeners.onRetrying,
            onError: subscribeStrategyListeners.onError,
            onEvent: subscribeStrategyListeners.onEvent,
            onEnd: subscribeStrategyListeners.onEnd
        }, headers);
    };
    return BaseClient;
}());
exports.BaseClient = BaseClient;


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var retry_strategy_1 = __webpack_require__(1);
var network_1 = __webpack_require__(0);
exports.createRetryingStrategy = function (retryOptions, nextSubscribeStrategy, logger) {
    retryOptions = retry_strategy_1.createRetryStrategyOptionsOrDefault(retryOptions);
    var retryResolution = new retry_strategy_1.RetryResolution(retryOptions, logger);
    var RetryingSubscription = (function () {
        function RetryingSubscription(listeners, headers) {
            var _this = this;
            this.onTransition = function (newState) {
                _this.state = newState;
            };
            this.unsubscribe = function () {
                _this.state.unsubscribe();
            };
            var OpeningSubscriptionState = (function () {
                function OpeningSubscriptionState(onTransition) {
                    var _this = this;
                    logger.verbose("RetryingSubscription: transitioning to OpeningSubscriptionState");
                    this.underlyingSubscription = nextSubscribeStrategy({
                        onOpen: function (headers) { return onTransition(new OpenSubscriptionState(headers, _this.underlyingSubscription, onTransition)); },
                        onRetrying: listeners.onRetrying,
                        onError: function (error) { return onTransition(new RetryingSubscriptionState(error, onTransition)); },
                        onEvent: listeners.onEvent,
                        onEnd: function (error) { return onTransition(new EndedSubscriptionState(error)); }
                    }, headers);
                }
                OpeningSubscriptionState.prototype.unsubscribe = function () {
                    this.underlyingSubscription.unsubscribe();
                    throw new Error("Method not implemented.");
                };
                return OpeningSubscriptionState;
            }());
            var RetryingSubscriptionState = (function () {
                function RetryingSubscriptionState(error, onTransition) {
                    var _this = this;
                    this.onTransition = onTransition;
                    logger.verbose("RetryingSubscription: transitioning to RetryingSubscriptionState");
                    var executeSubscriptionOnce = function (error) {
                        listeners.onRetrying();
                        var resolveError = function (error) {
                            if (error instanceof network_1.ErrorResponse) {
                                error.headers["Request-Method"] = "SUBSCRIBE";
                            }
                            return retryResolution.attemptRetry(error);
                        };
                        var errorResolution = resolveError(error);
                        if (errorResolution instanceof retry_strategy_1.Retry) {
                            _this.timeout = window.setTimeout(function () {
                                executeNextSubscribeStrategy();
                            }, errorResolution.waitTimeMillis);
                        }
                        else {
                            onTransition(new FailedSubscriptionState(error));
                        }
                    };
                    var executeNextSubscribeStrategy = function () {
                        logger.verbose("RetryingSubscription: trying to re-establish the subscription");
                        var underlyingSubscription = nextSubscribeStrategy({
                            onOpen: function (headers) {
                                onTransition(new OpenSubscriptionState(headers, underlyingSubscription, onTransition));
                            },
                            onRetrying: listeners.onRetrying,
                            onError: function (error) { return executeSubscriptionOnce(error); },
                            onEvent: listeners.onEvent,
                            onEnd: function (error) { return onTransition(new EndedSubscriptionState(error)); }
                        }, headers);
                    };
                    executeSubscriptionOnce(error);
                }
                RetryingSubscriptionState.prototype.unsubscribe = function () {
                    window.clearTimeout(this.timeout);
                    this.onTransition(new EndedSubscriptionState());
                };
                return RetryingSubscriptionState;
            }());
            var OpenSubscriptionState = (function () {
                function OpenSubscriptionState(headers, underlyingSubscription, onTransition) {
                    this.underlyingSubscription = underlyingSubscription;
                    this.onTransition = onTransition;
                    logger.verbose("RetryingSubscription: transitioning to OpenSubscriptionState");
                    listeners.onOpen(headers);
                }
                OpenSubscriptionState.prototype.unsubscribe = function () {
                    this.underlyingSubscription.unsubscribe();
                    this.onTransition(new EndedSubscriptionState());
                };
                return OpenSubscriptionState;
            }());
            var EndedSubscriptionState = (function () {
                function EndedSubscriptionState(error) {
                    logger.verbose("RetryingSubscription: transitioning to EndedSubscriptionState");
                    listeners.onEnd(error);
                }
                EndedSubscriptionState.prototype.unsubscribe = function () {
                    throw new Error("Subscription has already ended");
                };
                return EndedSubscriptionState;
            }());
            var FailedSubscriptionState = (function () {
                function FailedSubscriptionState(error) {
                    logger.verbose("RetryingSubscription: transitioning to FailedSubscriptionState", error);
                    listeners.onError(error);
                }
                FailedSubscriptionState.prototype.unsubscribe = function () {
                    throw new Error("Subscription has already ended");
                };
                return FailedSubscriptionState;
            }());
            this.state = new OpeningSubscriptionState(this.onTransition);
        }
        return RetryingSubscription;
    }());
    return function (listeners, headers) { return new RetryingSubscription(listeners, headers); };
};


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var network_1 = __webpack_require__(0);
exports.createTokenProvidingStrategy = function (tokenProvider, nextSubscribeStrategy, logger) {
    var TokenProvidingSubscription = (function () {
        function TokenProvidingSubscription(listeners, headers) {
            var _this = this;
            this.onTransition = function (newState) {
                _this.state = newState;
            };
            this.unsubscribe = function () {
                _this.state.unsubscribe();
            };
            var TokenProvidingState = (function () {
                function TokenProvidingState(onTransition) {
                    var _this = this;
                    this.onTransition = onTransition;
                    logger.verbose("TokenProvidingSubscription: transitioning to TokenProvidingState");
                    var isTokenExpiredError = function (error) {
                        return (error instanceof network_1.ErrorResponse &&
                            error.statusCode === 401 &&
                            error.info === "authentication/expired");
                    };
                    var fetchTokenAndExecuteSubscription = function () {
                        _this.tokenPromise = tokenProvider.fetchToken()
                            .then(function (token) {
                            _this.putTokenIntoHeader(token);
                            _this.underlyingSubscription = nextSubscribeStrategy({
                                onOpen: function (headers) {
                                    onTransition(new OpenSubscriptionState(headers, _this.underlyingSubscription, onTransition));
                                },
                                onRetrying: listeners.onRetrying,
                                onError: function (error) {
                                    if (isTokenExpiredError(error)) {
                                        tokenProvider.clearToken(token);
                                        fetchTokenAndExecuteSubscription();
                                    }
                                    else {
                                        onTransition(new FailedSubscriptionState(error));
                                    }
                                },
                                onEvent: listeners.onEvent,
                                onEnd: function (error) {
                                    onTransition(new EndedSubscriptionState(error));
                                }
                            }, headers);
                        })
                            .catch(function (error) {
                            (function (error) {
                                onTransition(new FailedSubscriptionState(error));
                            });
                        });
                    };
                    fetchTokenAndExecuteSubscription();
                }
                TokenProvidingState.prototype.unsubscribe = function () {
                    if (this.tokenPromise)
                        this.tokenPromise.cancel();
                    this.underlyingSubscription.unsubscribe();
                    this.onTransition(new EndedSubscriptionState());
                };
                TokenProvidingState.prototype.putTokenIntoHeader = function (token) {
                    if (token) {
                        headers['Authorization'] = "Bearer " + token;
                        logger.verbose("TokenProvidingSubscription: token fetched: " + token);
                    }
                };
                return TokenProvidingState;
            }());
            var OpenSubscriptionState = (function () {
                function OpenSubscriptionState(headers, underlyingSubscription, onTransition) {
                    this.headers = headers;
                    this.underlyingSubscription = underlyingSubscription;
                    this.onTransition = onTransition;
                    logger.verbose("TokenProvidingSubscription: transitioning to OpenSubscriptionState");
                    listeners.onOpen(headers);
                }
                OpenSubscriptionState.prototype.unsubscribe = function () {
                    this.underlyingSubscription.unsubscribe();
                    this.onTransition(new EndedSubscriptionState());
                };
                return OpenSubscriptionState;
            }());
            var FailedSubscriptionState = (function () {
                function FailedSubscriptionState(error) {
                    logger.verbose("TokenProvidingSubscription: transitioning to FailedSubscriptionState", error);
                    listeners.onError(error);
                }
                FailedSubscriptionState.prototype.unsubscribe = function () {
                    throw new Error("Subscription has already ended");
                };
                return FailedSubscriptionState;
            }());
            var EndedSubscriptionState = (function () {
                function EndedSubscriptionState(error) {
                    logger.verbose("TokenProvidingSubscription: transitioning to EndedSubscriptionState");
                    listeners.onEnd(error);
                }
                EndedSubscriptionState.prototype.unsubscribe = function () {
                    throw new Error("Subscription has already ended");
                };
                return EndedSubscriptionState;
            }());
            this.state = new TokenProvidingState(this.onTransition);
        }
        return TokenProvidingSubscription;
    }());
    if (tokenProvider) {
        return function (listeners, headers) { return new TokenProvidingSubscription(listeners, headers); };
    }
    else {
        return function (listeners, headers) {
            return nextSubscribeStrategy(listeners, headers);
        };
    }
};


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var transports_1 = __webpack_require__(3);
exports.createTransportStrategy = transports_1.createTransportStrategy;
var request_1 = __webpack_require__(4);
exports.executeNetworkRequest = request_1.executeNetworkRequest;
var resuming_subscription_1 = __webpack_require__(5);
exports.createResumingStrategy = resuming_subscription_1.createResumingStrategy;
var retry_strategy_1 = __webpack_require__(1);
exports.createRetryStrategyOptionsOrDefault = retry_strategy_1.createRetryStrategyOptionsOrDefault;
exports.DoNotRetry = retry_strategy_1.DoNotRetry;
exports.Retry = retry_strategy_1.Retry;
exports.RetryResolution = retry_strategy_1.RetryResolution;
var instance_1 = __webpack_require__(11);
exports.Instance = instance_1.default;
var base_client_1 = __webpack_require__(6);
exports.BaseClient = base_client_1.BaseClient;
var logger_1 = __webpack_require__(2);
exports.ConsoleLogger = logger_1.ConsoleLogger;
exports.EmptyLogger = logger_1.EmptyLogger;
var retrying_subscription_1 = __webpack_require__(7);
exports.createRetryingStrategy = retrying_subscription_1.createRetryingStrategy;
var token_providing_subscription_1 = __webpack_require__(8);
exports.createTokenProvidingStrategy = token_providing_subscription_1.createTokenProvidingStrategy;
var network_1 = __webpack_require__(0);
exports.ErrorResponse = network_1.ErrorResponse;
exports.NetworkError = network_1.NetworkError;
exports.responseToHeadersObject = network_1.responseToHeadersObject;
exports.XhrReadyState = network_1.XhrReadyState;
exports.default = {
    Instance: instance_1.default,
    BaseClient: base_client_1.BaseClient,
    ConsoleLogger: logger_1.ConsoleLogger, EmptyLogger: logger_1.EmptyLogger,
};


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


class CancelError extends Error {
	constructor() {
		super('Promise was canceled');
		this.name = 'CancelError';
	}
}

class PCancelable {
	static fn(fn) {
		return function () {
			const args = [].slice.apply(arguments);
			return new PCancelable((onCancel, resolve, reject) => {
				args.unshift(onCancel);
				fn.apply(null, args).then(resolve, reject);
			});
		};
	}

	constructor(executor) {
		this._pending = true;
		this._canceled = false;

		this._promise = new Promise((resolve, reject) => {
			this._reject = reject;

			return executor(
				fn => {
					this._cancel = fn;
				},
				val => {
					this._pending = false;
					resolve(val);
				},
				err => {
					this._pending = false;
					reject(err);
				}
			);
		});
	}

	then() {
		return this._promise.then.apply(this._promise, arguments);
	}

	catch() {
		return this._promise.catch.apply(this._promise, arguments);
	}

	cancel() {
		if (!this._pending || this._canceled) {
			return;
		}

		if (typeof this._cancel === 'function') {
			try {
				this._cancel();
			} catch (err) {
				this._reject(err);
			}
		}

		this._canceled = true;
		this._reject(new CancelError());
	}

	get canceled() {
		return this._canceled;
	}
}

Object.setPrototypeOf(PCancelable.prototype, Promise.prototype);

module.exports = PCancelable;
module.exports.CancelError = CancelError;


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var base_client_1 = __webpack_require__(6);
var logger_1 = __webpack_require__(2);
var HOST_BASE = "pusherplatform.io";
var Instance = (function () {
    function Instance(options) {
        if (!options.locator)
            throw new Error('Expected `locator` property in Instance options!');
        if (options.locator.split(":").length !== 3)
            throw new Error('The locator property is in the wrong format!');
        if (!options.serviceName)
            throw new Error('Expected `serviceName` property in Instance options!');
        if (!options.serviceVersion)
            throw new Error('Expected `serviceVersion` property in Instance otpions!');
        var splitLocator = options.locator.split(":");
        this.platformVersion = splitLocator[0];
        this.cluster = splitLocator[1];
        this.id = splitLocator[2];
        this.serviceName = options.serviceName;
        this.serviceVersion = options.serviceVersion;
        this.host = options.host || this.cluster + "." + HOST_BASE;
        this.logger = options.logger || new logger_1.ConsoleLogger();
        this.client = options.client || new base_client_1.BaseClient({
            encrypted: options.encrypted,
            host: this.host,
            logger: this.logger
        });
        this.tokenProvider = options.tokenProvider;
    }
    Instance.prototype.request = function (options, tokenProvider, tokenParams) {
        options.path = this.absPath(options.path);
        if (options.headers == null || options.headers == undefined) {
            options.headers = {};
        }
        var tokenProviderToUse = tokenProvider || this.tokenProvider;
        return this.client.request(options, tokenProviderToUse, tokenParams);
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
        return ("/services/" + this.serviceName + "/" + this.serviceVersion + "/" + this.id + "/" + relativePath).replace(/\/+/g, "/").replace(/\/+$/, "");
    };
    return Instance;
}());
exports.default = Instance;


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
;
var noop = function (arg) { };
exports.replaceMissingListenersWithNoOps = function (listeners) {
    var onOpen = listeners.onOpen || noop;
    var onSubscribe = listeners.onSubscribe || noop;
    var onEvent = listeners.onEvent || noop;
    var onError = listeners.onError || noop;
    var onEnd = listeners.onEnd || noop;
    var onRetrying = listeners.onRetrying || noop;
    return {
        onOpen: onOpen,
        onSubscribe: onSubscribe,
        onRetrying: onRetrying,
        onEvent: onEvent,
        onError: onError,
        onEnd: onEnd
    };
};


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeStrategyListenersFromSubscriptionListeners = function (subListeners) {
    return {
        onOpen: subListeners.onOpen,
        onRetrying: subListeners.onRetrying,
        onError: subListeners.onError,
        onEvent: subListeners.onEvent,
        onEnd: subListeners.onEnd
    };
};


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
;
var WsSubscriptions = (function () {
    function WsSubscriptions() {
        this.subscriptions = {};
    }
    WsSubscriptions.prototype.add = function (subID, path, listeners, headers) {
        this.subscriptions[subID] = {
            path: path,
            listeners: listeners,
            headers: headers
        };
        return subID;
    };
    WsSubscriptions.prototype.has = function (subID) {
        return this.subscriptions[subID] != undefined;
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
        return Object.keys(this.subscriptions).map(function (subID) { return (__assign({ subID: parseInt(subID) }, _this.subscriptions[subID])); });
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
    WebSocketTransport.prototype.connect = function () {
        var _this = this;
        this.close();
        this.forcedClose = false;
        this.closedError = null;
        this.socket = new window.WebSocket(this.baseURL);
        this.socket.onopen = function (event) {
            var allPendingSubscriptions = _this.pendingSubscriptions.getAllAsArray();
            allPendingSubscriptions.forEach(function (subscription) {
                var subID = subscription.subID, path = subscription.path, listeners = subscription.listeners, headers = subscription.headers;
                _this.subscribePending(path, listeners, headers, subID);
            });
            _this.pendingSubscriptions.removeAll();
            _this.pingInterval = window.setInterval(function () {
                if (_this.pongTimeout) {
                    return;
                }
                var now = new Date().getTime();
                if (pingTimeoutMs > (now - _this.lastMessageReceivedTimestamp)) {
                    return;
                }
                _this.sendMessage(_this.getMessage(PingMessageType, now));
                _this.lastSentPingID = now;
                _this.pongTimeout = window.setTimeout(function () {
                    var now = new Date().getTime();
                    if (pingTimeoutMs > (now - _this.lastMessageReceivedTimestamp)) {
                        _this.pongTimeout = null;
                        return;
                    }
                    _this.close(new network_1.NetworkError("Pong response wasn't received until timeout."));
                }, pingTimeoutMs);
            }, pingIntervalMs);
        };
        this.socket.onmessage = function (event) { return _this.receiveMessage(event); };
        this.socket.onerror = function (event) {
            _this.close(new network_1.NetworkError('Connection was lost.'));
        };
        this.socket.onclose = function (event) {
            if (!_this.forcedClose) {
                _this.tryReconnectIfNeeded();
                return;
            }
            var callback = (_this.closedError) ?
                function (subscription) { return subscription.listeners.onError(_this.closedError); } :
                function (subscription) { return subscription.listeners.onEnd(null); };
            var allSubscriptions = (_this.pendingSubscriptions.isEmpty() === false) ?
                _this.pendingSubscriptions :
                _this.subscriptions;
            allSubscriptions
                .getAllAsArray()
                .forEach(callback);
            allSubscriptions.removeAll();
            if (_this.closedError) {
                _this.tryReconnectIfNeeded();
            }
        };
    };
    WebSocketTransport.prototype.close = function (error) {
        if (!(this.socket instanceof window.WebSocket)) {
            return;
        }
        this.forcedClose = true;
        this.closedError = error;
        this.socket.close();
        window.clearTimeout(this.pingInterval);
        window.clearTimeout(this.pongTimeout);
        delete this.pongTimeout;
        this.lastSentPingID = null;
    };
    WebSocketTransport.prototype.tryReconnectIfNeeded = function () {
        if (this.socket.readyState !== WSReadyState.Closed) {
            return;
        }
        this.connect();
    };
    WebSocketTransport.prototype.subscribe = function (path, listeners, headers) {
        this.tryReconnectIfNeeded();
        var subID = this.lastSubscriptionID++;
        if (this.socket.readyState !== WSReadyState.Open) {
            this.pendingSubscriptions.add(subID, path, listeners, headers);
            return new WsSubscription(this, subID);
        }
        this.subscriptions.add(subID, path, listeners, headers);
        this.sendMessage(this.getMessage(SubscribeMessageType, subID, path, headers));
        return new WsSubscription(this, subID);
    };
    WebSocketTransport.prototype.subscribePending = function (path, listeners, headers, subID) {
        this.subscriptions.add(subID, path, listeners, headers);
        this.sendMessage(this.getMessage(SubscribeMessageType, subID, path, headers));
    };
    WebSocketTransport.prototype.unsubscribe = function (subID) {
        this.sendMessage(this.getMessage(UnsubscribeMessageType, subID));
        this.subscriptions.get(subID).listeners.onEnd(null);
        this.subscriptions.remove(subID);
    };
    WebSocketTransport.prototype.getMessage = function (messageType, id, path, headers) {
        return [
            messageType,
            id,
            path,
            headers
        ];
    };
    WebSocketTransport.prototype.sendMessage = function (message) {
        if (this.socket.readyState !== WSReadyState.Open) {
            return window.console.warn("Can't send in \"" + WSReadyState[this.socket.readyState] + "\" state");
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
            this.close(new Error("Message is not valid JSON format. Getting " + event.data));
            return;
        }
        var nonValidMessageError = this.validateMessage(message);
        if (nonValidMessageError) {
            this.close(new Error(nonValidMessageError.message));
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
                this.close(new Error('Received non existing type of message.'));
        }
    };
    WebSocketTransport.prototype.validateMessage = function (message) {
        if (!Array.isArray(message)) {
            return new Error("Message is expected to be an array. Getting: " + JSON.stringify(message));
        }
        if (message.length < 1) {
            return new Error("Message is empty array: " + JSON.stringify(message));
        }
        return null;
    };
    WebSocketTransport.prototype.onOpenMessage = function (message, subID, subscriptionListeners) {
        subscriptionListeners.onOpen(message[1]);
    };
    WebSocketTransport.prototype.onEventMessage = function (eventMessage, subscriptionListeners) {
        if (eventMessage.length !== 3) {
            return new Error('Event message has ' + eventMessage.length + ' elements (expected 4)');
        }
        var eventId = eventMessage[0], headers = eventMessage[1], body = eventMessage[2];
        if (typeof eventId !== 'string') {
            return new Error("Invalid event ID in message: " + JSON.stringify(eventMessage));
        }
        if (typeof headers !== 'object' || Array.isArray(headers)) {
            return new Error("Invalid event headers in message: " + JSON.stringify(eventMessage));
        }
        subscriptionListeners.onEvent({ eventId: eventId, headers: headers, body: body });
    };
    WebSocketTransport.prototype.onEOSMessage = function (eosMessage, subID, subscriptionListeners) {
        this.subscriptions.remove(subID);
        if (eosMessage.length !== 3) {
            return subscriptionListeners.onError(new Error("EOS message has " + eosMessage.length + " elements (expected 4)"));
        }
        var statusCode = eosMessage[0], headers = eosMessage[1], body = eosMessage[2];
        if (typeof statusCode !== 'number') {
            return subscriptionListeners.onError(new Error('Invalid EOS Status Code'));
        }
        if (typeof headers !== 'object' || Array.isArray(headers)) {
            return subscriptionListeners.onError(new Error('Invalid EOS ElementsHeaders'));
        }
        if (statusCode === 204) {
            return subscriptionListeners.onEnd(null);
        }
        return subscriptionListeners.onError(new network_1.ErrorResponse(statusCode, headers, body));
    };
    WebSocketTransport.prototype.onCloseMessage = function (closeMessage) {
        var statusCode = closeMessage[0], headers = closeMessage[1], body = closeMessage[2];
        if (typeof statusCode !== 'number') {
            return this.close(new Error('Close message: Invalid EOS Status Code'));
        }
        if (typeof headers !== 'object' || Array.isArray(headers)) {
            return this.close(new Error('Close message: Invalid EOS ElementsHeaders'));
        }
        this.close();
    };
    WebSocketTransport.prototype.onPongMessage = function (message) {
        var receviedPongID = message[0];
        if (this.lastSentPingID !== receviedPongID) {
            this.close(new network_1.NetworkError("Didn't received pong with proper ID"));
        }
        window.clearTimeout(this.pongTimeout);
        delete this.pongTimeout;
        this.lastSentPingID = null;
    };
    WebSocketTransport.prototype.onPingMessage = function (message) {
        var receviedPingID = message[0];
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
var network_1 = __webpack_require__(0);
var HttpTransportState;
(function (HttpTransportState) {
    HttpTransportState[HttpTransportState["UNOPENED"] = 0] = "UNOPENED";
    HttpTransportState[HttpTransportState["OPENING"] = 1] = "OPENING";
    HttpTransportState[HttpTransportState["OPEN"] = 2] = "OPEN";
    HttpTransportState[HttpTransportState["ENDING"] = 3] = "ENDING";
    HttpTransportState[HttpTransportState["ENDED"] = 4] = "ENDED";
})(HttpTransportState = exports.HttpTransportState || (exports.HttpTransportState = {}));
;
var HttpSubscription = (function () {
    function HttpSubscription(xhr, listeners) {
        var _this = this;
        this.state = HttpTransportState.UNOPENED;
        this.lastNewlineIndex = 0;
        this.gotEOS = false;
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
        this.listeners.onEnd(null);
    };
    HttpSubscription.prototype.onLoading = function () {
        this.assertStateIsIn(HttpTransportState.OPENING, HttpTransportState.OPEN, HttpTransportState.ENDING);
        if (this.xhr.status === 200) {
            if (this.state === HttpTransportState.OPENING) {
                this.state = HttpTransportState.OPEN;
                this.listeners.onOpen(network_1.responseToHeadersObject(this.xhr.getAllResponseHeaders()));
                window.console.log(network_1.responseToHeadersObject(this.xhr.getAllResponseHeaders()));
            }
            this.assertStateIsIn(HttpTransportState.OPEN);
            var err = this.onChunk();
            this.assertStateIsIn(HttpTransportState.OPEN, HttpTransportState.ENDING);
            if (err) {
                this.state = HttpTransportState.ENDED;
                if (err instanceof network_1.ErrorResponse && err.statusCode != 204) {
                    this.listeners.onError(err);
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
                this.listeners.onOpen(network_1.responseToHeadersObject(this.xhr.getAllResponseHeaders()));
            }
            this.assertStateIsIn(HttpTransportState.OPEN, HttpTransportState.ENDING);
            var err = this.onChunk();
            if (err) {
                this.state = HttpTransportState.ENDED;
                if (err.statusCode === 204) {
                    this.listeners.onEnd(null);
                }
                else {
                    this.listeners.onError(err);
                }
            }
            else if (this.state <= HttpTransportState.ENDING) {
                this.listeners.onError(new Error("HTTP response ended without receiving EOS message"));
            }
            else {
                this.listeners.onEnd(null);
            }
        }
        else {
            this.assertStateIsIn(HttpTransportState.OPENING, HttpTransportState.OPEN, HttpTransportState.ENDED);
            if (this.state === HttpTransportState.ENDED) {
                return;
            }
            else if (this.xhr.status === 0) {
                this.listeners.onError(new network_1.NetworkError("Connection lost."));
            }
            else {
                this.listeners.onError(network_1.ErrorResponse.fromXHR(this.xhr));
            }
        }
    };
    HttpSubscription.prototype.onChunk = function () {
        this.assertStateIsIn(HttpTransportState.OPEN);
        var response = this.xhr.responseText;
        var newlineIndex = response.lastIndexOf("\n");
        if (newlineIndex > this.lastNewlineIndex) {
            var rawEvents = response.slice(this.lastNewlineIndex, newlineIndex).split("\n");
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
            var expectedStates = validStates.map(function (state) { return HttpTransportState[state]; }).join(', ');
            var actualState = HttpTransportState[this.state];
            window.console.warn("Expected this.state to be one of [" + expectedStates + "] but it is " + actualState);
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
                return new Error("Unknown Message: " + JSON.stringify(message));
        }
    };
    HttpSubscription.prototype.onEventMessage = function (eventMessage) {
        this.assertStateIsIn(HttpTransportState.OPEN);
        if (eventMessage.length !== 4) {
            return new Error("Event message has " + eventMessage.length + " elements (expected 4)");
        }
        var _ = eventMessage[0], id = eventMessage[1], headers = eventMessage[2], body = eventMessage[3];
        if (typeof id !== "string") {
            return new Error("Invalid event ID in message: " + JSON.stringify(eventMessage));
        }
        if (typeof headers !== "object" || Array.isArray(headers)) {
            return new Error("Invalid event headers in message: " + JSON.stringify(eventMessage));
        }
        this.listeners.onEvent({ eventId: id, headers: headers, body: body });
    };
    HttpSubscription.prototype.onEOSMessage = function (eosMessage) {
        this.assertStateIsIn(HttpTransportState.OPEN);
        if (eosMessage.length !== 4) {
            return new Error("EOS message has " + eosMessage.length + " elements (expected 4)");
        }
        var _ = eosMessage[0], statusCode = eosMessage[1], headers = eosMessage[2], info = eosMessage[3];
        if (typeof statusCode !== "number") {
            return new Error("Invalid EOS Status Code");
        }
        if (typeof headers !== "object" || Array.isArray(headers)) {
            return new Error("Invalid EOS ElementsHeaders");
        }
        this.state = HttpTransportState.ENDING;
        return new network_1.ErrorResponse(statusCode, headers, info);
    };
    HttpSubscription.prototype.verifyMessage = function (message) {
        if (this.gotEOS) {
            return new Error("Got another message after EOS message");
        }
        if (!Array.isArray(message)) {
            return new Error("Message is not an array");
        }
        if (message.length < 1) {
            return new Error("Message is empty array");
        }
    };
    return HttpSubscription;
}());
var HttpTransport = (function () {
    function HttpTransport(host, encrypted) {
        this.baseURL = (encrypted !== false ? "https" : "http") + "://" + host;
    }
    HttpTransport.prototype.request = function (requestOptions) {
        return this.createXHR(this.baseURL, requestOptions);
    };
    HttpTransport.prototype.subscribe = function (path, listeners, headers) {
        var requestOptions = {
            method: "SUBSCRIBE",
            path: path,
            headers: headers
        };
        return new HttpSubscription(this.createXHR(this.baseURL, requestOptions), listeners);
    };
    HttpTransport.prototype.createXHR = function (baseURL, options) {
        var path = options.path.replace(/^\/+/, "");
        var endpoint = baseURL + "/" + path;
        var xhr = new window.XMLHttpRequest();
        xhr.open(options.method.toUpperCase(), endpoint, true);
        if (options.body) {
            xhr.setRequestHeader("content-type", "application/json");
        }
        if (options.jwt) {
            xhr.setRequestHeader("authorization", "Bearer " + options.jwt);
        }
        for (var key in options.headers) {
            xhr.setRequestHeader(key, options.headers[key]);
        }
        return xhr;
    };
    return HttpTransport;
}());
exports.default = HttpTransport;


/***/ })
/******/ ]);
});