import { ElementsHeaders } from './network';

export interface Subscription {
  unsubscribe();
}

export interface SubscriptionListeners {
  onOpen?: (headers: ElementsHeaders) => void;
  onSubscribe?: () => void;
  onRetrying?: () => void;
  onEvent?: (event: SubscriptionEvent) => void;
  onError?: (error: any) => void;
  onEnd?: (error: any) => void;
}

export interface SubscriptionState {
  unsubscribe();
  unsubscribe();
}

export interface SubscriptionEvent {
  eventId: string;
  headers: ElementsHeaders;
  body: any;
}

export interface SubscriptionTransport {
  subscribe(
    path: string,
    listeners: SubscriptionListeners,
    headers: ElementsHeaders,
  ): Subscription;
}

export type SubscriptionConstructor = (
  onOpen: (headers: ElementsHeaders) => void,
  onError: (error: any) => void,
  onEvent: (event: SubscriptionEvent) => void,
  onEnd: (error: any) => void,
  headers: ElementsHeaders,
) => Subscription;

// Move this util somewhere else?
/* tslint:disable-next-line:no-empty */
const noop = (arg?) => {};

export let replaceMissingListenersWithNoOps: (
  listeners: SubscriptionListeners,
) => SubscriptionListeners = listeners => {
  const onOpen = listeners.onOpen || noop;
  const onSubscribe = listeners.onSubscribe || noop;
  const onEvent = listeners.onEvent || noop;
  const onError = listeners.onError || noop;
  const onEnd = listeners.onEnd || noop;
  const onRetrying = listeners.onRetrying || noop;

  return {
    onEnd,
    onError,
    onEvent,
    onOpen,
    onRetrying,
    onSubscribe,
  };
};
