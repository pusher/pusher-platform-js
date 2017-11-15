import { RetryStrategyOptions } from './retry-strategy';
import { Logger } from './logger';
import { SubscribeStrategy } from './subscribe-strategy';
export declare let createResumingStrategy: (retryingOptions: RetryStrategyOptions, initialEventId: string, nextSubscribeStrategy: SubscribeStrategy, logger: Logger) => SubscribeStrategy;
