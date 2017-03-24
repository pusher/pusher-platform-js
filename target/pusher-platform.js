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

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	function responseHeadersObj(headerStr) {
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
	var ErrorResponse = (function () {
	    function ErrorResponse(xhr) {
	        this.statusCode = xhr.status;
	        this.headers = responseHeadersObj(xhr.getAllResponseHeaders());
	        this.info = xhr.responseText;
	    }
	    return ErrorResponse;
	}());
	// Follows https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/readyState
	var XhrReadyState;
	(function (XhrReadyState) {
	    XhrReadyState[XhrReadyState["UNSENT"] = 0] = "UNSENT";
	    XhrReadyState[XhrReadyState["OPENED"] = 1] = "OPENED";
	    XhrReadyState[XhrReadyState["HEADERS_RECEIVED"] = 2] = "HEADERS_RECEIVED";
	    XhrReadyState[XhrReadyState["LOADING"] = 3] = "LOADING";
	    XhrReadyState[XhrReadyState["DONE"] = 4] = "DONE";
	})(XhrReadyState || (XhrReadyState = {}));
	var SubscriptionState;
	(function (SubscriptionState) {
	    SubscriptionState[SubscriptionState["UNOPENED"] = 0] = "UNOPENED";
	    SubscriptionState[SubscriptionState["OPENING"] = 1] = "OPENING";
	    SubscriptionState[SubscriptionState["OPEN"] = 2] = "OPEN";
	    SubscriptionState[SubscriptionState["ENDING"] = 3] = "ENDING";
	    SubscriptionState[SubscriptionState["ENDED"] = 4] = "ENDED"; // called onEnd() or onError(err)
	})(SubscriptionState || (SubscriptionState = {}));
	// Asserts that the subscription state is one of the specified values,
	// otherwise logs the current value.
	function assertState(stateEnum, states) {
	    var _this = this;
	    if (states === void 0) { states = []; }
	    var check = states.some(function (state) { return stateEnum[state] === _this.state; });
	    var expected = states.join(', ');
	    var actual = stateEnum[this.state];
	    console.assert(check, "Expected this.state to be " + expected + " but it is " + actual);
	    if (!check) {
	        console.trace();
	    }
	}
	;
	// Callback pattern: (onOpen onEvent* (onEnd|onError)) | onError
	// A call to `unsubscribe()` will call `options.onEnd()`;
	// a call to `unsubscribe(someError)` will call `options.onError(someError)`.
	var Subscription = (function () {
	    function Subscription(xhr, options) {
	        var _this = this;
	        this.xhr = xhr;
	        this.options = options;
	        this.state = SubscriptionState.UNOPENED;
	        this.gotEOS = false;
	        this.lastNewlineIndex = 0;
	        this.assertState = assertState.bind(this, SubscriptionState);
	        if (options.lastEventId) {
	            this.xhr.setRequestHeader("Last-Event-Id", options.lastEventId);
	        }
	        this.xhr.onreadystatechange = function () {
	            if (_this.xhr.readyState === XhrReadyState.UNSENT ||
	                _this.xhr.readyState === XhrReadyState.OPENED ||
	                _this.xhr.readyState === XhrReadyState.HEADERS_RECEIVED) {
	                // Too early for us to do anything.
	                _this.assertState(['OPENING']);
	            }
	            else if (_this.xhr.readyState === XhrReadyState.LOADING) {
	                // The headers have loaded and we have partial body text.
	                // We can get this one multiple times.
	                _this.assertState(['OPENING', 'OPEN', 'ENDING']);
	                if (_this.xhr.status === 200) {
	                    // We've received a successful response header.
	                    // The partial body text is a partial JSON message stream.
	                    if (_this.state === SubscriptionState.OPENING) {
	                        _this.state = SubscriptionState.OPEN;
	                        if (_this.options.onOpen) {
	                            _this.options.onOpen();
	                        }
	                    }
	                    _this.assertState(['OPEN', 'ENDING']);
	                    var err = _this.onChunk(); // might transition our state from OPEN -> ENDING
	                    _this.assertState(['OPEN', 'ENDING']);
	                    if (err != null) {
	                        _this.xhr.abort();
	                        // Because we abort()ed, we will get no more calls to our onreadystatechange handler,
	                        // and so we will not call the event handler again.
	                        // Finish with options.onError instead of the options.onEnd.
	                        _this.state = SubscriptionState.ENDED;
	                        if (_this.options.onError) {
	                            _this.options.onError(err);
	                        }
	                    }
	                    else {
	                        // We consumed some response text, and all's fine. We expect more text.
	                    }
	                }
	                else {
	                    // Error response. Wait until the response completes (state 4) before erroring.
	                    _this.assertState(['OPENING']);
	                }
	            }
	            else if (_this.xhr.readyState === XhrReadyState.DONE) {
	                // This is the last time onreadystatechange is called.
	                if (_this.xhr.status === 200) {
	                    if (_this.state === SubscriptionState.OPENING) {
	                        _this.state = SubscriptionState.OPEN;
	                        if (_this.options.onOpen) {
	                            _this.options.onOpen();
	                        }
	                    }
	                    _this.assertState(['OPEN', 'ENDING']);
	                    var err = _this.onChunk();
	                    if (err !== null && err !== undefined) {
	                        _this.state = SubscriptionState.ENDED;
	                        if (_this.options.onError) {
	                            _this.options.onError(err);
	                        }
	                    }
	                    else if (_this.state !== SubscriptionState.ENDING) {
	                        if (_this.options.onError) {
	                            _this.options.onError(new Error("HTTP response ended without receiving EOS message"));
	                        }
	                    }
	                    else {
	                        // Stream ended normally.
	                        if (_this.options.onEnd) {
	                            _this.options.onEnd();
	                        }
	                    }
	                }
	                else {
	                    // The server responded with a bad status code (finish with onError).
	                    // Finish with an error.
	                    _this.assertState(['OPENING', 'OPEN', 'ENDED']);
	                    if (_this.state === SubscriptionState.ENDED) {
	                        // We aborted the request deliberately, and called onError/onEnd elsewhere.
	                    }
	                    else {
	                        // The server
	                        if (_this.options.onError) {
	                            _this.options.onError(new Error("error from server: " + _this.xhr.responseText));
	                        }
	                    }
	                }
	            }
	        };
	        xhr.onerror = function () {
	            if (_this.options.onError) {
	                _this.options.onError(new Error("resumable"));
	            }
	        };
	    }
	    Subscription.prototype.open = function (jwt) {
	        if (this.state !== SubscriptionState.UNOPENED) {
	            throw new Error("Called .open() on Subscription object in unexpected state: " + this.state);
	        }
	        this.state = SubscriptionState.OPENING;
	        if (jwt) {
	            this.xhr.setRequestHeader("authorization", "Bearer " + jwt);
	        }
	        this.xhr.send();
	    };
	    // calls options.onEvent 0+ times, then possibly returns an error.
	    // idempotent.
	    Subscription.prototype.onChunk = function () {
	        this.assertState(['OPEN']);
	        var response = this.xhr.responseText;
	        var newlineIndex = response.lastIndexOf("\n");
	        if (newlineIndex > this.lastNewlineIndex) {
	            var rawEvents = response.slice(this.lastNewlineIndex, newlineIndex).split("\n");
	            this.lastNewlineIndex = newlineIndex;
	            for (var _i = 0, rawEvents_1 = rawEvents; _i < rawEvents_1.length; _i++) {
	                var rawEvent = rawEvents_1[_i];
	                if (rawEvent.length === 0) {
	                    continue; // FIXME why? This should be a protocol error
	                }
	                var data = JSON.parse(rawEvent);
	                var err = this.onMessage(data);
	                if (err != null) {
	                    return err;
	                }
	            }
	        }
	    };
	    // calls options.onEvent 0+ times, then returns an Error or null
	    Subscription.prototype.onMessage = function (message) {
	        this.assertState(['OPEN']);
	        if (this.gotEOS) {
	            return new Error("Got another message after EOS message");
	        }
	        if (!Array.isArray(message)) {
	            return new Error("Message is not an array");
	        }
	        if (message.length < 1) {
	            return new Error("Message is empty array");
	        }
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
	    // EITHER calls options.onEvent, OR returns an error
	    Subscription.prototype.onEventMessage = function (eventMessage) {
	        this.assertState(['OPEN']);
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
	        if (this.options.onEvent) {
	            this.options.onEvent({ eventId: id, headers: headers, body: body });
	        }
	    };
	    // calls options.onEvent 0+ times, then possibly returns an error
	    Subscription.prototype.onEOSMessage = function (eosMessage) {
	        this.assertState(['OPEN']);
	        if (eosMessage.length !== 4) {
	            return new Error("EOS message has " + eosMessage.length + " elements (expected 4)");
	        }
	        var _ = eosMessage[0], statusCode = eosMessage[1], headers = eosMessage[2], info = eosMessage[3];
	        if (typeof statusCode !== "number") {
	            return new Error("Invalid EOS Status Code");
	        }
	        if (typeof headers !== "object" || Array.isArray(headers)) {
	            return new Error("Invalid EOS Headers");
	        }
	        this.state = SubscriptionState.ENDING;
	    };
	    Subscription.prototype.unsubscribe = function (err) {
	        this.state = SubscriptionState.ENDED;
	        this.xhr.abort();
	        if (err) {
	            if (this.options.onError) {
	                this.options.onError(err);
	            }
	        }
	        else {
	            if (this.options.onEnd) {
	                this.options.onEnd();
	            }
	        }
	    };
	    return Subscription;
	}());
	var ResumableSubscriptionState;
	(function (ResumableSubscriptionState) {
	    ResumableSubscriptionState[ResumableSubscriptionState["UNOPENED"] = 0] = "UNOPENED";
	    ResumableSubscriptionState[ResumableSubscriptionState["OPENING"] = 1] = "OPENING";
	    ResumableSubscriptionState[ResumableSubscriptionState["OPEN"] = 2] = "OPEN";
	    ResumableSubscriptionState[ResumableSubscriptionState["ENDING"] = 3] = "ENDING";
	    ResumableSubscriptionState[ResumableSubscriptionState["ENDED"] = 4] = "ENDED"; // called onEnd() or onError(err)
	})(ResumableSubscriptionState || (ResumableSubscriptionState = {}));
	// pattern of callbacks: ((onOpening (onOpen onEvent*)?)? (onError|onEnd)) | onError
	var ResumableSubscription = (function () {
	    function ResumableSubscription(xhrSource, options) {
	        this.xhrSource = xhrSource;
	        this.options = options;
	        this.state = ResumableSubscriptionState.UNOPENED;
	        this.lastEventIdReceived = null;
	        this.delayMillis = 0;
	        this.assertState(this, ResumableSubscriptionState);
	        this.lastEventIdReceived = options.lastEventId;
	    }
	    ResumableSubscription.prototype.tryNow = function () {
	        var _this = this;
	        this.state = ResumableSubscriptionState.OPENING;
	        var newXhr = this.xhrSource();
	        this.subscription = new Subscription(newXhr, {
	            path: this.options.path,
	            lastEventId: this.lastEventIdReceived,
	            onOpen: function () {
	                _this.assertState(['OPENING']);
	                _this.state = ResumableSubscriptionState.OPEN;
	                if (_this.options.onOpen) {
	                    _this.options.onOpen();
	                }
	            },
	            onEvent: function (event) {
	                _this.assertState(['OPEN']);
	                if (_this.options.onEvent) {
	                    _this.options.onEvent(event);
	                }
	                console.assert(_this.lastEventIdReceived === null ||
	                    parseInt(event.eventId) > parseInt(_this.lastEventIdReceived), 'Expected the current event id to be larger than the previous one');
	                _this.lastEventIdReceived = event.eventId;
	                console.log("Set lastEventIdReceived to " + _this.lastEventIdReceived);
	            },
	            onEnd: function () {
	                _this.state = ResumableSubscriptionState.ENDED;
	                if (_this.options.onEnd) {
	                    _this.options.onEnd();
	                }
	            },
	            onError: function (error) {
	                if (_this.isResumableError(error)) {
	                    _this.state = ResumableSubscriptionState.OPENING;
	                    if (_this.options.onOpening) {
	                        _this.options.onOpening();
	                    }
	                    _this.backoff();
	                }
	                else {
	                    _this.state = ResumableSubscriptionState.ENDED;
	                    if (_this.options.onError) {
	                        _this.options.onError(error);
	                    }
	                }
	            },
	        });
	        if (this.options.authorizer) {
	            this.options.authorizer.authorize().then(function (jwt) {
	                _this.subscription.open(jwt);
	            }).catch(function (err) {
	                // This is a resumable error?
	                console.log("Error getting auth token; backing off");
	                _this.backoff();
	            });
	        }
	        else {
	            this.subscription.open(null);
	        }
	    };
	    ResumableSubscription.prototype.backoff = function () {
	        var _this = this;
	        this.delayMillis = this.delayMillis * 2 + 1000;
	        console.log("Trying reconnect in " + this.delayMillis + " ms.");
	        window.setTimeout(function () { _this.tryNow(); }, this.delayMillis);
	    };
	    ResumableSubscription.prototype.open = function () {
	        this.tryNow();
	    };
	    ResumableSubscription.prototype.isResumableError = function (error) {
	        return error.message === "resumable"; // TODO this is a horrible way to represent resumableness
	    };
	    ResumableSubscription.prototype.unsubscribe = function () {
	        this.subscription.unsubscribe(); // We'll get onEnd and bubble this up
	    };
	    return ResumableSubscription;
	}());
	var BaseClient = (function () {
	    function BaseClient(options) {
	        this.options = options;
	        var cluster = options.cluster.replace(/\/$/, '');
	        this.baseURL = (options.encrypted !== false ? "https" : "http") + "://" + cluster;
	        this.XMLHttpRequest = options.XMLHttpRequest || window.XMLHttpRequest;
	    }
	    BaseClient.prototype.request = function (options) {
	        var xhr = this.createXHR(this.baseURL, options);
	        return new Promise(function (resolve, reject) {
	            xhr.onreadystatechange = function () {
	                if (xhr.readyState === 4) {
	                    if (xhr.status === 200) {
	                        resolve(xhr.responseText);
	                    }
	                    else {
	                        reject(new ErrorResponse(xhr));
	                    }
	                }
	            };
	            xhr.send(JSON.stringify(options.body));
	        });
	    };
	    BaseClient.prototype.newSubscription = function (subOptions) {
	        return new Subscription(this.createXHR(this.baseURL, {
	            method: "SUBSCRIBE",
	            path: subOptions.path,
	            headers: {},
	            body: null,
	        }), subOptions);
	    };
	    BaseClient.prototype.newResumableSubscription = function (subOptions) {
	        var _this = this;
	        return new ResumableSubscription(function () {
	            return _this.createXHR(_this.baseURL, {
	                method: "SUBSCRIBE",
	                path: subOptions.path,
	                headers: {},
	                body: null,
	            });
	        }, subOptions);
	    };
	    BaseClient.prototype.createXHR = function (baseURL, options) {
	        var XMLHttpRequest = this.XMLHttpRequest;
	        var xhr = new XMLHttpRequest();
	        var path = options.path.replace(/^\/+/, "");
	        var endpoint = baseURL + "/" + path;
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
	    return BaseClient;
	}());
	exports.BaseClient = BaseClient;
	var SimpleTokenAuthorizer = (function () {
	    function SimpleTokenAuthorizer(jwt) {
	        this.jwt = jwt;
	    }
	    SimpleTokenAuthorizer.prototype.authorize = function () {
	        var _this = this;
	        return new Promise(function (resolve, reject) {
	            resolve(_this.jwt);
	        });
	    };
	    return SimpleTokenAuthorizer;
	}());
	exports.SimpleTokenAuthorizer = SimpleTokenAuthorizer;
	function base64UrlDecode(encoded) {
	    return atob(encoded.replace(/\-/g, '+').replace(/_/g, '/'));
	}
	var AuthServerAuthorizer = (function () {
	    function AuthServerAuthorizer(authServerUrl, credentials) {
	        this.authServerUrl = authServerUrl;
	        this.credentials = credentials;
	        this.accessToken = null;
	    }
	    AuthServerAuthorizer.prototype.authorize = function () {
	        var _this = this;
	        return new Promise(function (resolve, reject) {
	            if (_this.accessToken != null && Date.now() < JSON.parse(base64UrlDecode(_this.accessToken.split(".")[1]))["exp"] * 1000) {
	                resolve(_this.accessToken);
	            }
	            else {
	                var xhr_1 = new XMLHttpRequest();
	                xhr_1.onreadystatechange = function () {
	                    if (xhr_1.readyState === 4) {
	                        if (200 <= xhr_1.status && xhr_1.status < 300) {
	                            _this.accessToken = JSON.parse(xhr_1.responseText)["access_token"];
	                            resolve(_this.accessToken);
	                        }
	                        else {
	                            reject(new Error("Unexpected status code in response from auth server: " + xhr_1.status));
	                        }
	                    }
	                };
	                xhr_1.open("POST", _this.authServerUrl, true);
	                xhr_1.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	                xhr_1.send("grant_type=client_credentials" +
	                    (_this.credentials ? "&credentials=" + encodeURIComponent(_this.credentials) : ""));
	            }
	        });
	    };
	    return AuthServerAuthorizer;
	}());
	exports.AuthServerAuthorizer = AuthServerAuthorizer;
	var FeedsHelper = (function () {
	    function FeedsHelper(name, app) {
	        this.feedName = name;
	        this.app = app;
	    }
	    FeedsHelper.prototype.subscribe = function (options) {
	        return this.app.resumableSubscribe({
	            path: "feeds/" + this.feedName,
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
	        var path = "feeds/" + this.feedName;
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
	        var pathWithQuery = path + queryString;
	        return new Promise(function (resolve, reject) {
	            _this.app.request({ method: "GET", path: pathWithQuery })
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
	    FeedsHelper.prototype.publish = function (item) {
	        var path = "feeds/" + this.feedName;
	        return this.app.request({ method: "POST", path: path, body: { items: [item] } });
	    };
	    return FeedsHelper;
	}());
	var App = (function () {
	    function App(options) {
	        this.appId = options.appId;
	        this.authorizer = options.authorizer;
	        this.client = options.client || new BaseClient({
	            cluster: options.cluster || "api.private-beta-1.pusherplatform.com",
	            encrypted: options.encrypted
	        });
	    }
	    App.prototype.request = function (options) {
	        var _this = this;
	        options.path = this.absPath(options.path);
	        if (!options.jwt && this.authorizer) {
	            return this.authorizer.authorize().then(function (jwt) {
	                return _this.client.request(Object.assign(options, { jwt: jwt }));
	            });
	        }
	        else {
	            return this.client.request(options);
	        }
	    };
	    App.prototype.subscribe = function (options) {
	        options.path = this.absPath(options.path);
	        var subscription = this.client.newSubscription(options);
	        if (options.jwt) {
	            subscription.open(options.jwt);
	        }
	        else if (this.authorizer) {
	            this.authorizer.authorize().then(function (jwt) {
	                subscription.open(jwt);
	            }).catch(function (err) {
	                subscription.unsubscribe(err);
	            });
	        }
	        else {
	            subscription.open(null);
	        }
	        return subscription;
	    };
	    App.prototype.resumableSubscribe = function (options) {
	        options.path = this.absPath(options.path);
	        options.authorizer = this.authorizer;
	        var resumableSubscription = this.client.newResumableSubscription(options);
	        resumableSubscription.open();
	        return resumableSubscription;
	    };
	    App.prototype.feed = function (name) {
	        return new FeedsHelper(name, this);
	    };
	    App.prototype.listFeeds = function () {
	        var _this = this;
	        return new Promise(function (resolve, reject) {
	            _this.request({ method: "GET", path: "feeds" })
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
	    App.prototype.absPath = function (relativePath) {
	        return ("/apps/" + this.appId + "/" + relativePath).replace(/\/+/g, "/").replace(/\/+$/, "");
	    };
	    return App;
	}());
	exports.App = App;


/***/ }
/******/ ])
});
;