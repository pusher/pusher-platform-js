import { ExponentialBackoffRetryStrategy } from './retry-strategy/exponential-backoff-retry-strategy';
import { 
  FixedTokenProvider, 
  RetryingTokenProvider, 
  NoOpTokenProvider, 
  TokenProvider 
} from './token-provider';

import Instance from './instance';
import { BaseClient } from './base-client';
import { ConsoleLogger, EmptyLogger, Logger } from './logger';
import { ResumableSubscription, ResumableSubscribeOptions } from './subscription/resumable-subscription';
import { NonResumableSubscription, NonResumableSubscribeOptions } from './subscription/non-resumable-subscription'; 
import { RetryStrategy } from './retry-strategy/retry-strategy';
import { TokenFetchingRetryStrategy } from './retry-strategy/token-fetching-retry-strategy';

export {
  Instance,
  BaseClient,
  ResumableSubscription, ResumableSubscribeOptions,
  NonResumableSubscription, NonResumableSubscribeOptions,

  RetryStrategy, ExponentialBackoffRetryStrategy,
  Logger, ConsoleLogger, EmptyLogger, 
  TokenProvider, NoOpTokenProvider, RetryingTokenProvider, FixedTokenProvider
};

export default {
  Instance,
  BaseClient,
  ResumableSubscription,
  NonResumableSubscription,

  ExponentialBackoffRetryStrategy, TokenFetchingRetryStrategy,
  ConsoleLogger, EmptyLogger,
  NoOpTokenProvider, RetryingTokenProvider, FixedTokenProvider
};
