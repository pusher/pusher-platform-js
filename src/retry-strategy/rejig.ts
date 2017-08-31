import { ErrorResponse } from '../base-client';
import { DoNotRetry, Retry, RetryStrategyResult } from './retry-strategy';
import { Logger } from '../logger';
import { BaseSubscription, SubscriptionEvent } from '../subscription/base-subscription';
import { RetryResolution } from "./exponential-backoff-retry-strategy";

class SubscriptionConstruction {
    constructor(private subscriptionCallback: (subscription: BaseSubscription) => void){}
    
    cancel(){
        //TODO;
    }   
}

class FakeClient {

    private xhrConstructor: (path: string) => (headers: Headers) => XMLHttpRequest = (path) => {
        return (headers) =>  null; //TODO:
    } 

    private logger: Logger;

    //TODO: Should we block until returning on use a callback/promise for it?
    subscribe(
        path, headers, listeners, retryStrategyOptions, tokenProvider
    ): BaseSubscription {

        let xhrFactory = this.xhrConstructor(path);
        
        let subscriptionConstructor: SubscriptionConstructor = (headers, onOpen, onError, onEvent) => {
            return new BaseSubscription(xhrFactory(headers), this.logger, onOpen, onError, onEvent);
        };
    
        let subscriptionStrategy = createRetryingStrategy(
            retryStrategyOptions, 
            createTokenProvidingStrategy(
                tokenProvider,
                createH2TransportStrategy()
            )
        );
    
        return subscriptionStrategy(
            listeners.onOpen,
            listeners.onError,
            listeners.onEvent,
            headers,
            subscriptionConstructor);
    }

    subscribeResumable(
        path, headers, listeners, retryStrategyOptions, initialEventId, tokenProvider
     ): BaseSubscription {
        let xhrFactory = this.xhrConstructor(path);

        let subscriptionConstructor: SubscriptionConstructor = (headers, onOpen, onError, onEvent) => {
            return new BaseSubscription(xhrFactory(headers), this.logger, onOpen, onError, onEvent);
        };

        let subscriptionStrategy = createResumingStrategy(
            retryStrategyOptions, 
            initialEventId,
            createTokenProvidingStrategy(
                tokenProvider,
                createH2TransportStrategy()
            )
        );

        return subscriptionStrategy(
            listeners.onOpen,
            listeners.onError,
            listeners.onEvent,
            headers,
            subscriptionConstructor);
    }
}

type SubscriptionConstructor = (headers, onOpen, onError, onEvent) => BaseSubscription;

type SubscribeStrategy = (onOpen, onError, onEvent, headers: Headers, subscriptionConstructor: SubscriptionConstructor) => BaseSubscription;

/**
 * Configuration for the retry strategy backoff. Defaults to indefinite retries doubling each time with the max backoff of 5s. First retry is after 1s.
 * Used for creating both resuming and non-resuming (just retrying) subs
 */
export interface RetryStrategyOptions {
    initialTimeoutMillis: number,    
    maxTimeoutMillis: number,
    limit: number,
    increaseTimeout: (timeout: number) => number,
}

let createRetryStrategyOptionsOrDefault: (RetryStrategyOptions) => RetryStrategyOptions = (options: RetryStrategyOptions) => {

    let initialTimeoutMillis = 1000;
    let maxTimeoutMillis = 5000;
    let limit = -1;
    let increaseTimeoutFunction = (timeout: number) => 2 * timeout <= this.maxTimeoutMillis ? 2*timeout : this.maxTimeoutMillis; 

    if(options.initialTimeoutMillis) initialTimeoutMillis = options.initialTimeoutMillis;
    if(options.maxTimeoutMillis) maxTimeoutMillis = options.maxTimeoutMillis;
    if(options.limit) limit = options.limit;
    if(options.increaseTimeout) increaseTimeoutFunction = options.increaseTimeout;

    return {
        initialTimeoutMillis: initialTimeoutMillis,
        maxTimeoutMillis: maxTimeoutMillis,
        limit: limit,
        increaseTimeout: increaseTimeoutFunction
    }
}

