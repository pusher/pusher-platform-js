import { ErrorResponse } from '../../declarations/base-client';
import { BaseSubscription, SubscriptionEvent } from '../subscription/base-subscription';
import { executeRequest } from '../request';
import { Logger } from '../logger';
import { TokenProvider } from '../token-provider';
import { DoNotRetry, RetryStrategyResult } from './retry-strategy';
import { Retry } from './retry-strategy';
import { Headers } from '../base-client';


// class RetryStrategyExecution {
//     onSubscribe;
//     onError;
//     onEvent;
//     lastEventId: string;

//     cancel(){}
// }

/*

listeners | Instance -> Client -> TokenProvider -> NetworkErrors -> | Pusher

*/


        

        // let subscriptionConstructor = (lastEventId, onOpen, onError, onEvent) => {       
        //     // tokenProvider.fetchToken().then( (resolve, reject) => {
            


        //     // }).catch( error => {
        //     //     onError(error);
        //     // }); 

        //     let xhr = xhrSource() as XMLHttpRequest;

        //     // Headers for each TODO:
        //     // headers[key])
        //     // xhr.setRequestHeader("Last-Event-Id", lastEventId);

        //     return new BaseSubscription(
        //         xhr,
        //         logger, 
        //         onOpen,
        //         onError,
        //         onEvent
        //     );
        // };

        // let tokenFetchingSubscriptionConstructor: (tokenProvider: TokenProvider) => (lastEventId: string, onOpen, onError, onEvent) => BaseSubscription = 
        
        // (tokenProvider) => 
        // {
        //     tokenProvider.fetchToken().then( token => {

        //         return (lastEventId, onOpen, onError, onEvent) => {
                    
        //                                 let xhr = xhrSource() as XMLHttpRequest;
        //                                 xhr.setRequestHeader("Last-Event-Id", lastEventId);
        //                                 xhr.setRequestHeader("Authorization", `Bearer ${token}`);            
                                        
        //                                 return new BaseSubscription(
        //                                     xhr,
        //                                     logger,
        //                                     onOpen,
        //                                     onError,
        //                                     onEvent
        //                                 );
        //                         }
        //     });
        // } 

export type SubscriptionConstructor = (onOpen, onError, onEvent, ...params) => BaseSubscription;

export interface SubscriptionExecution {
    cancel(): void;
}

export interface RetryStrategy {
        executeSubscription(
            subscriptionConstructor: SubscriptionConstructor,
            onOpen: (headers: Headers) => void,
            onError: (error: any) => void,
            onEvent: (event: SubscriptionEvent) => void
        ): SubscriptionExecution;
}


        // return new ResumableSubscription(
        //     subscriptionConstructor,
        //     retryStrategy,
        //     logger,
        //     options.listeners
        // );




class Client {
    subscribeResumable(options){
        let path = "" + options.path;
        let retryStrategy: RetryStrategy = options.RetryStrategy || null;
        let tokenProvider = options.tokenProvider;
        let xhrSource = () => null;
        let logger = null;

        let subConstructor: ( lastEventId, onOpen, onError, onEvent) => BaseSubscription;

        if(tokenProvider){



            subConstructor = 


            
            
        }
    }


}        

class ResumableSubscription {

    private subscriptionExecution;
    private firstTimeOpen = true;
    private tokenProvider;

    constructor(
        subscriptionConstructor: (lastEventId, onOpen, onError, onEvent) => BaseSubscription,
        retryStrategy: RetryStrategy,
        logger: Logger,
        listeners
    ){

        let authorizedSubscriptionConstructor: (lastEventId, onOpen, onError, onEvent) => BaseSubscription = (lastEventId, onOpen, onError, onEvent) => {

            let checkForExpiredToken = (error) => {
            };

            return subscriptionConstructor( 
                lastEventId, 
                onOpen, 
                (error) => {
                    //Something something token???
                },
                onEvent
            );
        }

        this.subscriptionExecution = retryStrategy.executeSubscription(
            subscriptionConstructor,
            (headers) => {
                if(this.firstTimeOpen){
                    this.firstTimeOpen = false;

                    listeners.onOpen(headers);
                    listeners.onSubscribed();
                }    
            },
            listeners.onError,
            listeners.onEvent
        ); 
    }

    unsubscribe(){
        this.subscriptionExecution.unsubscribe();
    }
}

class AuthorizingRetryStrategy {

    resumableRetryStrategy;

    executeSubscription(
        subscriptionConstructor: (token, lastEventId, onOpen, onError, onEvent) => BaseSubscription,
        tokenProvider,        
        onOpen,
        onError,
        onEvent,
    ){
        function checkIfExpiredToken(error){
            if(error instanceof ErrorResponse && error.statusCode === 401 && error.info === "authorization/token-expired"){
                tokenProvider.clearToken();
                return true;
            }
            return false;
        }

        let token = tokenProvider.fetchTokenSynchronously();
    
        
        this.resumableRetryStrategy.executeSubscription(

            (lastEventId, onOpen, onError, onEvent) => {


                
            }     
        )
    }
}

class ResumableRetryStrategy {

    // tokenProvider: TokenProvider;
    // logger: Logger;

