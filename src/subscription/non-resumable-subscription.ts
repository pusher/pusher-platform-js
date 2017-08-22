import { Logger } from '../logger';
import { TokenProvider } from '../token-provider';
import { RetryStrategy } from '../retry-strategy/retry-strategy';
import { ErrorResponse, Headers } from '../base-client';
import { BaseSubscription, BaseSubscriptionConstruction, SubscriptionEvent } from './base-subscription';

export interface NonResumableSubscribeOptions {
    headers: Headers;
    path: string;
    listeners: NonResumableSubscriptionStateListeners;
    retryStrategy: RetryStrategy;
    tokenProvider: TokenProvider;
    logger: Logger;
}   

export interface NonResumableSubscriptionState {
    unsubscribe(): void;    
}

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
            this.onTransition.bind(this)
        );
    }

    onTransition(newState: NonResumableSubscriptionState){
        this.state = newState;
    }

    unsubscribe(){
        this.state.unsubscribe();
    }
}

class SubscribingNonResumableSubscriptionState implements NonResumableSubscriptionState {
    
    private subscriptionConstruction: BaseSubscriptionConstruction;

    constructor(
        baseSubscriptionConstructor: (error: any) => BaseSubscriptionConstruction,
        listeners: NonResumableSubscriptionStateListeners,
        onTransition: (newState: NonResumableSubscriptionState) => void
    ){

        this.subscriptionConstruction = baseSubscriptionConstructor(null);
        this.subscriptionConstruction.onComplete( subscription => {
            listeners.onSubscribed(subscription.getHeaders());
            onTransition( new OpenNonResumableSubscriptionState(
                subscription,
                baseSubscriptionConstructor,
                listeners,
                onTransition
            ));        
        });
        this.subscriptionConstruction.onError( error => {
            onTransition(new FailedSubscriptionState(error, listeners));
        });
    }

    unsubscribe() {
        this.subscriptionConstruction.cancel();
    }
}

class OpenNonResumableSubscriptionState implements NonResumableSubscriptionState {
    constructor(
        private subscription: BaseSubscription,
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
    unsubscribe(){
        this.subscription.unsubscribe();
    }
}

class RetryingNonResumableSubscriptionState implements NonResumableSubscriptionState {

    private subscriptionConstruction: BaseSubscriptionConstruction;

    constructor(
        error: any,
        baseSubscriptionConstructor: (error: any) => BaseSubscriptionConstruction,
        listeners: NonResumableSubscriptionStateListeners,
        onTransition: (newState: NonResumableSubscriptionState) => void
    ){
        this.subscriptionConstruction = baseSubscriptionConstructor(null);

        this.subscriptionConstruction.onComplete( (subscription) => {
            listeners.onSubscribed(subscription.getHeaders());
            onTransition( new OpenNonResumableSubscriptionState(
                subscription,
                baseSubscriptionConstructor,
                listeners,
                onTransition
            ));   
        });

        this.subscriptionConstruction.onError( error => {
            onTransition(new FailedSubscriptionState(error, listeners));            
        });
    }
    unsubscribe() {
        this.subscriptionConstruction.cancel();
    }
}

class FailedSubscriptionState implements NonResumableSubscriptionState {
    constructor(
        error: any,
        listeners: NonResumableSubscriptionStateListeners
    ){
        listeners.onError(error);
    }
    unsubscribe(){ throw new Error("Tried unsubscribing in failed subscription state"); }
}

class EndedSubscriptionState implements NonResumableSubscriptionState {
    constructor(
        error: any,
        listeners: NonResumableSubscriptionStateListeners
    ){
        listeners.onEnd(error);
    }

    unsubscribe(){ throw new Error("Tried unsubscribing in ended subscription state"); }
}
