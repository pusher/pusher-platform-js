import { TokenProvider } from '../../declarations/token-provider';
import {Headers, ErrorResponse} from '../base-client';
import {RetryStrategyResult, Retry} from '../retry-strategy/retry-strategy';
import {Logger} from '../logger';
import { BaseSubscription } from '../subscription/base-subscription';
import { RetryResolution } from "../retry-strategy/exponential-backoff-retry-strategy";
import { createResumingStrategy } from './resuming-subscription';
import { SubscriptionConstructor, Subscription } from './subscription';
import { createRetryingStrategy } from './retrying-subscription';
import { createTokenProvidingStrategy } from './token-providing-subscription';

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