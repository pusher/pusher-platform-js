import { NetworkRequest } from '../base-client';
import { BaseSubscription } from '../base-subscription';
import { RetryStrategy } from './retry-strategy';

/**
 * This serves as a no-op implementation of RetryStrategy that just relays whatever it has to the underlying requests. 
 * Used with ExponentialBackoffRetryStrategy when we don't have a TokenProvider
 */
export class UnauthenticatedRetryStrategy implements RetryStrategy {
    executeSubscription(
        error: any,
        xhrSource: () => XMLHttpRequest, 
        subscriptionCallback: (subscription: BaseSubscription) => void, 
        errorCallback: (error: any) => void) {
            let subscription = new BaseSubscription(
                    xhrSource(), 
                    null, 
                    (headers) => {
                        subscriptionCallback(subscription);
                    }, 
                    (error) => {
                        errorCallback(error);
                    } 
                );
    }

    executeRequest<T>(error: any, request: NetworkRequest<T>){
        return request();
    }
}