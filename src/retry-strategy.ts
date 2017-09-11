import { ErrorResponse, NetworkError } from './base-client';

export interface RetryStrategyOptions {
    initialTimeoutMillis?:  number,
    maxTimeoutMillis?: number,
    limit?: number,
    increaseTimeout?: (currentTimeout: number) => number;
}

export let createRetryStrategyOptionsOrDefault: (options: RetryStrategyOptions) => RetryStrategyOptions = (options: RetryStrategyOptions) => {

    const initialTimeoutMillis = options.initialTimeoutMillis || 1000;
    const maxTimeoutMillis = options.maxTimeoutMillis || 5000;
    const limit = options.limit || -1;

    let increaseTimeout: (currentTimeout: number) => number;

    if(options.increaseTimeout){
        increaseTimeout = options.increaseTimeout;
    }
    else {
        increaseTimeout = (currentTimeout) => {
            if ((currentTimeout * 2) > maxTimeoutMillis){
                return maxTimeoutMillis;
            }
            else {
                return currentTimeout * 2;
            }
        }
    }

    return {
        initialTimeoutMillis: initialTimeoutMillis,
        maxTimeoutMillis: maxTimeoutMillis,
        limit: limit,
        increaseTimeout: increaseTimeout
    }
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

export class RetryResolution{
    private initialTimeoutMillis
    private maxTimeoutMillis
    private limit
    private increaseTimeoutFunction
    
    private currentRetryCount = 0;
    private currentBackoffMillis: number;

    constructor(private options: RetryStrategyOptions, private logger: Logger){
        this.initialTimeoutMillis = options.initialTimeoutMillis;
        this.maxTimeoutMillis = options.maxTimeoutMillis;
        this.limit = options.limit;
        this.increaseTimeoutFunction = options.increaseTimeout;
        this.currentBackoffMillis = this.initialTimeoutMillis;
    }

    public attemptRetry(error: any): RetryStrategyResult {
        this.logger.verbose(`${this.constructor.name}:  Error received`, error);
        
        if(this.currentRetryCount >= this.limit && this.limit >= 0 ){
            this.logger.verbose(`${this.constructor.name}:  Retry count is over the maximum limit: ${this.limit}`);
            return new DoNotRetry(error);
        }
        
        if (error instanceof ErrorResponse && error.headers['Retry-After']){
            this.logger.verbose(`${this.constructor.name}:  Retry-After header is present, retrying in ${error.headers['Retry-After']}`);
            return new Retry(parseInt(error.headers['Retry-After']) * 1000);
        } 
        
        // if (error instanceof NetworkError || this.requestMethodIsSafe("SUBSCRIBE") || this.retryUnsafeRequests) { //TODO: request method safe is problematic
        //     return this.shouldSafeRetry(error);
        // }
        if(error instanceof NetworkError) return this.shouldSafeRetry(error);
        
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
                // this.logger.verbose(`${this.constructor.name}: Error 401 - probably expired token, retrying immediately`);
                return new Retry(0) //Token expired - can retry immediately //TODO: this is wonky.
            }
        }
        this.logger.verbose(`${this.constructor.name}: Error is not retryable`, error);
        return new DoNotRetry(error);
    }
        
    private calulateMillisToRetry(): number {
        
        if(this.currentBackoffMillis >= this.maxTimeoutMillis || this.currentBackoffMillis * 2 >= this.maxTimeoutMillis) {
            this.currentBackoffMillis = this.maxTimeoutMillis;
        }
        
        else if(this.currentRetryCount > 0){
            this.currentBackoffMillis = this.currentBackoffMillis * 2;
        }
        
        this.logger.verbose(`${this.constructor.name}: Retrying in ${this.currentBackoffMillis}ms`);
        return this.currentBackoffMillis;
        
    }
    
}