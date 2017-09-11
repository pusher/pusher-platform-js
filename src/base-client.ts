

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

            this.logger = options.logger || new ConsoleLogger();
        }

        request(options: RequestOptions): Promise<any> {
            let createXhr = () => { return this.createXHR(this.baseURL, options); }
            return executeRequest<any>(createXhr, options);
        }

        newNonResumableSubscription(subOptions: NonResumableSubscribeOptions): NonResumableSubscription {
            
            let retryStrategy: RetryStrategy;            

            if(subOptions.retryStrategy){
                retryStrategy = subOptions.retryStrategy;
            }
            else{
                let retryStrategyOptions: ExponentialBackoffRetryStrategyOptions = {
                    logger: this.logger
                };
                if(subOptions.tokenProvider){
                    retryStrategyOptions.tokenFetchingRetryStrategy = new TokenFetchingRetryStrategy(subOptions.tokenProvider, this.logger);
                }
                retryStrategy = new ExponentialBackoffRetryStrategy(retryStrategyOptions);
            }

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

            let retryStrategy: RetryStrategy;   //TODO  
            let path = subOptions.path;
            let initialEventId: string = subOptions.initialEventId;
            let headers: Headers = subOptions.headers;
            let listeners = subOptions.listeners;
            
            let subCreator9000: (headers: Headers) => Promise<BaseSubscription> = (headers: Headers) => {
                let requestOptions: RequestOptions = {
                    method: "SUBSCRIBE",
                    path: path,
                }
                let xhrGenerator3000 = () => this.createXHR(this.baseURL, requestOptions); 
                
                return new Promise<BaseSubscription>( (resolve, reject) => {
                    let xhr = xhrGenerator3000();
                    for (let key in headers) {
                        xhr.setRequestHeader(key, headers[key]);
                    }
                    let sub = new BaseSubscription(
                        xhr, 
                        this.logger, 
                        headers => resolve(sub),
                        error => reject(error)
                    );
                });
            }

            






            let resumableSubscription = new ResumableSubscription(
                subConstructor(subCreator9000, retryStrategy),
                initialEventId,
                listeners);
                

            // let resumableSubscription = new ResumableSubscription(
            //     subCreator9000,

            //     createSubscriptionConstructor(
            //         retryStrategy, 
            //         headers, 
            //         () => this.createXHR(this.baseURL, requestOptions)),
            //     subOptions,
            //     subOptions.initialEventId,
            //     listeners);

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

