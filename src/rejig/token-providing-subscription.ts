import { TokenProvider } from '../../declarations/token-provider';
import { ErrorResponse } from '../base-client';
import { SubscribeStrategy, Subscription, SubscriptionState } from './subscription';

export interface AsynchronousTokenProvider {
    fetchToken(resolve: (token: string) => void, reject: (error: any) => void, tokenParams?: any): NetworkRequest //Maybe make return a TokenRequest that we can cancel??? Encapsulated promises? 
    clearToken(token?: string);
    // cancelFetch(): void; //Go to the token request object
    // fetchToken2(tokenParams: any): NetworkRequest;
}

export interface TokenProvider {
    fetchToken(resolve: (token: string) => void, reject: (error: any) => void, tokenParams?: any): NetworkRequest
    clearToken(token?: string);
}

export interface NetworkRequest{
    cancel();
}

let fetchToken: (resolve: (token: string) => void, reject: (error: any) => void, tokenParams?) => NetworkRequest = (resolve, reject, tokenParams) => {

    let xhr: XMLHttpRequest;
    //Add params to the XHR
    this.xhr.open;
    this.xhr.onreadystatechange = event => {

    if(this.xhr.readyState === 4){
        if (this.xhr.status === 200){
            resolve(this.xhr.response as string);
        }
        else{
            reject(new ErrorResponse(this.xhr.status, null, this.xhr.responseText));
        }
    }
    };
    this.xhr.send()
    
    let request = {
        cancel(){
            xhr.abort();
        }
    };

    return request;
}

export let createTokenProvidingStrategy: (tokenProvider: AsynchronousTokenProvider, nextSubscribeStrategy: SubscribeStrategy) => SubscribeStrategy = (tokenProvider, nextSubscribeStrategy) => {

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