import { Logger } from '../logger';
import { NetworkRequest } from '../request';
import { ErrorResponse } from '../base-client';
import { BaseSubscription } from '../subscription/base-subscription';
import { TokenProvider } from '../token-provider';
import { RetryStrategy } from './retry-strategy';

//TODO just use a token provider? :o
export class TokenFetchingRetryStrategy implements RetryStrategy {
    constructor(
        private tokenProvider: TokenProvider,
        private logger: Logger,
    ){}
    private subscription: BaseSubscription;
    executeSubscription(
        xhrSource: (headers: Headers) => BaseSubscription, 
        subscriptionCallback: (subscription: BaseSubscription) => void, 
        errorCallback: (error: any) => void) {
            
            this.resolveError(error)
            .then( () => this.tokenProvider.fetchToken)
            .then(token => {
                let xhr = xhrSource();
                if(token){
                    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
                }
                if(lastEventId){
                    xhr.setRequestHeader("Last-Event-Id", lastEventId);                    
                }
                
                this.subscription = new BaseSubscription(
                    xhr, 
                    this.logger, 
                    (headers) => {
                        subscriptionCallback(this.subscription);
                    }, 
                    (error) => {
                        errorCallback(error);
                    } 
                );
            })
            .catch( errorCallback );
        }
        
        resolveError(error: any): Promise<any>{
            return new Promise( (resolve, reject) => {
                if (
                    error instanceof ErrorResponse && 
                    error.statusCode === 401 && 
                    error.name == "authentication/jwt/expired"){
                        this.tokenProvider.invalidateToken(error.info.token);
                }
                resolve();
            });
        }
    
        executeRequest<T>( 
            error: any,
            request: NetworkRequest<T>) {
                return new Promise<T>( (resolve, reject) => {
                    this.resolveError(error)
                    .then( () => this.tokenProvider.fetchToken() )
                    .then( (token) => { 
                        resolve (request( { token: token }));
                    });
                });       
        }

        stopRetrying(){
            if(this.subscription){
                this.subscription.unsubscribe();
            }   
        }
    }