import { NoOpTokenProvider, TokenProvider } from '../token-provider';
import { ErrorResponse, Headers } from '../base-client';
import { RetryStrategy } from '../retry-strategy/retry-strategy';
import { Logger } from '../logger';
import {
    BaseSubscription,
    SubscriptionEvent,
    BaseSubscriptionConstruction
} from './base-subscription'

export interface ResumableSubscribeOptions {
    headers: Headers;
    path: string;
    tokenProvider?: TokenProvider;
    retryStrategy?: RetryStrategy;
    initialEventId?: string;
    listeners: ResumableSubscriptionStateListeners;
    logger: Logger;
}

export interface ResumableSubscriptionState {
    unsubscribe(): void;
}

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

export class ResumableSubscription implements ResumableSubscriptionStateTransition{

    private state: ResumableSubscriptionState ;

    constructor(
        baseSubscriptionConstructor: (error: any, lastEventId?: string) =>   BaseSubscriptionConstruction,
        options: ResumableSubscribeOptions,
        listeners: ResumableSubscriptionStateListeners
    ){        
        this.state = new SubscribingResumableSubscriptionState(
            options.initialEventId,
            baseSubscriptionConstructor,
            listeners,
            this.onTransition.bind(this)
        );
    }  

    onTransition = function(newState: ResumableSubscriptionState){
        this.state = newState;
    }
    
    unsubscribe(){
        this.state.unsubscribe();
    }
}

class SubscribingResumableSubscriptionState implements ResumableSubscriptionState {
    private subscriptionConstruction: BaseSubscriptionConstruction;
    constructor(
        initialEventId: string,
        subscriptionConstructor: (error: any, lastEventId?: string) =>   BaseSubscriptionConstruction,
        listeners: ResumableSubscriptionStateListeners,
        onTransition: (newState: ResumableSubscriptionState) => void
    ) { 
        this.subscriptionConstruction = subscriptionConstructor(null, initialEventId);
        this.subscriptionConstruction.onComplete( (subscription) => {
            listeners.onSubscribed(null); //should return `subscription.headers`
            onTransition(new OpenSubscriptionState(
                subscription,
                initialEventId,
                subscriptionConstructor,
                listeners,
                onTransition
            ));
        });
        this.subscriptionConstruction.onError( (error) => {
            onTransition(new FailedSubscriptionState(error, listeners));
        });
    }

    unsubscribe() {
        this.subscriptionConstruction.cancel();
    }
}

class OpenSubscriptionState implements ResumableSubscriptionState {
    constructor(
        private subscription: BaseSubscription,
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

    unsubscribe(){
        this.subscription.unsubscribe();
    }
}

class ResumingResumableSubscriptionState implements ResumableSubscriptionState {
    private subscriptionConstruction: BaseSubscriptionConstruction;
    constructor(
        error: any,
        lastEventId: string,
        subscriptionConstructor: (error: any, lastEventId?: string) =>   BaseSubscriptionConstruction,
        listeners: ResumableSubscriptionStateListeners,
        onTransition: (newState: ResumableSubscriptionState) => void
    ){
        this.subscriptionConstruction = subscriptionConstructor(null, lastEventId);
        this.subscriptionConstruction.onComplete( (subscription) => {
            listeners.onSubscribed(subscription.getHeaders());
            onTransition(new OpenSubscriptionState(
                subscription,
                lastEventId,
                subscriptionConstructor,
                listeners,
                onTransition
            ));
        });
        this.subscriptionConstruction.onError( (error) => {
            onTransition(new FailedSubscriptionState(error, listeners));
        });
    }

    unsubscribe() {
        this.subscriptionConstruction.cancel();
    }
}

class FailedSubscriptionState implements ResumableSubscriptionState {
    constructor(
        error: any,
        listeners: ResumableSubscriptionStateListeners
    ){
        listeners.onError(error);
    }

    unsubscribe(){ throw new Error("Tried unsubscribing in failed subscription state"); }
    
}

class EndedResumableSubscriptionState implements ResumableSubscriptionState {
    constructor(
        error: any,
        listeners: ResumableSubscriptionStateListeners
    ){
        listeners.onEnd(error);
    }

    unsubscribe(){ throw new Error("Tried unsubscribing in ended subscription state"); }
    
}
