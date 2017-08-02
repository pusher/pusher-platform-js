import { RetryStrategy } from './retry-strategy';
export interface TokenProvider {
    fetchToken(): Promise<string>;
    invalidateToken(token?: string);
}

/**
 * Wrapper around the token provider that contains a retry strategy
 * TODO: test
 */
export class RetryingTokenProvider implements TokenProvider {
    constructor(
        private baseTokenProvider: TokenProvider, 
        private retryStrategy: RetryStrategy){}

    fetchToken(){
        return this.tryFetching();
    }

    invalidateToken(token?: string){
        this.baseTokenProvider.invalidateToken(token);
    }

    private tryFetching(){
        return new Promise<string>( (resolve, reject ) => {
            this.baseTokenProvider.fetchToken()
            .then( token => {
                resolve(token);
            }).catch( error => {
                this.retryStrategy.attemptRetry(error, true)
                .then(() => {
                    this.tryFetching();
                }).catch(error => { 
                    reject(error); 
            });
        });
        });
    }
}
