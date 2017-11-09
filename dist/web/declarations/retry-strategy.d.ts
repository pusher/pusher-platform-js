import { Logger } from './logger';
export interface RetryStrategyOptions {
    initialTimeoutMillis?: number;
    maxTimeoutMillis?: number;
    limit?: number;
    increaseTimeout?: (currentTimeout: number) => number;
}
export declare let createRetryStrategyOptionsOrDefault: (options: RetryStrategyOptions) => RetryStrategyOptions;
export interface RetryStrategyResult {
}
export declare class Retry implements RetryStrategyResult {
    waitTimeMillis: number;
    constructor(waitTimeMillis: any);
}
export declare class DoNotRetry implements RetryStrategyResult {
    error: Error;
    constructor(error: Error);
}
export declare class RetryResolution {
    private options;
    private logger;
    private retryUnsafeRequests;
    private initialTimeoutMillis;
    private maxTimeoutMillis;
    private limit;
    private increaseTimeoutFunction;
    private currentRetryCount;
    private currentBackoffMillis;
    constructor(options: RetryStrategyOptions, logger: Logger, retryUnsafeRequests?: boolean);
    attemptRetry(error: any): RetryStrategyResult;
    private shouldSafeRetry(error);
    private calulateMillisToRetry();
}
