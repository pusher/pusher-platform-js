import { ElementsHeaders } from './network';
export interface Subscription {
    unsubscribe(): void;
}
export interface SubscriptionListeners {
    onOpen?: (headers: ElementsHeaders) => void;
    onSubscribe?: () => void;
    onRetrying?: () => void;
    onEvent?: (event: SubscriptionEvent) => void;
    onError?: (error: any) => void;
    onEnd?: (error: any) => void;
}
export interface CompleteSubscriptionListeners {
    onOpen: (headers: ElementsHeaders) => void;
    onSubscribe: () => void;
    onRetrying: () => void;
    onEvent: (event: SubscriptionEvent) => void;
    onError: (error: any) => void;
    onEnd: (error: any) => void;
}
export interface SubscriptionState {
    unsubscribe(): void;
}
export interface SubscriptionEvent {
    eventId: string;
    headers: ElementsHeaders;
    body: any;
}
export interface SubscriptionTransport {
    subscribe(path: string, listeners: SubscriptionListeners, headers: ElementsHeaders): Subscription;
}
export declare type SubscriptionConstructor = (onOpen: (headers: ElementsHeaders) => void, onError: (error: any) => void, onEvent: (event: SubscriptionEvent) => void, onEnd: (error: any) => void, headers: ElementsHeaders) => Subscription;
export declare let replaceMissingListenersWithNoOps: (listeners: SubscriptionListeners) => CompleteSubscriptionListeners;
