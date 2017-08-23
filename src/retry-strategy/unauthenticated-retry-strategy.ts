import { Logger } from '../logger';
import { NetworkRequest } from '../request';
import { BaseSubscription } from '../subscription/base-subscription';
import { RetryStrategy } from './retry-strategy';

/**
 * This serves as a no-op implementation of RetryStrategy that just relays whatever it has to the underlying requests. 
 * Used with ExponentialBackoffRetryStrategy when we don't have a TokenProvider
 */
export class UnauthenticatedRetryStrategy implements RetryStrategy {
    constructor(
        private logger: Logger
    ){}

    private subscription: BaseSubscription;

    executeSubscription(
        error: any,
        xhrSource: () => XMLHttpRequest, 
        lastEventId: string,
        subscriptionCallback: (subscription: BaseSubscription) => void, 
        errorCallback: (error: any) => void
    ){
        let xhr = xhrSource();
        if(lastEventId){
            xhr.setRequestHeader("Last-Event-Id", lastEventId);                
        }
        this.subscription = new BaseSubscription(
            xhr, 
            this.logger, 
            (headers) => {
                subscriptionCallback(this.subscription);
            }, 
            (error) => {
                errorCallback(error);
            } 
        );
    }   

    executeRequest<T>(error: any, request: NetworkRequest<T>){
        return request();
    }

    stopRetrying(){
        if(this.subscription){
            this.subscription.unsubscribe();
        }
    }
}