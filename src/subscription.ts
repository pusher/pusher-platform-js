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

export let replaceMissingListenersWithNoOps: (
  listeners: SubscriptionListeners,
) => CompleteSubscriptionListeners = listeners => {
  /* tslint:disable:no-empty */
  const onEndNoOp = (error: any) => {};
  const onEnd = listeners.onEnd || onEndNoOp;

  const onErrorNoOp = (error: any) => {};
  const onError = listeners.onError || onErrorNoOp;

  const onEventNoOp = (event: SubscriptionEvent) => {};
  const onEvent = listeners.onEvent || onEventNoOp;

  const onOpenNoOp = (headers: ElementsHeaders) => {};
  const onOpen = listeners.onOpen || onOpenNoOp;

  const onRetryingNoOp = () => {};
  const onRetrying = listeners.onRetrying || onRetryingNoOp;

  const onSubscribeNoOp = () => {};
  const onSubscribe = listeners.onSubscribe || onSubscribeNoOp;
  /* tslint:enable:no-empty */

  return {
    onEnd,
    onError,
    onEvent,
    onOpen,
    onRetrying,
    onSubscribe,
  };
};
