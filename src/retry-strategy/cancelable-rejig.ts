import { SubscribeStrategy, SubscriptionConstructor } from './rejig';
import { BaseSubscription } from '../subscription/base-subscription';



class Client {

    subscribeResumable(path, headers, listeners, retryStrategyOptions, initialEventId, tokenProvider) {

        let subscriptionConstructor = (headers, onOpen, onError, onEvent, createdCallback) => {

            return null;
        };

        let subscriptionStrategy = createFakeStrategy();

        return subscriptionStrategy(
            listeners.onOpen,
            listeners.onSubscribe,
            listeners.onError,
            listeners.onEvent,
            listeners.onEnd,
            headers,
            subscriptionConstructor);
    }
}

function createFakeStrategy() {

    return (onOpen, onSubscribe, onError, onEvent, onEnd, headers, subConstructor) => {

        return new class {
            private subscription;
            constructor(){
                subConstructor(
                    onOpen, 
                    onError, 
                    onEvent, 
                    headers, 
                    (subscription) => {
                        this.subscription = subscription;
    
                    }
                );
            }
            
            unsubscribe(){
                onOpen = null;
                onSubscribe = null;
                onError = null;
                onEvent = null;
                onEnd = null;

                if(this.subscription) this.subscription.unsubscribe();
            }
        };
    };
}
