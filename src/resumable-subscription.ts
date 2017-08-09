import { NoOpTokenProvider, TokenProvider } from './token-provider';
import { ErrorResponse } from './base-client';
import {
    RetryStrategy,
    ExponentialBackoffRetryStrategy,
    Retry,
    DoNotRetry
} from './retry-strategy';
import { Logger } from './logger';
import {
    BaseSubscription,
    SubscribeOptions,
    SubscriptionEvent,
    replaceUnimplementedListenersWithNoOps
} from './base-subscription'


export interface OptionalSubscriptionListeners {
    onSubscribed?: (headers: Headers) => void;
    onOpen?: () => void;
    onResuming?: () => void;
    onEvent?: (event: SubscriptionEvent) => void;
    onEnd?: (error?: ErrorResponse) => void;
    onError?: (error: any) => void;
}

export interface SubscriptionListeners {
    onSubscribed: (headers: Headers) => void;
    onOpen: () => void;
    onResuming: () => void;
    onEvent: (event: SubscriptionEvent) => void;
    onEnd: (error?: ErrorResponse) => void;
    onError: (error: any) => void;
}

export interface ResumableSubscribeOptions extends SubscribeOptions {
    lastEventId?: string;
    retryStrategy?:  RetryStrategy;
    tokenProvider?: TokenProvider;
}

type subscriptionConstructor = (lastError: any, lastEventID: string) => Promise<Subscription>;

interface ResumableSubscriptionStateListeners {
    onSubscribed: (headers: Headers) => void;
    onOpen: () => void;
    onResuming: () => void;
    onEvent: (event: Event) => void;
    onEnd: (error?: ErrorResponse) => void;
    onError: (error: any) => void;
}

class SubscribingResumableSubscriptionState implements ResumableSubscriptionState {
    constructor(
            initialEventID: string,
            subscriptionConstructor: subscriptionConstructor,
            listeners: ResumableSubscriptionStateListeners) {
        foo = subscriptionConstructor(null, initialEventID)
        foo.onComplete((subscription) => {
            this.onSubscribed(subscription.headers)
            this.onTransition(
                new OpenSubscriptionState(
                    subscription, initialEventID, subscriptionConstructor, listeners
                )
            )
        })
        foo.onError((error) => {
            this.onTransition(new FailedSubscriptionState(error, listeners))
        })
    }
}

function constructorToPromise(c: Constructor<R, E>): Promise<R, E> {
    return new Promise((resolve, fail) => {
        foo = requestConstructor(options)
        foo.onComplete(resolve)
        foo.onError(fail)
    })
}

class OpenSubscriptionState implements ResumableSubscriptionState {
    constructor(
            subscription: Subscription,
            lastEventID: string,
            subscriptionConstructor: subscriptionConstructor,
            listeners: ResumableSubscriptionStateListeners) {
        subscription.onEvent = (event) => {
            lastEventID = event.ID
            listeners.onEvent(event)
        }
        subscription.onEnd = (error) => {
            this.onTransition(
                new EndedResumableSubscriptionState(error, listeners)
            )
        }
        subscription.onError = (error) => {
            listeners.onResuming()
            this.onTransition(
                new ResumingResumableSubscriptionState(
                    error, lastEventID, subscriptionConstructor, listeners
                )
            )
        }
        listeners.onOpen()
    }
}
class ResumingResumableSubscriptionState implements ResumableSubscriptionState {
    constructor(
            error: any,
            lastEventID: string,
            subscriptionConstructor: subscriptionConstructor,
            listeners: ResumableSubscriptionStateListeners) {
        subscriptionConstructor(error, lastEventID).then((subscription) => {
            this.onTransition(
                new OpenSubscriptionState(
                    subscription, lastEventID, subscriptionConstructor, listeners
                )
            )
        }).catch((error) => {
            this.onTransition(new FailedSubscriptionState(error, listeners))
        })
    }
}
class EndedResumableSubscriptionState implements ResumableSubscriptionState {
    constructor(error: any, listeners: ResumableSubscriptionStateListeners) {
        listeners.onEnd(error)
    }
}
class FailedResumableSubscriptionState implements ResumableSubscriptionState {
    constructor(error: any, listeners: ResumableSubscriptionStateListeners) {
        listeners.onError(error)
    }
}

export class ResumableSubscription {
    private state: ResumableSubscriptionState;
    private logger: Logger;

    constructor(
        private baseSubscriptionConstructor: (lastEventID: string) => Promise<BaseSubscription>,
        private options: ResumableSubscribeOptions
    ) {
        listeners = replaceUnimplementedListenersWithNoOps(options);
        subscriptionConstructor = (error: any, lastEventID: string) => Promise<BaseSubscription> {
            return options.retryStrategy.execute(error, () => Promise<BaseSubscription> {
                return baseSubscriptionConstructor(lastEventID)
            })
        }
        this.state = new SubscribingResumableSubscriptionState(
            options.lastEventID, subscriptionConstructor, listeners
        )
        this.logger = options.logger;
    }

    private tryNow(): void {
        let newXhr = this.xhrSource();

        if (this.lastEventIdReceived) {
            newXhr.setRequestHeader("Last-Event-Id", this.lastEventIdReceived);
        }

        this.options.tokenProvider.fetchToken()
        .then( token => {
            this.baseSubscription = new BaseSubscription(newXhr, {
                path: this.options.path,
                headers: this.options.headers,
                jwt: token,

                onOpen: () => {
                    this.options.onOpen();
                    this.retryStrategy.reset(); //We need to reset the counter once the connection has been re-established.
                },
                onEvent: (event: SubscriptionEvent) => {
                    this.options.onEvent(event);
                    this.lastEventIdReceived = event.eventId;
                },
                onEnd: this.options.onEnd,
                onError: (error: Error) => {
                    this.retryStrategy.checkIfRetryable(error)
                    .then(() => {
                        if (this.options.onRetry) {
                            this.options.onRetry();
                        } else {
                            this.tryNow();
                        }
                    })
                    .catch(error => {
                        this.options.onError(error);
                    })},
                    logger: this.logger
                });
                this.baseSubscription.open();
            })
            .catch(error => {
                this.options.onError(error);
            });
        }

        unsubscribe() {
            if(!this.baseSubscription){
                throw new Error("Subscription doesn't exist! Have you called open()?");
            }
            this.retryStrategy.cancel();
            this.baseSubscription.unsubscribe(); // We'll get onEnd and bubble this up
        }
    }

