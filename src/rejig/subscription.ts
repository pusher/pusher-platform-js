import { BaseSubscription } from '../subscription/base-subscription';
export interface Subscription {
    unsubscribe();
}

export interface SubscriptionStateTransition {
    onTransition(newState: SubscriptionState): void;
}

export interface SubscriptionState {
    unsubscribe();
}

export interface SubscriptionEvent {
    eventId: string;
    headers: Headers;
    body: any;
}

export type SubscriptionConstructor = (
    headers: Headers, 
    onOpen: (headers:Headers) => void , 
    onError: (error: any) => void, 
    onEvent: (event: SubscriptionEvent) => void
) => BaseSubscription;

export type SubscribeStrategy = (
    onOpen: (headers:Headers) => void, 
    onError: (error: any) => void, 
    onEvent: (event: SubscriptionEvent) => void,
    headers: Headers,
    subscriptionConstructor: SubscriptionConstructor
) => Subscription;