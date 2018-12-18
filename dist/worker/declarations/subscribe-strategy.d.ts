import { ElementsHeaders } from './network';
import { CompleteSubscriptionListeners, Subscription, SubscriptionEvent } from './subscription';
export interface SubscribeStrategyListeners {
    onEnd: (error: any) => void;
    onError: (error: any) => void;
    onEvent: (event: SubscriptionEvent) => void;
    onOpen: (headers: ElementsHeaders) => void;
    onRetrying: () => void;
}
export declare type SubscribeStrategy = (listeners: SubscribeStrategyListeners, headers: ElementsHeaders) => Subscription;
export declare let subscribeStrategyListenersFromSubscriptionListeners: (subListeners: CompleteSubscriptionListeners) => SubscribeStrategyListeners;
