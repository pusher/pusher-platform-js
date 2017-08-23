import { NetworkRequest } from '../request';
import { Logger, EmptyLogger } from '../logger';
import { ErrorResponse, NetworkError, Headers } from '../base-client';
import { BaseSubscription } from '../subscription/base-subscription';
import { TokenProvider } from '../token-provider';

export interface RetryStrategy {
    executeSubscription(
        subscriptionRequest: (headers: Headers) => Promise<BaseSubscription>, 
        subscriptionCallback: (subscription: BaseSubscription) => void, 
        errorCallback: (error: any) => void
    );
    executeRequest<T>(
        request: NetworkRequest<T>
    ): Promise<T>;

    stopRetrying(): void;
}

export interface RetryStrategyResult {}

export class Retry implements RetryStrategyResult {
    waitTimeMillis: number;
    constructor(waitTimeMillis: number){
        this.waitTimeMillis = waitTimeMillis;
    }
}

export class DoNotRetry implements RetryStrategyResult {
    error: Error;
    constructor(error: Error){
        this.error = error;
    }
}
