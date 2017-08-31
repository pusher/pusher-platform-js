import { NoOpTokenProvider, TokenProvider } from '../token-provider';
import { NetworkRequest } from '../request';
import { BaseSubscription } from '../subscription/base-subscription';
import { ErrorResponse, NetworkError, Headers } from '../base-client';
import { UnauthenticatedRetryStrategy } from './unauthenticated-retry-strategy';
import { EmptyLogger, Logger } from '../logger';
import { DoNotRetry, Retry, RetryStrategy, RetryStrategyResult } from './retry-strategy';

export interface ExponentialBackoffRetryStrategyOptions {
    tokenFetchingRetryStrategy?: RetryStrategy, //Retry strategy that checks for expired token and fetches it
    retryUnsafeRequests?: boolean, //Elements doesn't allow unsafe requests to be retried, external calls to non-elements APIs might require it (for token providers, for instance)
    limit?: number, //Max number of retries, -1 if unlimited
    maxBackoffMillis?: number, //Maximum length for backoff
    defaultBackoffMillis?: number, //Initial backoff we start from
    logger?: Logger //A lumberjack
    tokenProvider?: TokenProvider;
}

export class ExponentialBackoffRetryStrategy implements RetryStrategy {

    private logger: Logger;
    private retryUnsafeRequests: boolean;
    private limit: number;
    private maxBackoffMillis: number;
    private defaultBackoffMillis: number;

    private retryCount: number = 0;
    private currentBackoffMillis: number;
    private pendingTimeout: number = 0;  
    private tokenProvider: TokenProvider;
    
    constructor(private options: ExponentialBackoffRetryStrategyOptions){        
        this.logger = this.options.logger || new EmptyLogger();
        this.retryUnsafeRequests = this.options.retryUnsafeRequests || false;
        this.tokenProvider = options.tokenProvider || new NoOpTokenProvider();
        if(this.options.limit != null && this.options.limit != undefined){
             this.limit = this.options.limit;
        }
        else{
            this.limit = -1;
        }
        this.maxBackoffMillis = this.options.maxBackoffMillis || 5000;
        this.defaultBackoffMillis = this.options.defaultBackoffMillis || 1000;
        this.currentBackoffMillis = this.defaultBackoffMillis;
    }

    executeRequest<T>( request: NetworkRequest<T>): Promise<T> {
        return request()
            .catch( error => {
                return this.resolveError(error)
                    .then ( () => {
                        return this.executeRequest<T>(request) as Promise<T>;
                    });
            }
        );
    }
    
    executeSubscription(
        subscriptionSource: (headers: Headers) => Promise<BaseSubscription>, //Takes token to create a sub.
        subscriptionCallback: (subscription: BaseSubscription) => void, 
        errorCallback: (error: any) => void
    ){
        this.tokenProvider.fetchToken()
            .then( token => {
                let headers: Headers = { [ "jwt"]: token };
                return subscriptionSource(headers)                 
            })
            .then( subscription => {
                subscriptionCallback(subscription);
            })
            .catch( error => {
                return this.resolveError(error)
            })
            .then( () => {
                this.executeSubscription(
                    subscriptionSource,
                    subscriptionCallback,
                    errorCallback
                );
            })
            .catch( nonRetryableError => {
                errorCallback(nonRetryableError);
            });
    }

    stopRetrying(){
        this.tokenProvider.stopFetch();
        if(this.pendingTimeout > 0){
            window.clearTimeout(this.pendingTimeout);
            this.pendingTimeout = 0;
        }
    }

    //TODO: check for token being invalid and refresh then.
    resolveError(error: any): Promise<any> {
        return new Promise( (resolve, reject) => {
            
            //Error could be null - in which case 🚀🚀🚀
            if(!error){ 
                resolve();
                return;
            }

            const shouldRetry = this.shouldRetry(error);
            this.logger.debug("ResolveError " + shouldRetry.constructor.name);

            if(shouldRetry instanceof DoNotRetry) {
                reject(error);
            }
            else if(shouldRetry instanceof Retry){
                this.retryCount += 1;
                
                this.pendingTimeout = window.setTimeout(() => {
                    resolve();
                }, shouldRetry.waitTimeMillis);                
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
        
        if (error instanceof NetworkError || this.requestMethodIsSafe("SUBSCRIBE") || this.retryUnsafeRequests) { //TODO: request method safe is problematic
            return this.shouldSafeRetry(error);
        }
        
        debugger
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
