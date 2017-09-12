import {
    createRetryStrategyOptionsOrDefault,
    Retry,
    RetryResolution,
    RetryStrategyOptions,
    RetryStrategyResult,
} from './retry-strategy';
import {
    SubscribeStrategy,
    Subscription,
    SubscriptionConstructor,
    SubscriptionEvent,
    SubscriptionState,
} from './subscription';
import { Logger } from './logger';
import { ElementsHeaders, ErrorResponse } from './network';

export let createResumingStrategy: (retryingOptions: RetryStrategyOptions, initialEventId: string, nextSubscribeStrategy: SubscribeStrategy, logger: Logger) => SubscribeStrategy = 

(retryOptions, initialEventId, nextSubscribeStrategy, logger) => {

    retryOptions = createRetryStrategyOptionsOrDefault(retryOptions);
    let retryResolution = new RetryResolution(retryOptions, logger);

    class ResumingSubscription implements Subscription{

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
            headers: ElementsHeaders, 
            subscriptionConstructor: SubscriptionConstructor
        ){
            class OpeningSubscriptionState implements SubscriptionState {
                private underlyingSubscription: Subscription;

                constructor(private onTransition: (newState) => void){
                    let lastEventId = initialEventId;
                    logger.verbose(`ResumingSubscription: transitioning to OpeningSubscriptionState`);

                    if(lastEventId){
                        headers["Last-Event-Id"] = lastEventId;
                        logger.verbose(`ResumingSubscription: initialEventId is ${lastEventId}`);      
                    }
                    
                    this.underlyingSubscription = nextSubscribeStrategy(
                        headers => {
                            onTransition(new OpenSubscriptionState(headers, this.underlyingSubscription, onTransition));
                        },
                        onRetrying,
                        error => {
                            onTransition(new ResumingSubscriptionState(error, lastEventId, onTransition));
                        },
                        event => {
                            lastEventId = event.eventId;
                            onEvent(event);
                        },
                        error => {
                            onTransition(new EndedSubscriptionState(error));
                        },
                        headers,
                        subscriptionConstructor
                    )
                }
                unsubscribe() {
                    this.onTransition(new EndingSubscriptionState());                    
                    this.underlyingSubscription.unsubscribe();
                }
            }

            class OpenSubscriptionState implements SubscriptionState {
                constructor(headers: ElementsHeaders, private underlyingSubscription: Subscription, private onTransition: (state: SubscriptionState) => void){
                    logger.verbose(`ResumingSubscription: transitioning to OpenSubscriptionState`)
                    onOpen(headers);
                }

                unsubscribe() {
                    this.onTransition(new EndingSubscriptionState());
                    this.underlyingSubscription.unsubscribe();
                }
            }

            class ResumingSubscriptionState implements SubscriptionState {

                private timeout: number;
                private underlyingSubscription: Subscription;
                
                constructor(error: any, lastEventId: string, private onTransition: (newState: SubscriptionState) => 
                void){
                    logger.verbose(`ResumingSubscription: transitioning to ResumingSubscriptionState`)

                    let executeSubscriptionOnce = (error: any, lastEventId: string) => {
                        onRetrying();                        
                        let resolveError: (error: any) => RetryStrategyResult = (error) => {
                            if(error instanceof ErrorResponse){
                                error.headers    ["Request-Method"] = "SUBSCRIBE";
                            }
                            return retryResolution.attemptRetry(error);
                        }
    
                        let errorResolution = resolveError(error);
                        if(errorResolution instanceof Retry){
                            this.timeout = window.setTimeout(() => { executeNextSubscribeStrategy(lastEventId) }, errorResolution.waitTimeMillis);
                        }
                        else{
                            onTransition(new FailedSubscriptionState(error));
                        }
                    }
                
                    let executeNextSubscribeStrategy = (lastEventId: string) => {

                        logger.verbose(`ResumingSubscription: trying to re-establish the subscription`);                      
                        if(lastEventId){
                            logger.verbose(`ResumingSubscription: lastEventId: ${lastEventId}`);
                            headers["Last-Event-Id"] = lastEventId;
                        }

                        this.underlyingSubscription = nextSubscribeStrategy(
                            headers => {
                                onTransition(new OpenSubscriptionState(headers, this.underlyingSubscription, onTransition));
                            },
                            onRetrying,
                            error => {
                                executeSubscriptionOnce(error, lastEventId);
                            },
                            event => {
                                lastEventId = event.eventId;
                                onEvent(event);
                            },
                            error => {
                                onTransition(new EndedSubscriptionState(error));
                            },
                            headers,
                            subscriptionConstructor
                        )
                    }
                    executeSubscriptionOnce(error, lastEventId);
                }

                unsubscribe() {
                    this.onTransition(new EndingSubscriptionState());
                    window.clearTimeout(this.timeout);
                    this.underlyingSubscription.unsubscribe(); 
                  }
            }

            class EndingSubscriptionState implements SubscriptionState {
                constructor(error?: any){
                    logger.verbose(`ResumingSubscription: transitioning to EndingSubscriptionState`);
                }
                unsubscribe() {
                    throw new Error("Subscription is already ending");
                }
            }

            class EndedSubscriptionState implements SubscriptionState{
                constructor(error?: any){
                    logger.verbose(`ResumingSubscription: transitioning to EndedSubscriptionState`);
                    onEnd(error);
                }
                unsubscribe() {
                    throw new Error("Subscription has already ended");
                }
            }

            class FailedSubscriptionState implements SubscriptionState {
                constructor(error: any){
                    logger.verbose(`ResumingSubscription: transitioning to FailedSubscriptionState`, error);                                  
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

    //All the magic in the world.
    return (onOpen, onRetrying, onError, onEvent, onEnd, headers, constructor) => 
        new ResumingSubscription(onOpen, onRetrying, onError, onEvent, onEnd, headers, constructor);
            
};