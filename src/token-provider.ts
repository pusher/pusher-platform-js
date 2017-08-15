import { ErrorResponse, NetworkRequest } from './base-client';
import { RetryStrategy } from './retry-strategy';
export interface TokenProvider {
    invalidateToken(token?: string);
    fetchToken: NetworkRequest<string>;
}

/**
 * Wrapper around the token provider that contains a retry strategy
 * TODO: test
 * Currently not used anywhere
 */
export class RetryingTokenProvider implements TokenProvider {
    constructor(
        private baseTokenProvider: TokenProvider, 
        private retryStrategy: RetryStrategy){
    }

    fetchToken = () => 
        this.retryStrategy.executeRequest(null, this.baseTokenProvider.fetchToken);
    
    invalidateToken = this.baseTokenProvider.invalidateToken;    
}

/**
 * No-op token provider. Fetches undefined so we can more easily replace it.
 * Never fails.
 */
export class NoOpTokenProvider implements TokenProvider {
    fetchToken(){
        return new Promise<string>( resolve => {
            resolve(undefined);
        });
    }
    invalidateToken(token?: string) {}
}

/**
 * A token provider that always returns the same token. Can be used for debugging purposes.
 */
export class FixedTokenProvider implements TokenProvider {
    constructor(private jwt: string){}
    fetchToken(){
        return new Promise<string>( resolve => {
            resolve(this.jwt);
        });
    }
    invalidateToken(token?: string) {}
}
