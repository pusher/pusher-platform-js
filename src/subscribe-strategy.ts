import { ElementsHeaders } from './network';
import { SubscriptionEvent, SubscriptionConstructor, Subscription } from './subscription';

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