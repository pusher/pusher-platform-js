import {
    createRetryStrategyOptionsOrDefault,
    RetryStrategyOptions,
    SubscribeStrategy,
    Subscription,
    SubscriptionState,
} from './rejig';
import { RetryResolution } from '../retry-strategy/exponential-backoff-retry-strategy';
import { RetryStrategyResult, Retry } from '../retry-strategy/retry-strategy';
export let createRetryingStrategy: (retryingOptions: RetryStrategyOptions, nextSubscribeStrategy: SubscribeStrategy) => SubscribeStrategy = (retryOptions, nextSubscribeStrategy) => {
    
    retryOptions = createRetryStrategyOptionsOrDefault(retryOptions);
    let retryResolution = new RetryResolution(retryOptions);
    
    class RetryingSubscription implements Subscription {
        private state: SubscriptionState;
        
        onTransition(newState: SubscriptionState){
            this.state = newState;
        }
        
        unsubscribe() {
            this.state.unsubscribe();
        }
        
        constructor(
            onOpen, 
            onError, 
            onEvent, 
            headers, 
            subscriptionConstructor
        ){
            
            class OpeningSubscriptionState implements SubscriptionState {
                private underlyingSubscription: Subscription;
                
                constructor(onTransition: (SubscriptionState) => void){
                    
                    this.underlyingSubscription = nextSubscribeStrategy(
                        headers => {
                            onOpen(headers);
                            onTransition(new OpenSubscriptionState(this.underlyingSubscription, onTransition));
                        },
                        error => {
                            onTransition(new RetryingSubscriptionState(error, onTransition));
                        },
                        event => onEvent,
                        headers,
                        subscriptionConstructor
                    );
                    
                }
                
                unsubscribe() {
                    this.underlyingSubscription.unsubscribe();
                    throw new Error("Method not implemented.");
                }
            }
            
            class RetryingSubscriptionState implements SubscriptionState {
                private timeout: number;
                
                constructor(error: any, private onTransition: (SubscriptionState) => void) {
                    
                    let executeSubscriptionOnce = () => {
                        
                        let resolveError: (error: any) => RetryStrategyResult = error => {
                            return retryResolution.attemptRetry(error);
                        };
                        
                        let errorResolution = resolveError(error);
                        if (errorResolution instanceof Retry) {
                            this.timeout = window.setTimeout(() => {
                                executeNextSubscribeStrategy();
                            }, errorResolution.waitTimeMillis);
                        } else {
                            onTransition(new FailedSubscriptionState(error));
                        }
                    };
                    
                    let executeNextSubscribeStrategy = () => {
                        let underlyingSubscription = nextSubscribeStrategy(headers => {
                            onTransition(new OpenSubscriptionState(underlyingSubscription, onTransition));
                        }, error => {
                            executeSubscriptionOnce();
                        }, 
                        onEvent, 
                        headers, 
                        subscriptionConstructor);
                    };
                }
                
                unsubscribe() {
                    window.clearTimeout(this.timeout);
                    this.onTransition(new EndedSubscriptionState());
                }
            }
            
            class OpenSubscriptionState implements SubscriptionState {
                constructor(private underlyingSubscription: Subscription, private onTransition: (newState: SubscriptionState) => void){
                    
                }
                unsubscribe() {
                    this.underlyingSubscription.unsubscribe();
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
            
            this.state = new OpeningSubscriptionState(this.onTransition);
        }
    }
    
    
    return (onOpen, onError, onEvent, headers, constructor) => new RetryingSubscription(onOpen, onError, onEvent, headers, constructor);
}