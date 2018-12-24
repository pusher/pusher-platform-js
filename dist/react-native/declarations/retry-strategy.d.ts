import { Logger } from './logger';
export interface RetryStrategyOptions {
    increaseTimeout?: (currentTimeout: number) => number;
    initialTimeoutMillis?: number;
    limit?: number;
    maxTimeoutMillis?: number;
}
export interface CompleteRetryStrategyOptions {
    increaseTimeout: (currentTimeout: number) => number;
    initialTimeoutMillis: number;
    limit: number;
    maxTimeoutMillis: number;
}
export declare let createRetryStrategyOptionsOrDefault: (options: RetryStrategyOptions) => CompleteRetryStrategyOptions;
export interface RetryStrategyResult {
}
export declare class Retry implements RetryStrategyResult {
    waitTimeMillis: number;
    constructor(waitTimeMillis: number);
}
export declare class DoNotRetry implements RetryStrategyResult {
    error: Error;
    constructor(error: Error);
}
export declare class RetryResolution {
    private options;
    private logger;
    private retryUnsafeRequests?;
    private initialTimeoutMillis;
    private maxTimeoutMillis;
    private limit;
    private increaseTimeoutFunction;
    private currentRetryCount;
    private currentBackoffMillis;
    constructor(options: CompleteRetryStrategyOptions, logger: Logger, retryUnsafeRequests?: boolean | undefined);
    attemptRetry(error: any): RetryStrategyResult;
    private calculateMillisToRetry;
}
