import { ErrorResponse } from './base-client';
import { SubscribeStrategy, Subscription, SubscriptionState } from './subscription';
import { CancellablePromise } from './cancelable-promise';
import { Logger } from './logger';

export interface TokenPromise extends CancellablePromise<string> {}

export interface TokenProvider {
    fetchToken(tokenParams?: any): TokenPromise;
    clearToken(token?: string);
}

export let createTokenProvidingStrategy: (tokenProvider: TokenProvider, nextSubscribeStrategy: SubscribeStrategy, logger: Logger) => SubscribeStrategy = (tokenProvider, nextSubscribeStrategy, logger) => {

    class TokenProvidingSubscription implements Subscription {

        private state: SubscriptionState;

        constructor(
            onOpen,
            onError,
            onEvent,
            headers,
            subscriptionConstructor
        ){
            class TokenProvidingState implements SubscriptionState {

                private underlyingSubscription: Subscription;
                private tokenPromise: TokenPromise;

                constructor(private onTransition: (SubscriptionState) => void){

                    logger.info(`TokenProvidingSubscription: transitioning to TokenProvidingState`);

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
                                    logger.info(`TokenProvidingSubscription: token fetched: ${token}`);
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
                    logger.info(`TokenProvidingSubscription: transitioning to OpenSubscriptionState`);
                }

                unsubscribe(){
                    this.underlyingSubscription.unsubscribe();
                    this.onTransition(new EndedSubscriptionState());
                }
            }

            class FailedSubscriptionState implements SubscriptionState {
                constructor(error: any){
                    
                    logger.info(`TokenProvidingSubscription: transitioning to FailedSubscriptionState`, error);

                    onError(error);
                }
                unsubscribe(){
                    throw new Error("Subscription has already ended");
                }
            }

            class EndedSubscriptionState implements SubscriptionState {
                constructor(){
                    logger.info(`TokenProvidingSubscription: transitioning to EndedSubscriptionState`);
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

    return (onOpen, onError, onEvent, headers, subscriptionConstructor) => new  TokenProvidingSubscription(onOpen, onError, onEvent, headers, subscriptionConstructor);
}