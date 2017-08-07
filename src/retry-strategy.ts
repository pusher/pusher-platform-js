import { ErrorResponse, NetworkError } from './base-client';
import { ConsoleLogger, EmptyLogger, Logger } from './logger';

export interface RetryStrategy {
    attemptRetry(error: Error): Promise<Error>;
    cancel(): void; //Cancels any pending retries
    reset(): void; //Resets the retry counter

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

export interface ExponentialBackoffRetryStrategyOptions {

    limit?: number;
    initialBackoffMillis?: number;
    maxBackoffMillis?: number;
    ignoreRetryAfterHeaders: boolean;
}

export class ExponentialBackoffRetryStrategy implements RetryStrategy {

    private logger: Logger;

    private limit: number = 6;
    private retryCount = 0;

    private maxBackoffMillis: number = 30000;
    private defaultBackoffMillis: number = 1000;
    private currentBackoffMillis: number = this.defaultBackoffMillis;

    private pendingTimeouts = new Set<number>();

    constructor(options: any){
        if(options.limit) this.limit = options.limit;
        if(options.initialBackoffMillis){
             this.currentBackoffMillis = options.initialBackoffMillis;
             this.defaultBackoffMillis = options.defaultBackoffMillis;
        }

        if(options.maxBackoffMillis) this.maxBackoffMillis = options.maxBackoffMillis;

        if(options.logger !== undefined) {
            this.logger = options.logger;
        } else{ 
            this.logger = new EmptyLogger();
        }
    }

    attemptRetry(error: Error): Promise<any> {
        return new Promise((resolve, reject) => {

            let shouldRetry = this.shouldRetry(error);

            if(shouldRetry instanceof DoNotRetry){
                reject(error);
            }
            else if(shouldRetry instanceof Retry) {
                const timeout = window.setTimeout(() => {
                    this.pendingTimeouts.delete(timeout);
                }, shouldRetry.waitTimeMillis);
                this.pendingTimeouts.add(timeout);
            }
        });
    }

    reset(): void {
        this.retryCount = 0;
        this.currentBackoffMillis = this.defaultBackoffMillis;
    }

    cancel(): void {
        this.pendingTimeouts.forEach( (timeout) => {
            window.clearTimeout(timeout);
            this.pendingTimeouts.delete(timeout)
        });        
    }

    private isRetryable(error: Error): RetryableResult {
        let retryable: RetryableResult = {
            isRetryable: false
        }
         //We allow network errors
         if(error instanceof NetworkError) retryable.isRetryable = true;

         else if(error instanceof ErrorResponse) {
             //Only retry after is allowed
             if(error.headers["Retry-After"]) {
                 retryable.isRetryable = true;
                 retryable.backoffMillis = parseInt(error.headers["retry-after"]) * 1000;
             } else if(error.statusCode === 401) {
                //We are unauthorized and should retry refreshing token. Can retry immediately.
                retryable.isRetryable = true;
                retryable.backoffMillis = 0;
             }
         }
        return retryable;
    }

    private shouldRetry(error: Error): RetryStrategyResult {

        this.logger.verbose(`${this.constructor.name}:  Error received`, error);
        
        if(this.retryCount >= this.limit && this.limit > 0 ){
            this.logger.verbose(`${this.constructor.name}:  Retry count is over the maximum limit: ${this.limit}`);
            return new DoNotRetry(error);
        }

        let retryable = this.isRetryable(error);
        if(retryable.isRetryable){

            if(retryable.backoffMillis){
                this.retryCount += 1;
                return new Retry(retryable.backoffMillis);
            }
            else{
                this.currentBackoffMillis = this.calulateMillisToRetry();
                this.retryCount += 1;
            
                this.logger.verbose(`${this.constructor.name}: Will attempt to retry in: ${this.currentBackoffMillis}`);
                return new Retry(this.currentBackoffMillis)
            }
        }

        else{
            this.logger.verbose(`${this.constructor.name}: Error is not retryable`, error);
            return new DoNotRetry(error);
        }
    }

    private calulateMillisToRetry(): number{
        
        if(this.currentBackoffMillis >= this.maxBackoffMillis || this.currentBackoffMillis * 2 >= this.maxBackoffMillis) {
            return this.maxBackoffMillis;
        }
            
        if(this.retryCount > 0){
            return this.currentBackoffMillis * 2;
        }

        return this.currentBackoffMillis;
    }
}

export type RetryableResult = {
    isRetryable: boolean;
    backoffMillis?: number;
}
