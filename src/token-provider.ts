import { NetworkRequest } from './request';
import { ErrorResponse } from './base-client';
import { RetryStrategy } from './retry-strategy/retry-strategy';
export interface TokenProvider {
    invalidateToken(token?: string);
    fetchToken: NetworkRequest<string>;
    stopFetch(): void;
}

/**
 * Wrapper around the token provider that contains a retry strategy
 * TODO: test
 * Currently not used anywhere
 * TODO: it really does fuck all
 */
export class RetryingTokenProvider implements TokenProvider {
    constructor(
        private baseTokenProvider: TokenProvider, 
        private retryStrategy: RetryStrategy){
    }

    fetchToken(params: any): Promise<string> { return null;}
    invalidateToken = this.baseTokenProvider.invalidateToken;   
    stopFetch(){}    
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
    stopFetch(){}
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
    stopFetch(){}
}
