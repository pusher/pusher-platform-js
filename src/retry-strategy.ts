import { ErrorResponse, NetworkError } from './base-client';
export interface RetryStrategy {
    shouldRetry(error: Error): RetryStrategyResult;
}

export interface RetryStrategyResult {}

export class Retry implements RetryStrategyResult {
    waitTimeMilis: number;
    constructor(waitTimeMilis: number){
        this.waitTimeMilis = waitTimeMilis;
    }
}

export class DoNotRetry implements RetryStrategyResult {
    error: Error;
    constructor(error: Error){
        this.error = error;
    }
}

export class ExponentialBackoffRetryStrategy implements RetryStrategy {

    private logger: any;

    private limit: number = 6;
    private retryCount = 0;

    private maxBackoffMilis: number = 30000;
    private currentBackoffMilis: number = 1000;

    constructor(options: any){
        if(options.limit) this.limit = options.limit;
        if(options.initialBackoffMilis) this.currentBackoffMilis = options.initialBackoffMilis;
        if(options.maxBackoffMilis) this.maxBackoffMilis = options.maxBackoffMilis;
        if(options.logger) this.logger = options.logger;
    }

    shouldRetry(error: Error): RetryStrategyResult {

        this.log("Error received: " + error);
        
        if(this.retryCount >= this.limit && this.limit > 0 ){
            this.log("Retry count is over the maximum limit: " + this.limit);
            return new DoNotRetry(error);
        }

        let retryable = this.isRetryable(error);
        if(retryable.isRetryable){

            if(retryable.backoffMillis){
                this.retryCount += 1;
                return new Retry(retryable.backoffMillis);
            }
            else{
                this.currentBackoffMilis = this.calulateMilisToRetry();
                this.retryCount += 1;
            
                this.log("Will attempt to retry in: " + this.currentBackoffMilis);
                return new Retry(this.currentBackoffMilis)
            }
        
        }

        else{
            this.log("Error is not retryable. " + error);
            return new DoNotRetry(error);
        }
    }

    isRetryable(error: Error): RetryableResult {
        let retryable: RetryableResult = {
            isRetryable: false
        }
         //We allow network errors
         if(error instanceof NetworkError) retryable.isRetryable = true;

         else if(error instanceof ErrorResponse) {
             //Only retry after is allowed
             if(error.headers["retry-after"]) {
                 retryable.isRetryable = true;
                 retryable.backoffMillis = parseInt(error.headers["retry-after"]) * 1000;
             }
             //TODO: Permit 500s?
             else if( error.statusCode >= 500 ) retryable.isRetryable = true; 
         }
        return retryable;
    }

    log(message: any): void {
        if(this.logger){
            this.logger.log(message);
        }
    }

    private calulateMilisToRetry(): number{
        
        if(this.currentBackoffMilis >= this.maxBackoffMilis || this.currentBackoffMilis * 2 >= this.maxBackoffMilis) {
            return this.maxBackoffMilis;
        }
            
        if(this.retryCount > 0){
            return this.currentBackoffMilis * 2;
        }

        return this.currentBackoffMilis;
    }
}

export type RetryableResult = {
    isRetryable: boolean;
    backoffMillis?: number;
}
