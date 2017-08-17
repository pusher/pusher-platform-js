import { Logger } from './logger';
import { TokenProvider } from './token-provider';
import { RetryStrategy } from './retry-strategy/retry-strategy';
import { ErrorResponse, Headers } from './base-client';
import { BaseSubscription, BaseSubscriptionConstruction, SubscriptionEvent } from './base-subscription';

export interface NonResumableSubscribeOptions {
    headers: Headers;
    path: string;
    listeners: NonResumableSubscriptionStateListeners;
    retryStrategy: RetryStrategy;
    tokenProvider: TokenProvider;
    logger: Logger;
}   

export interface NonResumableSubscriptionState {}

export interface NonResumableSubscriptionStateListeners {

    onSubscribed: (headers: Headers) => void;
    onOpen: () => void;
    onRetrying: () => void;
    onEvent: (event: SubscriptionEvent) => void;
    onEnd: (error?: ErrorResponse) => void;
    onError: (error: any) => void;
}

export interface NonResumableSubscriptionStateTransition {
    onTransition(state: NonResumableSubscriptionState)
}

export class NonResumableSubscription implements NonResumableSubscriptionStateTransition {
    state: NonResumableSubscriptionState;

    constructor(
        baseSubscriptionContructor: (error: any) => BaseSubscriptionConstruction,
        options: NonResumableSubscribeOptions,
        listeners: NonResumableSubscriptionStateListeners
    ){
        this.state = new SubscribingNonResumableSubscriptionState ( 
            baseSubscriptionContructor,
            listeners,
            this.onTransition
        );
    }

    onTransition(newState: NonResumableSubscriptionState){
        this.state = newState;
    }
}

class SubscribingNonResumableSubscriptionState implements NonResumableSubscriptionState {
    constructor(
        baseSubscriptionConstructor: (error: any) => BaseSubscriptionConstruction,
        listeners: NonResumableSubscriptionStateListeners,
        onTransition: (newState: NonResumableSubscriptionState) => void
    ){

        const subscriptionConstruction = baseSubscriptionConstructor(null);
        subscriptionConstruction.onComplete( subscription => {
            listeners.onSubscribed(subscription.getHeaders());
            onTransition( new OpenNonResumableSubscriptionState(
                subscription,
                baseSubscriptionConstructor,
                listeners,
                onTransition
            ));        
        });
    }
}

class OpenNonResumableSubscriptionState implements NonResumableSubscriptionState {
    constructor(
        subscription: BaseSubscription,
        baseSubscriptionConstructor: (error: any) => BaseSubscriptionConstruction,
        listeners: NonResumableSubscriptionStateListeners,
        onTransition: (newState: NonResumableSubscriptionState) => void
    ){
        subscription.onEvent = listeners.onEvent;
        subscription.onEnd = (error) =>{
            onTransition(new EndedSubscriptionState(
                error,
                listeners
            ));
        }
        subscription.onError = (error) => {
            listeners.onRetrying();
            onTransition( new RetryingNonResumableSubscriptionState(
                error,
                baseSubscriptionConstructor,
                listeners,
                onTransition
            ));
        }
    }
}

class RetryingNonResumableSubscriptionState implements NonResumableSubscriptionState {
    constructor(
        error: any,
        baseSubscriptionConstructor: (error: any) => BaseSubscriptionConstruction,
        listeners: NonResumableSubscriptionStateListeners,
        onTransition: (newState: NonResumableSubscriptionState) => void
    ){
        const subscriptionConstruction = baseSubscriptionConstructor(null);
        subscriptionConstruction.onComplete( (subscription) => {
            listeners.onSubscribed(subscription.getHeaders());
            onTransition( new OpenNonResumableSubscriptionState(
                subscription,
                baseSubscriptionConstructor,
                listeners,
                onTransition
            ));   
        })
    }
}

class FailedSubscriptionState implements NonResumableSubscriptionState {
    constructor(
        error: any,
        listeners: NonResumableSubscriptionStateListeners
    ){
        listeners.onError(error);
    }
}

class EndedSubscriptionState implements NonResumableSubscriptionState {
    constructor(
        error: any,
        listeners: NonResumableSubscriptionStateListeners
    ){
        listeners.onEnd(error);
    }
}
