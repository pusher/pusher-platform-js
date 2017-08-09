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

// function constructorToPromise(c: Constructor<R, E>): Promise<R, E> {
//     return new Promise((resolve, fail) => {
//         let foo = requestConstructor(options)
//         foo.onComplete(resolve)
//         foo.onError(fail)
//     })
// }


// export interface ResumableSubscribeOptions extends SubscribeOptions {
//     lastEventId?: string;
//     retryStrategy?:  RetryStrategy;
//     tokenProvider?: TokenProvider;
// }

// // type SubscriptionConstructor = (lastError: any, lastEventID: string) => Promise<BaseSubscription>;

// type SubscriptionConstructor = (lastError: any, lastEventID: string) => {
//     // onComplete(){

//     // };
//     onError();
//     execute();
// }

class SubscriptionConstructor {
    constructor(
        error: any,
        lastEventId: string
    ){
        //TODO - init subscription
    }
    onComplete(callback: (subscription: BaseSubscription) => void){
    }

    onError(errorCallback: (error: any) => void){
    }
}

interface ResumableSubscriptionStateListeners {
    onSubscribed: (headers: Headers) => void;
    onOpen: () => void;
    onResuming: () => void;
    onEvent: (event: SubscriptionEvent) => void;
    onEnd: (error?: ErrorResponse) => void;
    onError: (error: any) => void;
}

interface ResumableSubscriptionState {
    // onTransition(newState: ResumableSubscriptionState): ResumableSubscriptionState
}




class SubscribingResumableSubscriptionState implements ResumableSubscriptionState {    
    constructor(
            initialEventID: string,
            subscriptionConstructor: SubscriptionConstructor,
            listeners: ResumableSubscriptionStateListeners) {

                subscriptionConstructor = new SubscriptionConstructor(null, initialEventID);
                subscriptionConstructor.onComplete( (subscription) => {
                    listeners.onSubscribed(subscription.headers); //TODO: pass sub headers
                    this.onTransition(new OpenSubscriptionState(
                        subscription as any, initialEventID, subscriptionConstructor, listeners //using any for now to avoid compilation errors.
                    ));
                });
                // subscriptionConstructor(null, initialEventID)
    }

    onTransition(state: ResumableSubscriptionState) {
        //TODO:
        return null;
    }
}

interface EventTransmittingSubscription {
    onEvent( callback: (event: SubscriptionEvent) => void): void
    onEnd( listener: (error) => void )
    onError( listener: (error) => void )
}

class OpenSubscriptionState implements ResumableSubscriptionState {
    constructor(
            subscription: EventTransmittingSubscription, 
            lastEventID: string,
            subscriptionConstructor: SubscriptionConstructor,
            listeners: ResumableSubscriptionStateListeners) {

        subscription.onEvent((event: SubscriptionEvent) => {
            lastEventID = event.eventId
            listeners.onEvent(event)
        });

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
    onTransition(state: ResumableSubscriptionState): ResumableSubscriptionState{

        return null;
    }
}

class ResumingResumableSubscriptionState implements ResumableSubscriptionState {
    constructor(
            error: any,
            lastEventID: string,
            subscriptionConstructor: SubscriptionConstructor,
            listeners: ResumableSubscriptionStateListeners) {

                subscriptionConstructor = new SubscriptionConstructor(error, lastEventID); //this needs to be made better.
                subscriptionConstructor.onComplete( (subscription) => {
                    this.onTransition(new OpenSubscriptionState(
                        subscription as any, initialEventID, subscriptionConstructor, listeners //using any for now to avoid compilation errors.
                    ));
                });
                
                subscriptionConstructor.onError( (error) => {
                    this.onTransition(new FailedSubscriptionState(error, listeners))
                 });


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
        private options: ResumableSubscribeOptions,
        listeners: ResumableSubscriptionStateListeners
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

