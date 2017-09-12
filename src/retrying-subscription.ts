import { RetryStrategyOptions, createRetryStrategyOptionsOrDefault, RetryResolution, RetryStrategyResult, Retry } from './retry-strategy';
import { SubscribeStrategy, Subscription, SubscriptionEvent, SubscriptionState } from './subscription';
import { Logger } from './logger';
import { ElementsHeaders } from './network';

export let createRetryingStrategy: (retryingOptions: RetryStrategyOptions, nextSubscribeStrategy: SubscribeStrategy, logger: Logger) => SubscribeStrategy = (retryOptions, nextSubscribeStrategy, logger) => {
    
    retryOptions = createRetryStrategyOptionsOrDefault(retryOptions);
    let retryResolution = new RetryResolution(retryOptions, logger);
    
    class RetryingSubscription implements Subscription {
        private state: SubscriptionState;
        
        private onTransition = (newState: SubscriptionState) => {
            this.state = newState;    
        }
        
        public unsubscribe = () => {
            this.state.unsubscribe();   
        }
        
        constructor(
            onOpen: (headers: ElementsHeaders) => void, 
            onRetrying: () => void,
            onError: (error: any) => void, 
            onEvent: (event: SubscriptionEvent) => void, 
            onEnd: (error: any) => void,
            headers, 
            subscriptionConstructor
        ){
            
            class OpeningSubscriptionState implements SubscriptionState {
                private underlyingSubscription: Subscription;
                
                constructor(onTransition: (SubscriptionState) => void){
                    logger.verbose(`RetryingSubscription: transitioning to OpeningSubscriptionState`);
                    
                    this.underlyingSubscription = nextSubscribeStrategy(
                        headers => {
                            onTransition(new OpenSubscriptionState(headers, this.underlyingSubscription, onTransition));
                        },
                        onRetrying,
                        error => {
                            onTransition(new RetryingSubscriptionState(error, onTransition));
                        },
                        event => onEvent,
                        error => {
                            onTransition(new EndedSubscriptionState(error));
                        },
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
                    logger.verbose(`RetryingSubscription: transitioning to RetryingSubscriptionState`);

                    let executeSubscriptionOnce = (error: any) => {
                        
                        onRetrying();
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
                        logger.verbose(`RetryingSubscription: trying to re-establish the subscription`);

                        let underlyingSubscription = nextSubscribeStrategy(headers => {
                            onTransition(new OpenSubscriptionState(headers, underlyingSubscription, onTransition));
                        },
                        onRetrying,
                        error => {
                            executeSubscriptionOnce(error);
                        }, 
                        onEvent, 
                        error => {
                            onTransition(new EndedSubscriptionState(error));
                        },
                        headers, 
                        subscriptionConstructor);
                    };
                    executeSubscriptionOnce(error);
                }
                
                unsubscribe() {
                    window.clearTimeout(this.timeout);
                    this.onTransition(new EndedSubscriptionState());
                }
            }
            
            class OpenSubscriptionState implements SubscriptionState {
                constructor(headers: ElementsHeaders, private underlyingSubscription: Subscription, private onTransition: (newState: SubscriptionState) => void){
                    onOpen(headers);
                    logger.verbose(`RetryingSubscription: transitioning to OpenSubscriptionState`);
                }
                unsubscribe() {
                    this.underlyingSubscription.unsubscribe();
                    this.onTransition(new EndedSubscriptionState());
                }
            }
            
            class EndedSubscriptionState implements SubscriptionState{
                constructor(error?: any){
                    logger.verbose(`RetryingSubscription: transitioning to EndedSubscriptionState`);
                    onEnd(error);
                }
                unsubscribe() {
                    throw new Error("Subscription has already ended");
                  }
            }

            class FailedSubscriptionState implements SubscriptionState {
                constructor(error: any){
                    logger.verbose(`RetryingSubscription: transitioning to FailedSubscriptionState`, error);
                    onError(error);
                }
                unsubscribe() {
                    throw new Error("Subscription has already ended");
                  }
            }
            
            this.state = new OpeningSubscriptionState(this.onTransition);
        }
    }
    
    
    return (onOpen, onRetrying, onError, onEvent, onEnd, headers, constructor) => new RetryingSubscription(onOpen, onRetrying, onError, onEvent, onEnd, headers, constructor);
}