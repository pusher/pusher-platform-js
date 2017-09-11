import { createRetryingStrategy } from './retrying-subscription';
import { createResumingStrategy } from './resuming-subscription';
import { TokenProvider } from './token-provider';
import { RetryStrategyOptions } from './retry-strategy';
import { RequestOptions, NetworkResponse, executeNetworkRequest } from './request';
import { Logger } from './logger';
import { Subscription, SubscriptionListeners, replaceMissingListenersWithNoOps, SubscriptionConstructor, SubscribeStrategy } from './subscription';
import { BaseSubscription } from './base-subscription';
import { createTokenProvidingStrategy } from './token-providing-subscription';


export interface BaseClientOptions {
    host: string;
    encrypted?: boolean;
    timeout?: number;
    XMLHttpRequest?: Function;
    logger?: Logger;
    retryStrategy?: RetryStrategy
}

export type Headers = {
    [key: string]: string;
}

export function responseHeadersObj(headerStr: string): Headers {
    var headers: Headers = {};
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

export class ErrorResponse extends Error{
    public statusCode: number;
    public headers: Headers;
    public info: any;

    constructor(statusCode: number, headers: Headers, info: any) {
        super(`ErroResponse: ${statusCode}: ${info} \n Headers: ${JSON.stringify(headers)}`);
        Object.setPrototypeOf(this, ErrorResponse.prototype);
        this.statusCode = statusCode;
        this.headers = headers;
        this.info = info;
    }

    static fromXHR(xhr: XMLHttpRequest): ErrorResponse {
        return new ErrorResponse(
            xhr.status, responseHeadersObj(xhr.getAllResponseHeaders()), xhr.responseText);
        }
    }

    export class NetworkError extends Error {
        public error: string;

        constructor(error: string){
            super(error);
            //TODO: ugly hack to make the instanceof calls work. We might have to find a better solution.
            Object.setPrototypeOf(this, NetworkError.prototype);
            this.error = error;
        }
    }

    // Follows https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/readyState
    export enum XhrReadyState {
        UNSENT = 0,
        OPENED = 1,
        HEADERS_RECEIVED = 2,
        LOADING = 3,
        DONE = 4
    }

    export class BaseClient {
        private baseURL: string;
        private XMLHttpRequest: any;
        private logger: Logger;

        constructor(private options: BaseClientOptions) {
            let host = options.host.replace(/\/$/, '');
            this.baseURL = `${options.encrypted !== false ? "https" : "http"}://${host}`;
            this.XMLHttpRequest = options.XMLHttpRequest || (<any>window).XMLHttpRequest;
            this.logger = options.logger;
            // this.logger = options.logger || new ConsoleLogger();
        }

        // request(options: RequestOptions): Promise<any> {
        //     let createXhr = () => { return this.createXHR(this.baseURL, options); }
        //     return executeRequest<any>(createXhr, options);
        // }


        //TODO: add retrying shit
        request<T>(options: RequestOptions): NetworkResponse<T>{
            return executeNetworkRequest<T>(
                () => this.createXHR(this.baseURL, options),
                options
            );
        }

        private xhrConstructor: (path: string) => (headers: Headers) => XMLHttpRequest = (path) => {
            
            return (headers) => {
                const requestOptions: RequestOptions = {
                    method: "SUBSCRIBE",
                    path: path,
                    headers: headers
                }
        
                return this.createXHR(this.baseURL, requestOptions);
            }
        }

        private createH2TransportStrategy: () => SubscribeStrategy = () => {
            let strategy: SubscribeStrategy = (onOpen, onError, onEvent, onEnd, headers, baseSubscriptionConstructor) => {
                return baseSubscriptionConstructor(headers, onOpen, onError, onEvent, onEnd);
            }
            return strategy;
        };

        subscribeResuming(
            path: string, 
            headers: Headers, 
            listeners: SubscriptionListeners, 
            retryStrategyOptions: RetryStrategyOptions, 
            initialEventId: string,            
            tokenProvider: TokenProvider,

        ): Subscription {

            let xhrFactory = this.xhrConstructor(path);

            let listenersOrNoOps = replaceMissingListenersWithNoOps(listeners);

            let subscriptionConstructor: SubscriptionConstructor = (
                headers, 
                onOpen,
                onError,
                onEvent,
                onEnd,
            ) => new BaseSubscription(
                xhrFactory(headers), 
                this.logger, 
                onOpen, 
                onError, 
                onEvent,
                onEnd
            );

            let subscriptionStrategy = createResumingStrategy(
                retryStrategyOptions,
                initialEventId,
                createTokenProvidingStrategy(
                    tokenProvider, 
                    this.createH2TransportStrategy(), 
                    this.logger),
                this.logger
            );

            let opened = false;
            
            return subscriptionStrategy(
                headers => {
                    if(!opened){
                        opened = true;
                        listenersOrNoOps.onOpen(headers);
                    }
                },
                listenersOrNoOps.onError,
                listenersOrNoOps.onEvent,
                listenersOrNoOps.onEnd,
                headers,
                subscriptionConstructor
            );
        }

        subscribeNonResuming(
            path: string, 
            headers: Headers, 
            listeners: SubscriptionListeners, 
            retryStrategyOptions: RetryStrategyOptions, 
            tokenProvider: TokenProvider
        ){
            let xhrFactory = this.xhrConstructor(path);
            
            let listenersOrNoOps = replaceMissingListenersWithNoOps(listeners);
        
            let subscriptionConstructor: SubscriptionConstructor = (
                headers, 
                onOpen,
                onError,
                onEvent,
                onEnd,
            ) => new BaseSubscription(
                xhrFactory(headers), 
                this.logger, 
                onOpen, 
                onError, 
                onEvent,
                onEnd
            );

            let subscriptionStrategy = createRetryingStrategy(
                retryStrategyOptions,
                createTokenProvidingStrategy(
                    tokenProvider, 
                    this.createH2TransportStrategy(), 
                    this.logger),
                this.logger
            );

            let opened = false;

            return subscriptionStrategy(
                headers => {
                    if(!opened){
                        opened = true;
                        listenersOrNoOps.onOpen(headers);
                    }
                },
                listenersOrNoOps.onError,
                listenersOrNoOps.onEvent,
                listenersOrNoOps.onEnd,
                headers,
                subscriptionConstructor
            );
        }

        private createXHR(baseURL: string, options: RequestOptions): XMLHttpRequest {
            let XMLHttpRequest: any = this.XMLHttpRequest;
            let xhr = new XMLHttpRequest();
            let path = options.path.replace(/^\/+/, "");
            let endpoint = `${baseURL}/${path}`;

            xhr.open(options.method.toUpperCase(), endpoint, true);

            if (options.body) {
                xhr.setRequestHeader("content-type", "application/json");
            }

            if (options.jwt) {
                xhr.setRequestHeader("authorization", `Bearer ${options.jwt}`);
            }

            for (let key in options.headers) {
                xhr.setRequestHeader(key, options.headers[key]);
            }

            return xhr;
        }
    }

