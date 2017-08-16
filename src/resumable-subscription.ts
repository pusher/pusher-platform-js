import { NoOpTokenProvider, TokenProvider } from './token-provider';
import { ErrorResponse, Headers } from './base-client';
import {
    RetryStrategy,
    ExponentialBackoffRetryStrategy,
    Retry,
    DoNotRetry
} from './retry-strategy';
import { Logger } from './logger';
import {
    BaseSubscription,
    SubscriptionEvent,
    BaseSubscriptionConstruction
} from './base-subscription'

export interface ResumableSubscribeOptions {
    headers: Headers;
    path: string;
    tokenProvider: TokenProvider;
    retryStrategy: RetryStrategy;
    initialEventId?: string;
    listeners: ResumableSubscriptionStateListeners;
    logger: Logger;
}

export interface ResumableSubscriptionState {}

export interface ResumableSubscriptionStateListeners {
    onSubscribed: (headers: Headers) => void;
    onOpen: () => void;
    onResuming: () => void;
    onEvent: (event: SubscriptionEvent) => void;
    onEnd: (error?: ErrorResponse) => void;
    onError: (error: any) => void;
}

export interface ResumableSubscriptionStateTransition {
    onTransition(state: ResumableSubscriptionState): void
}

export class ResumableSubscription implements ResumableSubscriptionStateTransition {

    state: ResumableSubscriptionState;

    constructor(
        baseSubscriptionConstructor: (error: any, lastEventId?: string) =>   BaseSubscriptionConstruction, //TODO:
        options: ResumableSubscribeOptions,
        listeners: ResumableSubscriptionStateListeners
    ){
        
        this.state = new SubscribingResumableSubscriptionState(
            options.initialEventId,
            baseSubscriptionConstructor,
            listeners,
            this.onTransition
        );
    }  
    
    unsubscribe(){
        //TODO:
    }

    onTransition(newState: ResumableSubscriptionState){
        this.state = newState;
    }
}

class SubscribingResumableSubscriptionState implements ResumableSubscriptionState {
    constructor(
        initialEventId: string,
        subscriptionConstructor: (error: any, lastEventId?: string) =>   BaseSubscriptionConstruction,
        listeners: ResumableSubscriptionStateListeners,
        onTransition: (newState: ResumableSubscriptionState) => void
    ) { 
        const subscriptionConstruction = subscriptionConstructor(null, initialEventId);
        subscriptionConstruction.onComplete( (subscription) => {
            listeners.onSubscribed(null); //should return `subscription.headers`
            onTransition(new OpenSubscriptionState(
                subscription,
                initialEventId,
                subscriptionConstructor,
                listeners,
                onTransition
            ));
        });
        subscriptionConstruction.onError( (error) => {
            onTransition(new FailedSubscriptionState(error, listeners));
        });
    } 
}

class OpenSubscriptionState implements ResumableSubscriptionState {
    constructor(
        subscription: BaseSubscription,
        lastEventId: string,
        subscriptionConstructor: (error: any, lastEventId?: string) =>   BaseSubscriptionConstruction,
        listeners: ResumableSubscriptionStateListeners,
        onTransition: (newState: ResumableSubscriptionState) => void
    ){
        subscription.onEvent = (event) => {
            lastEventId = event.eventId;
            listeners.onEvent(event);
        };
        subscription.onEnd = (error) => {
            onTransition( new EndedResumableSubscriptionState(
                error, 
                listeners));
        };
        subscription.onError = (error) => {
            listeners.onResuming();
            onTransition( new ResumingResumableSubscriptionState(
                error,
                lastEventId,
                subscriptionConstructor,
                listeners,
                onTransition
            ));
        }
    }
}

class ResumingResumableSubscriptionState implements ResumableSubscriptionState {
    constructor(
        error: any,
        lastEventId: string,
        subscriptionConstructor: (error: any, lastEventId?: string) =>   BaseSubscriptionConstruction,
        listeners: ResumableSubscriptionStateListeners,
        onTransition: (newState: ResumableSubscriptionState) => void
    ){
        const subscriptionConstruction = subscriptionConstructor(null, lastEventId);
        subscriptionConstruction.onComplete( (subscription) => {
            listeners.onSubscribed(null); //should return `subscription.headers`
            onTransition(new OpenSubscriptionState(
                subscription,
                lastEventId,
                subscriptionConstructor,
                listeners,
                onTransition
            ));
        });
        subscriptionConstruction.onError( (error) => {
            onTransition(new FailedSubscriptionState(error, listeners));
        });
    }
}

class FailedSubscriptionState implements ResumableSubscriptionState {
    constructor(
        error: any,
        listeners: ResumableSubscriptionStateListeners
    ){
        listeners.onError(error);
    }
}

class EndedResumableSubscriptionState implements ResumableSubscriptionState {
    constructor(
        error: any,
        listeners: ResumableSubscriptionStateListeners
    ){
        listeners.onEnd(error);
    }
}
