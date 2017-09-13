import { RetryStrategyOptions, createRetryStrategyOptionsOrDefault, RetryResolution, RetryStrategyResult, Retry } from './retry-strategy';
import { Subscription, SubscriptionEvent, SubscriptionState } from './subscription';
import { Logger } from './logger';
import { ElementsHeaders, ErrorResponse } from './network';
import { SubscribeStrategy, SubscribeStrategyListeners } from './subscribe-strategy';

export let createRetryingStrategy: (retryingOptions: RetryStrategyOptions, nextSubscribeStrategy: SubscribeStrategy, logger: Logger) => SubscribeStrategy = (retryOptions, nextSubscribeStrategy, logger): SubscribeStrategy => {
    
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
            listeners: SubscribeStrategyListeners,
            headers 
        ){
            
            class OpeningSubscriptionState implements SubscriptionState {
                private underlyingSubscription: Subscription;
                
                constructor(onTransition: (SubscriptionState) => void){
                    logger.verbose(`RetryingSubscription: transitioning to OpeningSubscriptionState`);
                    
                    this.underlyingSubscription = nextSubscribeStrategy(
                        {
                        onOpen: (headers) => onTransition(new OpenSubscriptionState(headers, this.underlyingSubscription, onTransition)),
                        onRetrying: listeners.onRetrying,
                        onError: error => onTransition(new RetryingSubscriptionState(error, onTransition)),    
                        onEvent: listeners.onEvent,
                        onEnd: error => onTransition(new EndedSubscriptionState(error))
                        },
                        headers
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
                        
                        listeners.onRetrying();

                        let resolveError: (error: any) => RetryStrategyResult = error => {
                            if(error instanceof ErrorResponse){
                                error.headers["Request-Method"] = "SUBSCRIBE";
                            }
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

                        let underlyingSubscription = nextSubscribeStrategy(
                            {
                                onOpen: headers => onTransition(new OpenSubscriptionState(headers, underlyingSubscription, onTransition)),
                                onRetrying: listeners.onRetrying,
                                onError: error => executeSubscriptionOnce(error),
                                onEvent: listeners.onEvent,
                                onEnd: error => onTransition(new EndedSubscriptionState(error))
                            },
                            headers
                        )
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
                    listeners.onOpen(headers);
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
                    listeners.onEnd(error);
                }
                unsubscribe() {
                    throw new Error("Subscription has already ended");
                  }
            }

            class FailedSubscriptionState implements SubscriptionState {
                constructor(error: any){
                    logger.verbose(`RetryingSubscription: transitioning to FailedSubscriptionState`, error);
                    listeners.onError(error);
                }
                unsubscribe() {
                    throw new Error("Subscription has already ended");
                  }
            }
            
            this.state = new OpeningSubscriptionState(this.onTransition);
        }
    }
    
    return (listeners, headers) => new RetryingSubscription(listeners, headers);
}