import { ElementsHeaders } from './network';
import { SubscriptionEvent, SubscriptionConstructor, Subscription } from './subscription';
import { SubscriptionListeners } from '../declarations/subscription';

//just like the top-level SubscriptionListeners, but all mandatory and without the onSubscribe callback.
export interface SubscribeStrategyListeners {
    onOpen: (headers: ElementsHeaders) => void,
    onRetrying: () => void,
    onError: (error: any) => void,
    onEvent: (event: SubscriptionEvent) => void,
    onEnd: (error: any) => void
}

export type SubscribeStrategy = (
    listeners: SubscribeStrategyListeners,
    headers: ElementsHeaders
) => Subscription;

export let subscribeStrategyListenersFromSubscriptionListeners = (subListeners: SubscriptionListeners): SubscribeStrategyListeners => {

    return {
        onOpen: subListeners.onOpen,
        onRetrying: subListeners.onRetrying,
        onError: subListeners.onError,
        onEvent: subListeners.onEvent,
        onEnd: subListeners.onEnd
    }
}