import { BaseClient } from './base-client';
import { HOST_BASE } from './host-base';
import { ConsoleLogger, Logger } from './logger';
import { ElementsHeaders } from './network';
import { RequestOptions } from './request';
import { RetryStrategyOptions } from './retry-strategy';
import { Subscription, SubscriptionListeners } from './subscription';
import { TokenProvider } from './token-provider';

export interface InstanceOptions {
  locator: string;
  serviceName: string;
  serviceVersion: string;
  host?: string; // Allows injection of the hostname explicitly
  logger?: Logger;
  client?: BaseClient;
  encrypted?: boolean;
  tokenProvider?: TokenProvider;
}

export interface SubscribeOptions {
  path: string;
  headers?: ElementsHeaders;
  listeners: SubscriptionListeners;
  retryStrategyOptions?: RetryStrategyOptions;
  tokenProvider?: TokenProvider;
}

export interface ResumableSubscribeOptions extends SubscribeOptions {
  initialEventId?: string;
}

export default class Instance {
  logger: Logger;
  tokenProvider?: TokenProvider;
  private client: BaseClient;
  private host: string;
  private id: string;
  private cluster: string;
  private platformVersion: string;
  private serviceVersion: string;
  private serviceName: string;

  constructor(options: InstanceOptions) {
    if (!options.locator) {
      throw new Error('Expected `locator` property in Instance options!');
    }

    const splitInstanceLocator = options.locator.split(':');
    if (splitInstanceLocator.length !== 3) {
      throw new Error(
        'The instance locator supplied is invalid. Did you copy it correctly from the Pusher dashboard?',
      );
    }

    if (!options.serviceName) {
      throw new Error('Expected `serviceName` property in Instance options!');
    }

    if (!options.serviceVersion) {
      throw new Error(
        'Expected `serviceVersion` property in Instance options!',
      );
    }

    this.platformVersion = splitInstanceLocator[0];
    this.cluster = splitInstanceLocator[1];
    this.id = splitInstanceLocator[2];

    this.serviceName = options.serviceName;
    this.serviceVersion = options.serviceVersion;

    this.host = options.host || `${this.cluster}.${HOST_BASE}`;
    this.logger = options.logger || new ConsoleLogger();

    this.client =
      options.client ||
      new BaseClient({
        encrypted: options.encrypted,
        host: this.host,
        logger: this.logger,
      });

    this.tokenProvider = options.tokenProvider;
  }

  request(options: RequestOptions, tokenParams?: any): Promise<any> {
    options.path = this.absPath(options.path);
    if (options.headers == null || options.headers === undefined) {
      options.headers = {};
    }
    options.tokenProvider = options.tokenProvider || this.tokenProvider;
    return this.client.request(options, tokenParams);
  }

  subscribeNonResuming(options: SubscribeOptions): Subscription {
    const headers: ElementsHeaders = options.headers || {};
    const retryStrategyOptions = options.retryStrategyOptions || {};
    const tokenProvider = options.tokenProvider || this.tokenProvider;

    return this.client.subscribeNonResuming(
      this.absPath(options.path),
      headers,
      options.listeners,
      retryStrategyOptions,
      tokenProvider,
    );
  }

  subscribeResuming(options: ResumableSubscribeOptions): Subscription {
    const headers: ElementsHeaders = options.headers || {};
    const retryStrategyOptions = options.retryStrategyOptions || {};
    const tokenProvider = options.tokenProvider || this.tokenProvider;

    return this.client.subscribeResuming(
      this.absPath(options.path),
      headers,
      options.listeners,
      retryStrategyOptions,
      options.initialEventId,
      tokenProvider,
    );
  }

  private absPath(relativePath: string): string {
    return `/services/${this.serviceName}/${this.serviceVersion}/${this.id}/${
      relativePath
    }`
      .replace(/\/+/g, '/')
      .replace(/\/+$/, '');
  }
}
