import { BaseSubscription } from '../base-subscription';
import { ErrorResponse, NetworkError, NetworkRequest } from '../base-client';
import { UnauthenticatedRetryStrategy } from './unauthenticated-retry-strategy';
import { EmptyLogger, Logger } from '../logger';
import { DoNotRetry, Retry, RetryStrategy, RetryStrategyResult } from './retry-strategy';


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
    
    private tokenFetchingRetryStrategy: RetryStrategy = this.options.tokenFetchingRetryStrategy || new UnauthenticatedRetryStrategy();

    private logger: Logger = this.options.logger || new EmptyLogger();
    private retryUnsafeRequests: boolean = this.options.retryUnsafeRequests || false;
    private limit: number = this.options.limit || -1;
    private maxBackoffMillis: number = this.options.maxBackoffMillis || 5000;
    private defaultBackoffMillis: number = this.options.defaultBackoffMillis || 1000;

    private retryCount: number = 0;
    private currentBackoffMillis: number = this.defaultBackoffMillis;
    private pendingTimeouts = new Set<number>();    


    executeRequest<T>( 
        error: any,
        request: NetworkRequest<T>) {
            return new Promise<T>((resolve, reject) => {
                this.resolveError(error).then( () => {
                    return this.tokenFetchingRetryStrategy.executeRequest<T>(error, request);
                });
            });
    }
    
    executeSubscription(
        error: any,
        xhrSource: () => XMLHttpRequest, 
        lastEventId: string,
        subscriptionCallback: (subscription: BaseSubscription) => void, 
        errorCallback: (error: any) => void
    ){
        this.resolveError(error).then( () => {
            this.tokenFetchingRetryStrategy.executeSubscription(
                error, 
                xhrSource,
                lastEventId,
                (subscription) => {
                    this.logger.verbose("Errror resolved! ARRRRRR");
                    this.retryCount = 0;
                    this.currentBackoffMillis = this.defaultBackoffMillis;
                    subscriptionCallback(subscription);
                }, 
                (error ) => {
                    this.executeSubscription(
                        error,
                        xhrSource,
                        lastEventId,
                        subscriptionCallback,
                        errorCallback
                     );
                });
            }) 
    }

    

    resolveError(error: any): Promise<any> {
        return new Promise( (resolve, reject) => {
            
            //Error could be null - in which case 🚀🚀🚀
            if(!error){ 
                resolve();
                return;
            }

            const shouldRetry = this.shouldRetry(error);
            this.logger.debug("ResolveError " + shouldRetry);

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
        
        if (error instanceof NetworkError || this.requestMethodIsSafe("SUBSCRIBE") || this.retryUnsafeRequests) { //TODO: request method safe is problematic
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
