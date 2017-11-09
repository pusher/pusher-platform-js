import { Logger } from './logger';
import { RetryStrategyOptions } from './retry-strategy';
import { SubscribeStrategy } from './subscribe-strategy';
export declare let createRetryingStrategy: (retryingOptions: RetryStrategyOptions, nextSubscribeStrategy: SubscribeStrategy, logger: Logger) => SubscribeStrategy;
