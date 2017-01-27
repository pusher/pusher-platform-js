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
	// Will call `options.onEvent` 0+ times,
	// followed by EITHER `options.onEnd` or `options.onError` exactly once.
	var Subscription = (function () {
	    function Subscription(xhr, options) {
	        var _this = this;
	        this.xhr = xhr;
	        this.options = options;
	        this.gotEOS = false;
	        this.calledOnOpen = false;
	        this.lastNewlineIndex = 0;
	        this.xhr.onreadystatechange = function () {
	            if (_this.xhr.readyState === 3) {
	                // The headers have loaded and we have partial body text.
	                if (_this.xhr.status === 200) {
	                    // We've received a successful response header.
	                    // The partial body text is a partial JSON message stream.
	                    _this.opened();
	                    var err = _this.onChunk();
	                    if (err != null) {
	                        _this.xhr.abort();
	                        // Because we abort()ed, we will get no more calls to our onreadystatechange handler,
	                        // and so we will not call the event handler again.
	                        // Finish with options.onError instead of the options.onEnd.
	                        if (_this.options.onError) {
	                            _this.options.onError(err);
	                        }
	                    }
	                    else {
	                    }
	                }
	                else {
	                }
	            }
	            else if (_this.xhr.readyState === 4) {
	                // This is the last time onreadystatechange is called.
	                if (_this.xhr.status === 200) {
	                    _this.opened();
	                    var err = _this.onChunk();
	                    if (err !== null && err != undefined) {
	                        if (_this.options.onError) {
	                            _this.options.onError(err);
	                        }
	                    }
	                    else if (!_this.gotEOS) {
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
	                    // Either the server responded with a bad status code,
	                    // or the request errored in some other way (status 0).
	                    // Finish with an error.
	                    if (_this.options.onError) {
	                        _this.options.onError(new Error(new ErrorResponse(xhr).toString()));
	                    }
	                }
	            }
	            else {
	            }
	        };
	    }
	    Subscription.prototype.opened = function () {
	        if (!this.calledOnOpen) {
	            if (this.options.onOpen) {
	                this.options.onOpen();
	            }
	            this.calledOnOpen = true;
	        }
	    };
	    Subscription.prototype.open = function (jwt) {
	        if (jwt) {
	            this.xhr.setRequestHeader("authorization", "Bearer " + jwt);
	        }
	        this.xhr.send();
	    };
	    // calls options.onEvent 0+ times, then possibly returns an error.
	    // idempotent.
	    Subscription.prototype.onChunk = function () {
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
	        this.gotEOS = true;
	    };
	    Subscription.prototype.abort = function (err) {
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
	            headers: subOptions.headers,
	            body: null,
	        }), subOptions);
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
	    function AuthServerAuthorizer(authServerUrl) {
	        this.authServerUrl = authServerUrl;
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
	                xhr_1.send("grant_type=client_credentials&credentials=jim"); // FIXME credentials should come from a session cookie or similar
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
	        return this.app.subscribe({
	            path: "feeds/" + this.feedName,
	            headers: options.lastEventId ? { "Last-Event-Id": options.lastEventId } : {},
	            onOpen: options.onOpen,
	            onEvent: options.onItem,
	            onEnd: function () { options.onError(new Error("Unexpected end to Feed subscription")); },
	            onError: options.onError
	        });
	    };
	    FeedsHelper.prototype.get = function (options) {
	        var _this = this;
	        var path = "feeds/" + this.feedName;
	        var queryString = "";
	        var queryParams = [];
	        if (options && options.fromId) {
	            queryParams.push("from_id=" + options.fromId);
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
	    FeedsHelper.prototype.append = function (item) {
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
	                subscription.abort(err);
	            });
	        }
	        else {
	            subscription.open(null);
	        }
	        return subscription;
	    };
	    App.prototype.feed = function (name) {
	        return new FeedsHelper(name, this);
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