let createResumingStrategy: (retryingOptions: RetryStrategyOptions, initialEventId: string, nextSubscribeStrategy: SubscribeStrategy) => SubscribeStrategy = 
    
    (retryOptions, initialEventId, nextSubscribeStrategy) => {

        retryOptions = createRetryStrategyOptionsOrDefault(retryOptions);
        let retryResolution = new RetryResolution(retryOptions);
    
    let strategy: SubscribeStrategy = (onOpen, onError, onEvent, headers, constructor) => {

        let executeStrategy: (lastEventId?: string) => BaseSubscription = (lastEventId) => {

            if(lastEventId){
                headers["Last-Event-Id"] = lastEventId;
            }
            
            let resolveError: (error: any) => RetryStrategyResult = (error) => {
                return retryResolution.attemptRetry(error);
            }

            let executeStrategyWithLastEventId = () => executeStrategy(lastEventId);

            return nextSubscribeStrategy(
                onOpen, //TODO: track first onOpen - then onSubscribe
                error => {
                    let errorResolution = resolveError(error);
                    if(errorResolution instanceof Retry){
                        window.setTimeout( executeStrategyWithLastEventId, errorResolution.waitTimeMillis); //TODO:
                    }
                    else{
                        onError(error);
                    }
                },
                event => {
                    lastEventId = (event as SubscriptionEvent).eventId;
                    onEvent(event);
                },
                headers,
                constructor
            );
        }
        return executeStrategy(initialEventId);
    };

    return strategy;
}

let createRetryingStrategy: (retryingOption: RetryStrategyOptions, nextSubscribeStrategy: SubscribeStrategy) => SubscribeStrategy = 

    (retryOptions, nextSubscribeStrategy) => {

        retryOptions = createRetryStrategyOptionsOrDefault(retryOptions); 
        let retryResolution = new RetryResolution(retryOptions);        

    let strategy: SubscribeStrategy = (onOpen, onError, onEvent, headers, constructor) => {
        
        let executeStrategy: () => BaseSubscription = () => {
            
            let resolveError: (error: any) => RetryStrategyResult = (error) => {
                return retryResolution.attemptRetry(error);
            }
    
            return nextSubscribeStrategy(
                onOpen,
                error => {
                    let errorResolution = resolveError(error);
                    if(errorResolution instanceof Retry){
                        window.setTimeout( executeStrategy, errorResolution.waitTimeMillis); //TODO:
                    }
                    else{
                        onError(error);
                    }
                },
                onEvent,
                headers,
                constructor
            );
        }
        return executeStrategy();
    };    
    return strategy;
}

/**
 * Can we provide token synchronously? I think this would make it a lot simpler  to chain all the events
 */
interface SynchronousTokenProvider {
    fetchToken(): string;
    clearToken(): void;
}

let createTokenProvidingStrategy: (tokenProvider: SynchronousTokenProvider, nextSubscribeStrategy: SubscribeStrategy) => SubscribeStrategy = (tokenProvider, nextSubscribeStrategy) => {

    let strategy: SubscribeStrategy = (onOpen, onError, onEvent, headers, constructor) => {

        let executeStrategy: () => BaseSubscription = () => {
            let token = tokenProvider.fetchToken();
            if(token){
                headers["Authorization"] = `Bearer ${token}`;
            }
    
            let isTokenExpiredError: (error: any) => boolean = error => {
                return (
                    error instanceof ErrorResponse && 
                    error.statusCode === 401 && 
                    error.info === "authentication/expired"
                ); 
            }
            
            return nextSubscribeStrategy(
                onOpen,
                error => {
                    if(isTokenExpiredError(error)){
                        tokenProvider.clearToken();
                        tokenProvider.fetchToken();
                        return executeStrategy();
                    }
                    else {
                        onError(error);
                    }
                },
                onEvent,
                headers,
                constructor
            );
        }

        return executeStrategy();
    }
    return strategy;
} 

//This is a dummy that just executes whatever the constructor does. Doesn't do anything else.
let createH2TransportStrategy: () => SubscribeStrategy = () => {

    let strategy: SubscribeStrategy = (onOpen, onError, onEvent, headers, constructor) => {
        return constructor(onOpen, onError, onEvent, headers);
    }
    return strategy;
}

//TODO:
let createWebSocketTransportStrategy: () => SubscribeStrategy = () => {
    return null;
}