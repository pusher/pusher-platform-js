import { ErrorResponse, ElementsHeaders } from './network';
import {
    Subscription,
    SubscriptionConstructor,
    SubscriptionEvent,
    SubscriptionState,
} from './subscription';
import { Logger } from './logger';
import { TokenProvider } from './token-provider';
import { SubscribeStrategy, SubscribeStrategyListeners } from './subscribe-strategy';
import { PCancelable } from 'p-cancelable';

export let createTokenProvidingStrategy: (tokenProvider: TokenProvider, nextSubscribeStrategy: SubscribeStrategy, logger: Logger) => SubscribeStrategy = 
(tokenProvider, nextSubscribeStrategy, logger) => {

    class TokenProvidingSubscription implements Subscription {

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
            class TokenProvidingState implements SubscriptionState {

                private underlyingSubscription: Subscription;
                private tokenPromise: PCancelable<string>;

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
                                this.putTokenIntoHeader(token);
                                this.underlyingSubscription = nextSubscribeStrategy(
                                {
                                    onOpen: headers => {
                                        onTransition(new OpenSubscriptionState(this.underlyingSubscription, onTransition));
                                    },
                                    onRetrying: listeners.onRetrying,
                                    onError: error => {
                                        if(isTokenExpiredError(error)){
                                            tokenProvider.clearToken(token);
                                            fetchTokenAndExecuteSubscription();
                                        }
                                        else{
                                            onTransition(new FailedSubscriptionState(error));
                                        }
                                    },
                                    onEvent: listeners.onEvent,
                                    onEnd: error => {
                                        onTransition(new EndedSubscriptionState(error));
                                    }
                                },
                                    headers
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

                private putTokenIntoHeader(token: any) {
                    if(token) {
                        headers['Authorization'] = `Bearer ${token}`;
                        logger.verbose(`TokenProvidingSubscription: token fetched: ${token}`);
                    }
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

                    listeners.onError(error);
                }
                unsubscribe(){
                    throw new Error("Subscription has already ended");
                }
            }

            class EndedSubscriptionState implements SubscriptionState {
                constructor(error?: any){
                    logger.verbose(`TokenProvidingSubscription: transitioning to EndedSubscriptionState`);
                    listeners.onEnd(error);
                }
                unsubscribe(){
                    throw new Error("Subscription has already ended");
                }
            }

            this.state = new TokenProvidingState(this.onTransition);
        }
    }

    //Token provider might not be there. If missing, go straight to the underlying subscribe strategy
    if(tokenProvider){
        return (listeners, headers) => new TokenProvidingSubscription(listeners, headers);
    }

    else{
        return (listeners, headers) => 
            nextSubscribeStrategy(listeners, headers);
    }
}