import { createRetryStrategyOptionsOrDefault, Subscription, SubscriptionState, SubscribeStrategy, RetryStrategyOptions, SubscriptionStateTransition } from './rejig';
import { RetryResolution } from '../retry-strategy/exponential-backoff-retry-strategy';
import { RetryStrategyResult, Retry } from '../retry-strategy/retry-strategy';
import { SubscriptionEvent } from '../subscription/base-subscription';

export let createResumingStrategy: (retryingOptions: RetryStrategyOptions, initialEventId: string, nextSubscribeStrategy: SubscribeStrategy) => SubscribeStrategy = 

(retryOptions, initialEventId, nextSubscribeStrategy) => {

    retryOptions = createRetryStrategyOptionsOrDefault(retryOptions);
    let retryResolution = new RetryResolution(retryOptions);

    class ResumingSubscription implements Subscription{

        private state: SubscriptionState;

        onTransition(newState: SubscriptionState){
            this.state = newState;
        }
        
        unsubscribe(){
            this.state.unsubscribe();
        }

        constructor(
            onOpen, 
            onError, 
            onEvent, 
            headers, 
            constructor
        ){
            class OpeningSubscriptionState implements SubscriptionState {
                private underlyingSubscription: Subscription;

                constructor(private onTransition: (newState) => void){
                    let lastEventId = initialEventId;

                    if(lastEventId){
                        headers["Last-Event-Id"] = initialEventId;
                    }
                    
                    this.underlyingSubscription = nextSubscribeStrategy(
                        headers => {
                            //TODO: callback onOpen???
                            onTransition(new OpenSubscriptionState(this.underlyingSubscription, onTransition));
                        },
                        error => {
                            onTransition(new ResumingSubscriptionState(error, lastEventId, onTransition));
                        },
                        event => {
                            let lastEventId = event.eventId;
                        },
                        headers,
                        constructor
                    )
                }
                unsubscribe() {
                    this.underlyingSubscription.unsubscribe();
                    this.onTransition(new EndedSubscriptionState());
                }
            }

            class OpenSubscriptionState implements SubscriptionState {
                constructor(private subscription: Subscription, private onTransition: (state: SubscriptionState) => void){}

                unsubscribe() {
                    this.subscription.unsubscribe();
                    this.onTransition(new EndedSubscriptionState());
                  }
            }

            class ResumingSubscriptionState implements SubscriptionState {

                private timeout: number;

                constructor(error: any, lastEventId: string, private onTransition: (newState: SubscriptionState) => 
                void){

                    let executeSubscriptionOnce = (lastEventId: string) => {
                        let resolveError: (error: any) => RetryStrategyResult =(error) => {
                            return retryResolution.attemptRetry(error);
                        }
    
                        let errorResolution = resolveError(error);
                        if(errorResolution instanceof Retry){
                            this.timeout = window.setTimeout(() => {executeNextSubscribeStrategy(lastEventId)}, errorResolution.waitTimeMillis);
                        }
                        else{
                            onTransition(new FailedSubscriptionState(error));
                        }
                    }
                
                    let executeNextSubscribeStrategy = (lastEventId: string) => {
                        if(lastEventId){
                            headers["Last-Event-Id"] = lastEventId;
                        }

                        let underlyingSubscription = nextSubscribeStrategy(
                            headers => {
                                onTransition(new OpenSubscriptionState(underlyingSubscription, onTransition));
                            },
                            error => {
                                executeSubscriptionOnce(lastEventId);
                            },
                            event => {
                                lastEventId = event.eventId;
                                onEvent(event);
                            },
                            headers,
                            constructor
                        )
                    }
                }

                unsubscribe() {
                    window.clearTimeout(this.timeout);
                    this.onTransition(new EndedSubscriptionState());
                  }
            }

            class EndedSubscriptionState implements SubscriptionState{
                unsubscribe() {
                    throw new Error("Subscription has already ended");
                  }
            }

            class FailedSubscriptionState implements SubscriptionState {
                constructor(error: any){
                    onError(error);
                }
                unsubscribe() {
                    throw new Error("Subscription has already ended");
                  }
            }

            //Here we init the state transition shenaningans
            this.state = new OpeningSubscriptionState(this.onTransition);
    }
}

    let strategy: SubscribeStrategy = (onOpen, onError, onEvent, headers, constructor) => {
        return new ResumingSubscription(onOpen, onError, onEvent, headers, constructor);
    }
   
    return strategy;        
};