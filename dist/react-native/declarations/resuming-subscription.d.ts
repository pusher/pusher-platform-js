import { Logger } from './logger';
import { RetryStrategyOptions } from './retry-strategy';
import { SubscribeStrategy } from './subscribe-strategy';
export declare let createResumingStrategy: (retryingOptions: RetryStrategyOptions, nextSubscribeStrategy: SubscribeStrategy, logger: Logger, initialEventId?: string) => SubscribeStrategy;
