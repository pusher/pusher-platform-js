import { ConsoleLogger, Logger } from './logger';
import { ElementsHeaders, responseToHeadersObject } from './network';
import { executeNetworkRequest, RequestOptions } from './request';
import { createResumingStrategy } from './resuming-subscription';
import { RetryStrategyOptions } from './retry-strategy';
import { createRetryingStrategy } from './retrying-subscription';
import { subscribeStrategyListenersFromSubscriptionListeners } from './subscribe-strategy';
import {
  replaceMissingListenersWithNoOps,
  Subscription,
  SubscriptionConstructor,
  SubscriptionListeners,
} from './subscription';
import { TokenProvider } from './token-provider';
import { createTokenProvidingStrategy } from './token-providing-subscription';
import HttpTransport from './transport/http';
import WebSocketTransport from './transport/websocket';
import { createTransportStrategy } from './transports';

import * as PCancelable from 'p-cancelable';

export interface BaseClientOptions {
  host: string;
  encrypted?: boolean;
  logger?: Logger;
}

export class BaseClient {
  private host: string;
  private XMLHttpRequest: any;
  private logger: Logger;
  private websocketTransport: WebSocketTransport;
  private httpTransport: HttpTransport;

  constructor(private options: BaseClientOptions) {
    this.host = options.host.replace(/(\/)+$/, '');
    this.logger = options.logger || new ConsoleLogger();

    this.websocketTransport = new WebSocketTransport(this.host);
    this.httpTransport = new HttpTransport(this.host);
  }

  request(
    options: RequestOptions,
    tokenProvider?: TokenProvider,
    tokenParams?: any,
  ): PCancelable {
    if (tokenProvider) {
      return tokenProvider
        .fetchToken(tokenParams)
        .then(token => {
          // tslint:disable-next-line:no-string-literal
          options.headers['Authorization'] = `Bearer ${token}`;
          return executeNetworkRequest(
            () => this.httpTransport.request(options),
            options,
          );
        })
        .catch(error => {
          this.logger.error(error);
        });
    } else {
      return executeNetworkRequest(
        () => this.httpTransport.request(options),
        options,
      );
    }
  }

  subscribeResuming(
    path: string,
    headers: ElementsHeaders,
    listeners: SubscriptionListeners,
    retryStrategyOptions: RetryStrategyOptions,
    initialEventId: string,
    tokenProvider: TokenProvider,
  ): Subscription {
    listeners = replaceMissingListenersWithNoOps(listeners);
    const subscribeStrategyListeners = subscribeStrategyListenersFromSubscriptionListeners(
      listeners,
    );

    const subscriptionStrategy = createResumingStrategy(
      retryStrategyOptions,
      initialEventId,
      createTokenProvidingStrategy(
        tokenProvider,
        createTransportStrategy(path, this.websocketTransport, this.logger),
        this.logger,
      ),

      this.logger,
    );

    let opened = false;
    return subscriptionStrategy(
      {
        onEnd: subscribeStrategyListeners.onEnd,
        onError: subscribeStrategyListeners.onError,
        onEvent: subscribeStrategyListeners.onEvent,
        onOpen: headers => {
          if (!opened) {
            opened = true;
            listeners.onOpen(headers);
          }
          listeners.onSubscribe();
        },
        onRetrying: subscribeStrategyListeners.onRetrying,
      },
      headers,
    );
  }

  subscribeNonResuming(
    path: string,
    headers: ElementsHeaders,
    listeners: SubscriptionListeners,
    retryStrategyOptions: RetryStrategyOptions,
    tokenProvider: TokenProvider,
  ) {
    listeners = replaceMissingListenersWithNoOps(listeners);
    const subscribeStrategyListeners = subscribeStrategyListenersFromSubscriptionListeners(
      listeners,
    );

    const subscriptionStrategy = createRetryingStrategy(
      retryStrategyOptions,
      createTokenProvidingStrategy(
        tokenProvider,
        createTransportStrategy(path, this.websocketTransport, this.logger),
        this.logger,
      ),
      this.logger,
    );

    let opened = false;
    return subscriptionStrategy(
      {
        onEnd: subscribeStrategyListeners.onEnd,
        onError: subscribeStrategyListeners.onError,
        onEvent: subscribeStrategyListeners.onEvent,
        onOpen: headers => {
          if (!opened) {
            opened = true;
            listeners.onOpen(headers);
          }
          listeners.onSubscribe();
        },
        onRetrying: subscribeStrategyListeners.onRetrying,
      },
      headers,
    );
  }
}
