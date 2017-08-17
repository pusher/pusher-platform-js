import { ErrorResponse, NetworkRequest } from '../base-client';
import { BaseSubscription } from '../base-subscription';
import { TokenProvider } from '../token-provider';
import { RetryStrategy } from './retry-strategy';

export class TokenFetchingRetryStrategy implements RetryStrategy {
    constructor(
        private tokenProvider: TokenProvider,
    ){}
    
    executeSubscription(
        error: any,
        xhrSource: () => XMLHttpRequest, 
        lastEventId: string,
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
                
                let subscription = new BaseSubscription(
                    xhr, 
                    null, 
                    (headers) => {
                        subscriptionCallback(subscription);
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
                })       
        }
    }