    executeSubscription(
        subscriptionConstructor: (lastEventId, onOpen, onError, onEvent) => BaseSubscription,
        onOpen,
        onError,
        onEvent,
    ){
        function checkIfErrorIsRetryable(error) {}

        function executeSubscriptionOnce(lastEventId) {
            
            return subscriptionConstructor(
                subscription => {
                    onOpen(subscription)
                },
                error => {
        
                    if (checkIfErrorIsRetryable(error)){
                        executeSubscriptionOnce(
                            lastEventId
                        )
                    }
                    else{
                        onError(error);
                    }                  
                },
                event => {
                    lastEventId = event.id;
                    onEvent(event);
                },
                lastEventId,            
            );
        }

        return executeSubscriptionOnce(null);
    }

    executeRequest(request){
    
    }


}



///////////////////////////////

class FakeClient {

    private xhrConstructor: (path: string) => (headers: Headers) => XMLHttpRequest = (path) => {
        return (headers) =>  null; //TODO:
    } 

    private logger: Logger;


    subscribe(){



    }

    subscribeResumable(
        path, headers, listeners, retryStrategyOptions, tokenProvider
     ){
        let xhrFactory = this.xhrConstructor(path);

        let subscriptionConstructor: SubscriptionConstructor = (headers, onOpen, onError, onEvent) => {
            return new BaseSubscription(xhrFactory(headers), this.logger, onOpen, onError, onEvent);
        };

        return createResumingStrategy(
            retryStrategyOptions)( 
            listeners.onOpen,
            listeners.onError,
            listeners.onEvent,
            headers,
            subscriptionConstructor); //TODO - how to chain these fuckers together? Maybe move the nextSubscribeStrategy passing into the constructor?

    }


}

type SubscriptionConstructor = (headers, onOpen, onError, onEvent) => BaseSubscription;

type SubscribeStrategy = (onOpen, onError, onEvent, headers: Headers, subscriptionConstructor: SubscriptionConstructor, subscribeStrategy?: SubscribeStrategy) => BaseSubscription;

interface RetryStrategyOptions {
    initialTimeoutMillis: number = 1000,    
    maxTimeoutMillis: number = 5000,    
    limit: number = -1,
    increaseTimeout: (timeout: number) => number = number => 2 * number <= this.maxTimeoutMillis ? 2*number : this.maxTimeoutMillis;
}

let createResumingStrategy: (retryingOptions: RetryStrategyOptions, initialEventId?: string) => SubscribeStrategy = (retryOptions, initialEventId?) => {

    let strategy: SubscribeStrategy = (onOpen, onError, onEvent, headers, constructor, nextSubscribeStrategy?) => {

        let executeStrategy: (lastEventId?: string) => BaseSubscription = (lastEventId) => {

            if(lastEventId){
                headers["Last-Event-Id"] = lastEventId;
            }
            
            let resolveError: (error: any) => RetryStrategyResult = (error) => {
                return DoNotRetry; //TODO
            }

            return nextSubscribeStrategy(
                onOpen,
                error => {
                    let errorResolution = resolveError(error);
                    if(errorResolution instanceof Retry){
                        window.setTimeout( executeStrategy(lastEventId), errorResolution.waitTimeMillis); //TODO:
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
                constructor,
                nextSubscribeStrategy
            );
        }
        return executeStrategy(initialEventId);
    };

    return strategy;
}

let createRetryingStrategy: (retryingOption: RetryStrategyOptions) => SubscribeStrategy = retryOptions => {
    let strategy: SubscribeStrategy = (onOpen, onError, onEvent, headers, constructor, nextSubscribeStrategy?) => {
        
        let executeStrategy: (lastEventId?: string) => BaseSubscription = (lastEventId) => {
            
            let resolveError: (error: any) => RetryStrategyResult = (error) => {
                return DoNotRetry; //TODO
            }

            let executeStrategyWithCurrentLastEventId = () => executeStrategy(lastEventId);
    
            return nextSubscribeStrategy(
                onOpen,
                error => {
                    let errorResolution = resolveError(error);
                    if(errorResolution instanceof Retry){
                        window.setTimeout( executeStrategyWithCurrentLastEventId, errorResolution.waitTimeMillis); //TODO:
                    }
                    else{
                        onError(error);
                    }
                },
                onEvent,
                headers,
                constructor,
                nextSubscribeStrategy
            );
        }
        return executeStrategy();
    };    
    return strategy;
}

interface SynchronousTokenProvider {
    fetchToken(): string;
    clearToken();
}

let createTokenProvidingStrategy: (tokenProvider: SynchronousTokenProvider) => SubscribeStrategy = (tokenProvider) => {

    let strategy: SubscribeStrategy = (onOpen, onError, onEvent, headers, constructor, nextSubscribeStrategy?) => {

        let executeStrategy: () => BaseSubscription = () => {
            let token = tokenProvider.fetchToken();
            if(token){
                headers["Authorization"] = `Bearer ${token}`;
            }
    
            let isTokenExpiredError: (error: any) => boolean = error => {
                return (
                    error instanceof ErrorResponse && 
                    error.statusCode === 401 && 
                    error.info === "authentication/expired"
                ); 
            }
            
            return nextSubscribeStrategy(
                onOpen,
                error => {
                    if(isTokenExpiredError(error)){
                        tokenProvider.fetchToken();
                        return executeStrategy();
                    }
                    else {
                        onError(error);
                    }
                },
                onEvent,
                headers,
                constructor,
                nextSubscribeStrategy
            );
        }

        return executeStrategy();
    }
    return strategy;
} 

let H2TransportStrategy: SubscribeStrategy = (onOpen, onError, onEvent, headers, constructor) => {

    return null;
}

let WebSocketTransportStrategy: SubscribeStrategy = (onOpen, onError, onEvent, headers, constructor) => {

    return null;
}