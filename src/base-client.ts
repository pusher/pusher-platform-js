import { ConsoleLogger, Logger } from './logger';
import { TokenProvider } from './token-provider';
import { ResumableSubscribeOptions, ResumableSubscription} from './resumable-subscription';
import { RetryStrategy, RetryStrategyResult, Retry, DoNotRetry, ExponentialBackoffRetryStrategy } from './retry-strategy';
import { StatelessSubscribeOptions, StatelessSubscription} from './stateless-subscription';

export interface BaseClientOptions {
    host: string;
    encrypted?: boolean;
    timeout?: number;
    XMLHttpRequest?: Function;
    logger?: Logger;
}

export type Headers = {
    [key: string]: string;
}

export interface RequestOptions {
    method: string;
    path: string;
    tokenProvider?: TokenProvider;
    jwt?: string;
    headers?: Headers;
    body?: any;
    retryStrategy?: RetryStrategy;
    logger?: Logger;
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

            this.logger = options.logger || new ConsoleLogger();
        }

        request(options: RequestOptions): Promise<any> {
            let xhr = this.createXHR(this.baseURL, options);

            //TODO: add retrying
            return new Promise<any>((resolve, reject) => {

                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            resolve(xhr.responseText);
                        } else {
                            reject(ErrorResponse.fromXHR(xhr));
                        }
                    }
                };

                xhr.send(JSON.stringify(options.body));
            });
        }

        newStatelessSubscription(subOptions: StatelessSubscribeOptions): StatelessSubscription {
            const method = "SUBSCRIBE";
            if( !subOptions.retryStrategy ) {
                subOptions.retryStrategy = new ExponentialBackoffRetryStrategy({
                    logger: this.logger,
                    requestMethod: method
                });
            }
            return new StatelessSubscription(
                () => {
                    return this.createXHR(this.baseURL, {
                        method: method,
                        path: subOptions.path,
                        headers: {},
                        body: null,
                    });
                },
                subOptions
            );
        }

        private createBaseSubscriptionConstructor = (method: string, path: string, retryStrategy: RetryStrategy) => {

            // return (error, lastEvent) => { }
        }


        newResumableSubscription(subOptions: ResumableSubscribeOptions): ResumableSubscription {
            const method = "SUBSCRIBE";

            if( !subOptions.retryStrategy ) {
                subOptions.retryStrategy = new ExponentialBackoffRetryStrategy({
                    logger: this.logger,
                    requestMethod: method
                });
            }

            return new ResumableSubscription(
                (lastEventID) => {
                    this.newBaseSubscription({
                        lastEventID
                    })
                    return this.createXHR(this.baseURL, {
                        method: method,
                        path: subOptions.path,
                        headers: {},
                        body: null,
                    });
                },
                subOptions
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

