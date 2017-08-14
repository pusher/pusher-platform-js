import { Logger, EmptyLogger } from './logger';
import { ErrorResponse, NetworkError } from './base-client';
import { BaseSubscription } from './base-subscription';
import { TokenProvider } from './token-provider';

export interface RetryStrategy {
    executeSubscription(
        error: any,
        xhr: XMLHttpRequest, 
        subscriptionCallback: (subscription: BaseSubscription) => void, 
        errorCallback: (error: any) => void
    );
    executeRequest(
        error: any,
        xhr: XMLHttpRequest
    ): Promise<any>;
    //TODO: executeRequest();
}

function createRetryStrategy(options :any): RetryStrategy {

    let tokenProvider: TokenProvider

    return null;
    //TODO: - constructor might solve these problems for us
}

export interface RetryStrategyResult {}

export class Retry implements RetryStrategyResult {
    waitTimeMillis: number;
    constructor(waitTimeMillis: number){
        this.waitTimeMillis = waitTimeMillis;
    }
}

export class DoNotRetry implements RetryStrategyResult {
    error: Error;
    constructor(error: Error){
        this.error = error;
    }
}

export class TokenFetchingRetryStrategy implements RetryStrategy {
    constructor(
        private tokenProvider: TokenProvider,
    ){}
    
    executeSubscription(
        error: any,
        xhr: XMLHttpRequest, 
        subscriptionCallback: (subscription: BaseSubscription) => void, 
        errorCallback: (error: any) => void) {
            
            this.resolveError(error)
            .then( () => this.tokenProvider.fetchToken)
            .then(token => {
                if(token){
                    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
                }
                
                let subscription = new BaseSubscription(
                    xhr, 
                    null, 
                    (headers) => {
                        subscriptionCallback(subscription);
                    }, 
                    (error) => {
                        errorCallback(error);
                    } 
                );
            })
            .catch( errorCallback );
        }
        
        resolveError(error: any): Promise<any>{
            return new Promise( (resolve, reject) => {
                if (
                    error instanceof ErrorResponse && 
                    error.statusCode === 401 && 
                    error.name == "authentication/jwt/expired"){
                    
                        this.tokenProvider.invalidateToken(error.info.token);
                    }
                    resolve();
                });
            }
    
        executeRequest( 
            error: any,
            xhr: XMLHttpRequest) {
                return new Promise<any>( (resolve, reject) => {
                    //TODO
            });
        }
    }
        

        export interface ExponentialBackoffRetryStrategyOptions {
            tokenFetchingRetryStrategy?: RetryStrategy, //Retry strategy that checks for expired token and fetches it
            retryUnsafeRequests?: boolean, //Elements doesn't allow unsafe requests to be retried, external calls to filthy APIs might require it
            limit?: number, //Max number of retries, -1 if unlimited
            maxBackoffMillis?: number, //Maximum length for backoff
            defaultBackoffMillis?: number, //Initial backoff we start from
            logger?: Logger
        }
        
        export class ExponentialBackoffRetryStrategy implements RetryStrategy {
            
            constructor(private options: ExponentialBackoffRetryStrategyOptions){
            }
            
            private tokenFetchingRetryStrategy: RetryStrategy

            executeRequest( 
                error: any,
                xhr: XMLHttpRequest) {
                    return new Promise<any>( (resolve, reject) => {
                        //TODO
                });
            }
            
            executeSubscription(
                error: any,
                xhr: XMLHttpRequest, 
                subscriptionCallback: (subscription: BaseSubscription) => void, 
                errorCallback: (error: any) => void
            ){
                this.resolveError(error).then( () => {
                    this.tokenFetchingRetryStrategy.executeSubscription(
                        error, 
                        xhr, 
                        subscriptionCallback, 
                        errorCallback);
                    })
                    .catch(error) 
                }
                
                private logger = this.options.logger || new EmptyLogger();
                private retryUnsafeRequests = this.options.retryUnsafeRequests || false;
                private limit = this.options.limit || false;
                private maxBackoffMillis = this.options.maxBackoffMillis || 5000;
                private defaultBackoffMillis = this.options.defaultBackoffMillis || 1000;

                private retryCount = 0;
                private currentBackoffMillis: number = this.defaultBackoffMillis;
                private pendingTimeouts = new Set<number>();        
                
                resolveError(error: any): Promise<any> {
                    return new Promise( (resolve, reject) => {
                        
                        const shouldRetry = this.shouldRetry(error);
                        if(shouldRetry instanceof DoNotRetry) {
                            reject(error);
                        }
                        else if(shouldRetry instanceof Retry){
                            this.retryCount += 1;
                            
                            const timeout = window.setTimeout(() => {
                                this.pendingTimeouts.delete(timeout);
                                resolve();
                            }, shouldRetry.waitTimeMillis);
                            
                            this.pendingTimeouts.add(timeout);
                        }
                    }); 
                }
                
                private requestMethodIsSafe(requestMethod: string): boolean {
                    switch(requestMethod){
                        case 'GET':
                        case 'HEAD':
                        case 'OPTIONS':
                        case 'SUBSCRIBE':
                        return true;
                        default:
                        return false;
                    }
                }
                
                private shouldRetry(error: Error): RetryStrategyResult {
                    this.logger.verbose(`${this.constructor.name}:  Error received`, error);
                    
                    if(this.retryCount >= this.limit && this.limit >= 0 ){
                        this.logger.verbose(`${this.constructor.name}:  Retry count is over the maximum limit: ${this.limit}`);
                        return new DoNotRetry(error);
                    }
                    
                    if (error instanceof ErrorResponse && error.headers['Retry-After']){
                        this.logger.verbose(`${this.constructor.name}:  Retry-After header is present, retrying in ${error.headers['Retry-After']}`);
                        return new Retry(parseInt(error.headers['Retry-After']) * 1000);
                    } 
                    
                    if (error instanceof NetworkError || this.requestMethodIsSafe("SUBSCRIBE") || this.retryUnsafeRequests) {
                        return this.shouldSafeRetry(error);
                    }
                    
                    this.logger.verbose(`${this.constructor.name}: Error is not retryable`, error);
                    return new DoNotRetry(error);
                }
                
                private shouldSafeRetry(error: Error){
                    if(error instanceof NetworkError){
                        this.logger.verbose(`${this.constructor.name}: It's a Network Error, will retry`, error);
                        return new Retry(this.calulateMillisToRetry());
                    }
                    
                    if(error instanceof ErrorResponse) {
                        if(error.statusCode >= 500 && error.statusCode < 600){
                            this.logger.verbose(`${this.constructor.name}: Error 5xx, will retry`);
                            return new Retry(this.calulateMillisToRetry());
                        }
                        if(error.statusCode === 401){
                            this.logger.verbose(`${this.constructor.name}: Error 401 - probably expired token, retrying immediately`);
                            return new Retry(0) //Token expired - can retry immediately
                        }
                    }
                    this.logger.verbose(`${this.constructor.name}: Error is not retryable`, error);
                    return new DoNotRetry(error);
                }
                
                private calulateMillisToRetry(): number {
                    
                    if(this.currentBackoffMillis >= this.maxBackoffMillis || this.currentBackoffMillis * 2 >= this.maxBackoffMillis) {
                        this.currentBackoffMillis = this.maxBackoffMillis;
                    }
                    
                    else if(this.retryCount > 0){
                        this.currentBackoffMillis = this.currentBackoffMillis * 2;
                    }
                    
                    this.logger.verbose(`Retrying in ${this.currentBackoffMillis}ms`);
                    return this.currentBackoffMillis;
                    
                }
            }
