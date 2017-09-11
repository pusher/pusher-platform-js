import { ErrorResponse, ElementsHeaders } from './network';
import {
    SubscribeStrategy,
    Subscription,
    SubscriptionConstructor,
    SubscriptionEvent,
    SubscriptionState,
} from './subscription';
import { Logger } from './logger';
import { TokenProvider, TokenPromise } from './token-provider';

export let createTokenProvidingStrategy: (tokenProvider: TokenProvider, nextSubscribeStrategy: SubscribeStrategy, logger: Logger) => SubscribeStrategy = 
(tokenProvider, nextSubscribeStrategy, logger) => {

    class TokenProvidingSubscription implements Subscription {

        private state: SubscriptionState;

        constructor(
            onOpen: (headers: ElementsHeaders) => void, 
            onError: (error: any) => void, 
            onEvent: (event: SubscriptionEvent) => void, 
            onEnd: (error: any) => void,
            headers,
            subscriptionConstructor: SubscriptionConstructor
        ){
            class TokenProvidingState implements SubscriptionState {

                private underlyingSubscription: Subscription;
                private tokenPromise: TokenPromise;

                constructor(private onTransition: (SubscriptionState) => void){

                    logger.verbose(`TokenProvidingSubscription: transitioning to TokenProvidingState`);

                    let isTokenExpiredError: (error: any) => boolean = error => {
                        return (
                            error instanceof ErrorResponse && 
                            error.statusCode === 401 && 
                            error.info === "authentication/expired"
                        ); 
                    }

                    let fetchTokenAndExecuteSubscription = () => {

                        this.tokenPromise = tokenProvider.fetchToken()
                            .then( token => {
                                if(token){
                                    headers['Authorization'] = `Bearer ${token}`;
                                    logger.verbose(`TokenProvidingSubscription: token fetched: ${token}`);
                                }
                                this.underlyingSubscription = nextSubscribeStrategy(
                                    headers => {
                                        onTransition(new OpenSubscriptionState(this.underlyingSubscription, onTransition));
                                    },
                                    error => {
                                        if(isTokenExpiredError(error)){
                                            tokenProvider.clearToken(token);
                                            fetchTokenAndExecuteSubscription();
                                        }
                                        else{
                                            onTransition(new FailedSubscriptionState(error));
                                        }
                                    },
                                    onEvent,
                                    error => {
                                        onTransition(new EndedSubscriptionState(error));
                                    },
                                    headers,
                                    subscriptionConstructor
                                )
                            })
                            .catch( error => {
                                error => {
                                    onTransition(new FailedSubscriptionState(error));
                                }
                            });
                    }
                    fetchTokenAndExecuteSubscription();
                }
                
                unsubscribe(){
                    if(this.tokenPromise) this.tokenPromise.cancel();
                    this.underlyingSubscription.unsubscribe();
                    this.onTransition(new EndedSubscriptionState());
                }
            }

            class OpenSubscriptionState implements SubscriptionState {
                constructor(private underlyingSubscription: Subscription, private onTransition: (SubscriptionState) => void){
                    logger.verbose(`TokenProvidingSubscription: transitioning to OpenSubscriptionState`);
                }

                unsubscribe(){
                    this.underlyingSubscription.unsubscribe();
                    this.onTransition(new EndedSubscriptionState());
                }
            }

            class FailedSubscriptionState implements SubscriptionState {
                constructor(error: any){
                    
                    logger.verbose(`TokenProvidingSubscription: transitioning to FailedSubscriptionState`, error);

                    onError(error);
                }
                unsubscribe(){
                    throw new Error("Subscription has already ended");
                }
            }

            class EndedSubscriptionState implements SubscriptionState {
                constructor(error?: any){
                    logger.verbose(`TokenProvidingSubscription: transitioning to EndedSubscriptionState`);
                    onEnd(error);
                }
                unsubscribe(){
                    throw new Error("Subscription has already ended");
                }
            }

            this.state = new TokenProvidingState(this.onTransition);
        }

        onTransition(newState: SubscriptionState){
            this.state = newState;
        }

        public unsubscribe() {
            this.state.unsubscribe();
        }
    }

    //Token provider might not be there. If missing, go straight to the underlying subscribe strategy
    if(tokenProvider){
        return (onOpen, onError, onEvent, onEnd, headers, subscriptionConstructor) => new TokenProvidingSubscription(onOpen, onError, onEvent, onEnd, headers, subscriptionConstructor);
    }

    else{
        return (onOpen, onError, onEvent, onEnd, headers, subscriptionConstructor) => 
            nextSubscribeStrategy(onOpen, onError, onEvent, onEnd, headers, subscriptionConstructor);
    }
}