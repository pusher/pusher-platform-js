import { ElementsHeaders } from './network';
import {
  CompleteSubscriptionListeners,
  Subscription,
  SubscriptionConstructor,
  SubscriptionEvent,
  SubscriptionListeners,
} from './subscription';

// Just like the top-level SubscriptionListeners, but all mandatory and without the onSubscribe callback.
export interface SubscribeStrategyListeners {
  onEnd: (error: any) => void;
  onError: (error: any) => void;
  onEvent: (event: SubscriptionEvent) => void;
  onOpen: (headers: ElementsHeaders) => void;
  onRetrying: () => void;
}

export type SubscribeStrategy = (
  listeners: SubscribeStrategyListeners,
  headers: ElementsHeaders,
) => Subscription;

export let subscribeStrategyListenersFromSubscriptionListeners = (
  subListeners: CompleteSubscriptionListeners,
): SubscribeStrategyListeners => {
  return {
    onEnd: subListeners.onEnd,
    onError: subListeners.onError,
    onEvent: subListeners.onEvent,
    onOpen: subListeners.onOpen,
    onRetrying: subListeners.onRetrying,
  };
};
