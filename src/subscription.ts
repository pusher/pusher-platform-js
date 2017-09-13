import { BaseSubscription } from './base-subscription';
import { ElementsHeaders } from './network';

export interface Subscription {
    unsubscribe();
}

export interface SubscriptionListeners {
    onOpen?: (headers: ElementsHeaders) => void;
    onSubscribe?: () => void;
    onRetrying?:() => void;
    onResuming?:() => void;
    onEvent?: (event: SubscriptionEvent) => void;
    onError?: (error: any) => void;
    onEnd?: (error: any) => void;
}

export interface SubscriptionState {
    unsubscribe();
}

export interface SubscriptionStateTransition {
    onTransition(newState: SubscriptionState): void;
}

export interface SubscriptionEvent {
    eventId: string;
    headers: ElementsHeaders;
    body: any;
}

export type SubscriptionConstructor = (
    onOpen: (headers:ElementsHeaders) => void , 
    onError: (error: any) => void, 
    onEvent: (event: SubscriptionEvent) => void,
    onEnd: (error: any) => void,
    headers: ElementsHeaders, 
) => BaseSubscription;

//Move this util somewhere else?
let noop = (arg?) => {};
export let replaceMissingListenersWithNoOps: (listeners: SubscriptionListeners) => SubscriptionListeners = (listeners) => {
    
    let onOpen = listeners.onOpen || noop ;
    let onSubscribe = listeners.onSubscribe || noop;
    let onEvent = listeners.onEvent || noop;
    let onError = listeners.onError || noop;
    let onEnd = listeners.onEnd || noop; 
    let onRetrying = listeners.onRetrying || noop;
    let onResuming = listeners.onResuming || noop;

    return {
        onOpen: onOpen,
        onSubscribe: onSubscribe,
        onRetrying: onRetrying,
        onResuming: onResuming,
        onEvent: onEvent,
        onError: onError,
        onEnd: onEnd
    }
}

