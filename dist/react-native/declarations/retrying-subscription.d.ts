import { RetryStrategyOptions } from './retry-strategy';
import { Logger } from './logger';
import { SubscribeStrategy } from './subscribe-strategy';
export declare let createRetryingStrategy: (retryingOptions: RetryStrategyOptions, nextSubscribeStrategy: SubscribeStrategy, logger: Logger) => SubscribeStrategy;
