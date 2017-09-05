import { createRetryStrategyOptionsOrDefault, Subscription, SubscriptionState, SubscribeStrategy, RetryStrategyOptions } from './rejig';
import { RetryResolution } from '../retry-strategy/exponential-backoff-retry-strategy';
import { RetryStrategyResult, Retry } from '../retry-strategy/retry-strategy';
import { SubscriptionEvent } from '../subscription/base-subscription';

export let createResumingStrategy: (retryingOptions: RetryStrategyOptions, initialEventId: string, nextSubscribeStrategy: SubscribeStrategy) => SubscribeStrategy = 

(retryOptions, initialEventId, nextSubscribeStrategy) => {

    retryOptions = createRetryStrategyOptionsOrDefault(retryOptions);
    let retryResolution = new RetryResolution(retryOptions);

    class ResumingSubscription implements Subscription, SubscriptionStateTransition{

        private state: SubscriptionState;

        constructor(
            onOpen, 
            onError, 
            onEvent, 
            headers, 
            constructor
        ){
            let executeStrategy: (lastEventId?: string) => Subscription = (lastEventId) => {
                
                if(lastEventId){
                    headers["Last-Event-Id"] = lastEventId;
                }
                
                let resolveError: (error: any) => RetryStrategyResult =(error) => {
                    return retryResolution.attemptRetry(error);
                }
            
                let executeStrategyWithLastEventId = () => executeStrategy(lastEventId);
                
                return nextSubscribeStrategy(
                    onOpen,
                    error => {
                        let errorResolution = resolveError(error);
                        if(errorResolution instanceof Retry){
                            window.setTimeout( executeStrategyWithLastEventId, errorResolution.waitTimeMillis); //TODO:
                        }
                        else{
                            onError(error);
                        }
                    },
                    event => {
                        lastEventId = (event as SubscriptionEvent).eventId;
                        onEvent(event);
                    },
                    headers,
                    constructor
                );
                }
            executeStrategy(initialEventId);    
        }   

        onTransition(newState: SubscriptionState){
            this.state = newState;
        }
        
        unsubscribe(){
            this.state.unsubscribe();
            throw new Error("Not implemented");
        }
    }


    let strategy: SubscribeStrategy = (onOpen, onError, onEvent, headers, constructor) => {
        return new ResumingSubscription(onOpen, onError, onEvent, headers, constructor);
    }
   
    return strategy;        
};