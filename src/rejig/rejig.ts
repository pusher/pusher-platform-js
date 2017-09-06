import {Headers, ErrorResponse} from '../base-client';
import {RetryStrategyResult, Retry} from '../retry-strategy/retry-strategy';
import {Logger} from '../logger';
import { BaseSubscription, SubscriptionEvent } from '../subscription/base-subscription';
import { RetryResolution } from "../retry-strategy/exponential-backoff-retry-strategy";
import { createResumingStrategy } from './resuming-subscription';
import { SubscriptionConstructor, Subscription } from './subscription';




export class H2TransportSubscription implements Subscription {
    unsubscribe(){
        throw new Error("Not implemented");
    }
}






class FakeClient {

    private xhrConstructor: (path: string) => (headers: Headers) => XMLHttpRequest = (path) => {
        return (headers) =>  null; //TODO:
    } 

    private logger: Logger;

    subscribe(
        path, headers, listeners, retryStrategyOptions, tokenProvider
    ): Subscription {

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
    
        let opened = false;

        return subscriptionStrategy(
            headers => {
                if(!opened){
                    opened = true;
                    listeners.onOpen(headers);
                }
                listeners.onSubscribe();                
            },
            error =>{
                if(error instanceof ErrorResponse && error.statusCode === 255){
                    listeners.onEnd(error);
                }
                else{
                    listeners.onError(error);
                }
            },
            listeners.onEvent,
            headers,
            subscriptionConstructor
        );
    }

    subscribeResumable(
        path, headers, listeners, retryStrategyOptions, initialEventId, tokenProvider
     ): Subscription {
         
        let xhrFactory = this.xhrConstructor(path);

        let subscriptionConstructor: SubscriptionConstructor = (headers, onOpen, onError, onEvent) => {
            return new BaseSubscription(xhrFactory(headers), this.logger, onOpen, onError, onEvent);
        };

        let resumingSubscriptionStrategy = createResumingStrategy(
            retryStrategyOptions, 
            initialEventId,
            createTokenProvidingStrategy(
                tokenProvider,
                createH2TransportStrategy()
            )
        );

        return resumingSubscriptionStrategy(
            listeners.onOpen,
            listeners.onError,
            listeners.onEvent,
            headers,
            subscriptionConstructor);
    }
}

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

export let createRetryStrategyOptionsOrDefault: (RetryStrategyOptions) => RetryStrategyOptions = (options: RetryStrategyOptions) => {

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


//This is a dummy that just executes whatever the constructor does. Doesn't do anything else.
let createH2TransportStrategy: () => SubscribeStrategy = () => {

    let strategy: SubscribeStrategy = (onOpen, onError, onEvent, headers, constructor) => {
        return constructor(onOpen, onError, onEvent, headers);
    }
    return strategy;
}

//TODO:
let createWebSocketTransportStrategy: () => SubscribeStrategy = () => {
    throw new Error("Not implemented");    
}