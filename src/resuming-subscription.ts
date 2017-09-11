import {
    createRetryStrategyOptionsOrDefault,
    Retry,
    RetryResolution,
    RetryStrategyOptions,
    RetryStrategyResult,
} from './retry-strategy';
import { SubscribeStrategy, Subscription, SubscriptionState } from './subscription';
import { Logger } from './logger';

export let createResumingStrategy: (retryingOptions: RetryStrategyOptions, initialEventId: string, nextSubscribeStrategy: SubscribeStrategy, logger: Logger) => SubscribeStrategy = 

(retryOptions, initialEventId, nextSubscribeStrategy, logger) => {

    retryOptions = createRetryStrategyOptionsOrDefault(retryOptions);
    let retryResolution = new RetryResolution(retryOptions, logger);

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
            subscriptionConstructor
        ){
            class OpeningSubscriptionState implements SubscriptionState {
                private underlyingSubscription: Subscription;

                constructor(private onTransition: (newState) => void){
                    let lastEventId = initialEventId;
                    logger.info(`ResumingSubscription: transitioning to OpeningSubscriptionState`);

                    if(lastEventId){
                        headers["Last-Event-Id"] = lastEventId;
                        logger.info(`ResumingSubscription: initialEventId is ${lastEventId}`);                
                    }
                    
                    this.underlyingSubscription = nextSubscribeStrategy(
                        headers => {
                            onOpen(headers);
                            onTransition(new OpenSubscriptionState(this.underlyingSubscription, onTransition));
                        },
                        error => {
                            onTransition(new ResumingSubscriptionState(error, lastEventId, onTransition));
                        },
                        event => {
                            let lastEventId = event.eventId;
                        },
                        headers,
                        subscriptionConstructor
                    )
                }
                unsubscribe() {
                    this.underlyingSubscription.unsubscribe();
                    this.onTransition(new EndedSubscriptionState());
                }
            }

            class OpenSubscriptionState implements SubscriptionState {
                constructor(private subscription: Subscription, private onTransition: (state: SubscriptionState) => void){
                    logger.info(`ResumingSubscription: transitioning to OpenSubscriptionState`)
                }

                unsubscribe() {
                    this.subscription.unsubscribe();
                    this.onTransition(new EndedSubscriptionState());
                }
            }

            class ResumingSubscriptionState implements SubscriptionState {

                private timeout: number;

                constructor(error: any, lastEventId: string, private onTransition: (newState: SubscriptionState) => 
                void){
                    logger.info(`ResumingSubscription: transitioning to ResumingSubscriptionState`)
                    
                    let executeSubscriptionOnce = (error: any, lastEventId: string) => {
                        let resolveError: (error: any) => RetryStrategyResult = (error) => {
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

                        logger.info(`ResumingSubscription: trying to re-establish the subscription`);                      
                        if(lastEventId){
                            logger.info(`ResumingSubscription: lastEventId: ${lastEventId}`);
                            headers["Last-Event-Id"] = lastEventId;
                        }

                        let underlyingSubscription = nextSubscribeStrategy(
                            headers => {
                                onTransition(new OpenSubscriptionState(underlyingSubscription, onTransition));
                            },
                            error => {
                                executeSubscriptionOnce(error, lastEventId);
                            },
                            event => {
                                lastEventId = event.eventId;
                                onEvent(event);
                            },
                            headers,
                            subscriptionConstructor
                        )
                    }
                    executeSubscriptionOnce(error, lastEventId);
                }

                unsubscribe() {
                    window.clearTimeout(this.timeout);
                    this.onTransition(new EndedSubscriptionState());
                  }
            }

            class EndedSubscriptionState implements SubscriptionState{
                constructor(){
                    logger.info(`ResumingSubscription: transitioning to EndedSubscriptionState`);
                }
                unsubscribe() {
                    throw new Error("Subscription has already ended");
                  }
            }

            class FailedSubscriptionState implements SubscriptionState {
                constructor(error: any){
                    logger.info(`ResumingSubscription: transitioning to FailedSubscriptionState`, error);                                  
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
    return (onOpen, onError, onEvent, headers, constructor) => 
        new ResumingSubscription(onOpen, onError, onEvent, headers, constructor);
            
};