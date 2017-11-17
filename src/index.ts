import { BaseClient, BaseClientOptions } from './base-client';
import {
  default as Instance,
  ResumableSubscribeOptions,
  SubscribeOptions,
} from './instance';
import { ConsoleLogger, EmptyLogger, Logger } from './logger';
import {
  ElementsHeaders,
  ErrorResponse,
  NetworkError,
  responseToHeadersObject,
  XhrReadyState,
} from './network';
import { executeNetworkRequest, RequestOptions } from './request';
import { createResumingStrategy } from './resuming-subscription';
import {
  createRetryStrategyOptionsOrDefault,
  DoNotRetry,
  Retry,
  RetryResolution,
  RetryStrategyOptions,
  RetryStrategyResult,
} from './retry-strategy';
import { createRetryingStrategy } from './retrying-subscription';
import {
  Subscription,
  SubscriptionConstructor,
  SubscriptionEvent,
  SubscriptionListeners,
} from './subscription';
import { TokenProvider } from './token-provider';
import { createTokenProvidingStrategy } from './token-providing-subscription';
import { createTransportStrategy } from './transports';

export {
  BaseClient,
  BaseClientOptions,
  ConsoleLogger,
  createResumingStrategy,
  createRetryingStrategy,
  createRetryStrategyOptionsOrDefault,
  createTokenProvidingStrategy,
  createTransportStrategy,
  DoNotRetry,
  ElementsHeaders,
  EmptyLogger,
  ErrorResponse,
  executeNetworkRequest,
  Instance,
  Logger,
  NetworkError,
  RequestOptions,
  responseToHeadersObject,
  ResumableSubscribeOptions,
  RetryStrategyResult,
  Retry,
  RetryStrategyOptions,
  RetryResolution,
  SubscribeOptions,
  Subscription,
  SubscriptionEvent,
  SubscriptionListeners,
  TokenProvider,
  XhrReadyState,
};

export default {
  BaseClient,
  ConsoleLogger,
  EmptyLogger,
  Instance,
};
