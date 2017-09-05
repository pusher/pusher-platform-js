import { SubscribeStrategy, Subscription, SubscriptionConstructor, SubscriptionState } from './rejig';
import { ErrorResponse } from '../base-client';

/**
 * Can we provide token synchronously? I think this would make it a lot simpler  to chain all the events
 */
interface SynchronousTokenProvider {
    fetchToken(): string;
    clearToken(): void;
}

interface AsynchronousTokenProvider {
    fetchToken(onToken: (token: string) => void, onError: (error: any) => void); //Maybe make return a TokenRequest that we can cancel???
    clearToken(token?: string);
    cancelFetch(): void;
}

let createTokenProvidingStrategy: (tokenProvider: AsynchronousTokenProvider, nextSubscribeStrategy: SubscribeStrategy) => SubscribeStrategy = (tokenProvider, nextSubscribeStrategy) => {

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

                constructor(private onTransition: (SubscriptionState) => void){

                    let isTokenExpiredError: (error: any) => boolean = error => {
                        return (
                            error instanceof ErrorResponse && 
                            error.statusCode === 401 && 
                            error.info === "authentication/expired"
                        ); 
                    }

                    let fetchTokenAndExecuteSubscription = () => {
                        tokenProvider.fetchToken(
                            token => {
                                if(token){
                                    headers['Authorization'] = `Bearer ${token}`;
                                }
                                this.underlyingSubscription = nextSubscribeStrategy(
                                    headers => {
                                        onTransition(new OpenSubscriptionState(this.underlyingSubscription, onTransition));
                                    },
                                    error => {
                                        if(isTokenExpiredError(error)){
                                            tokenProvider.clearToken();
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
                                
                            },
                            error => {
                                onTransition(new FailedSubscriptionState(error));
                            }
                        );
                    }
                    fetchTokenAndExecuteSubscription();
                }
                
                unsubscribe(){
                    tokenProvider.cancelFetch();
                    this.underlyingSubscription.unsubscribe();
                    this.onTransition(new EndedSubscriptionState());
                }
            }

            class OpenSubscriptionState implements SubscriptionState {
                constructor(private underlyingSubscription: Subscription, private onTransition: (SubscriptionState) => void){

                }

                unsubscribe(){
                    this.underlyingSubscription.unsubscribe();
                    this.onTransition(new EndedSubscriptionState());
                }
            }

            class FailedSubscriptionState implements SubscriptionState {
                constructor(error: any){
                    onError(error);
                }
                unsubscribe(){
                    throw new Error("Subscription has already ended");
                }
            }

            class EndedSubscriptionState implements SubscriptionState {
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