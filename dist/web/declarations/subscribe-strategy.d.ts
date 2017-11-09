import { ElementsHeaders } from './network';
import { Subscription, SubscriptionEvent, SubscriptionListeners } from './subscription';
export interface SubscribeStrategyListeners {
    onOpen: (headers: ElementsHeaders) => void;
    onRetrying: () => void;
    onError: (error: any) => void;
    onEvent: (event: SubscriptionEvent) => void;
    onEnd: (error: any) => void;
}
export declare type SubscribeStrategy = (listeners: SubscribeStrategyListeners, headers: ElementsHeaders) => Subscription;
export declare let subscribeStrategyListenersFromSubscriptionListeners: (subListeners: SubscriptionListeners) => SubscribeStrategyListeners;
