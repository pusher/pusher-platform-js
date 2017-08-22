import { executeRequest, NetworkRequest, RequestOptions } from './request';
import { TokenFetchingRetryStrategy } from './retry-strategy/token-fetching-retry-strategy';
import { ExponentialBackoffRetryStrategy } from './retry-strategy/exponential-backoff-retry-strategy';
import { createSubscriptionConstructor } from './subscription/base-subscription';
import { ConsoleLogger, Logger } from './logger';
import { TokenProvider } from './token-provider';
import { ResumableSubscribeOptions, ResumableSubscription } from './subscription/resumable-subscription';
import { RetryStrategy } from './retry-strategy/retry-strategy';
import { NonResumableSubscribeOptions, NonResumableSubscription} from './subscription/non-resumable-subscription';

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

// //Single request
// export type NetworkRequest<T> = (parameters?: any) => Promise<T>;

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

    // export interface RequestOptions {
    //     method: string;
    //     path: string;
    //     jwt?: string;
    //     headers?: Headers;
    //     body?: any;
    //     retryStrategy?: RetryStrategy;
    //     logger?: Logger;
    // }

    export class BaseClient {
        private baseURL: string;
        private XMLHttpRequest: any;
        private logger: Logger;

        constructor(private options: BaseClientOptions) {
            let host = options.host.replace(/\/$/, '');
            this.baseURL = `${options.encrypted !== false ? "https" : "http"}://${host}`;
            this.XMLHttpRequest = options.XMLHttpRequest || (<any>window).XMLHttpRequest;

            this.logger = options.logger || new ConsoleLogger();
        }

        request(options: RequestOptions): Promise<any> {
            let createXhr = () => { return this.createXHR(this.baseURL, options); }
            return executeRequest<any>(createXhr, options);
        }

        newNonResumableSubscription(subOptions: NonResumableSubscribeOptions): NonResumableSubscription {

            let tokenProvider: TokenProvider = subOptions.tokenProvider; //TODO: do we need this guy here? Can the RetryStrategy encapsulate the whole shebang?
            let retryStrategy: RetryStrategy = subOptions.retryStrategy || new ExponentialBackoffRetryStrategy({tokenFetchingRetryStrategy: new TokenFetchingRetryStrategy(tokenProvider, this.logger) });

            let headers: Headers = subOptions.headers;
            let path = subOptions.path;
            let listeners = subOptions.listeners;

            let requestOptions: RequestOptions = {
                method: "SUBSCRIBE",
                path: path,
                headers: headers
            }

            let resumableSubscription = new NonResumableSubscription(
                createSubscriptionConstructor(
                    retryStrategy, 
                    headers, 
                    () => this.createXHR(this.baseURL, requestOptions)),
                subOptions,
                listeners);

            return resumableSubscription;
        }

        newResumableSubscription(subOptions: ResumableSubscribeOptions):          
        ResumableSubscription {

            let tokenProvider: TokenProvider = subOptions.tokenProvider; //TODO: do we need this guy here? Can the RetryStrategy encapsulate the whole shebang?
            let retryStrategy: RetryStrategy = subOptions.retryStrategy || new ExponentialBackoffRetryStrategy({tokenFetchingRetryStrategy: new TokenFetchingRetryStrategy(tokenProvider, this.logger) });

            let initialEventId: string = subOptions.initialEventId;
            let headers: Headers = subOptions.headers;
            let path = subOptions.path;
            let listeners = subOptions.listeners;

            let requestOptions: RequestOptions = {
                method: "SUBSCRIBE",
                path: path,
            }

            let resumableSubscription = new ResumableSubscription(
                createSubscriptionConstructor(
                    retryStrategy, 
                    headers, 
                    () => this.createXHR(this.baseURL, requestOptions)),
                subOptions,
                listeners);

            return resumableSubscription;
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

