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
    this.httpTransport = new HttpTransport(this.host, options.encrypted);
  }

  request(options: RequestOptions, tokenParams?: any): Promise<any> {
    if (options.tokenProvider) {
      return options.tokenProvider
        .fetchToken(tokenParams)
        .then(token => {
          if (options.headers !== undefined) {
            // tslint:disable-next-line:no-string-literal
            options.headers['Authorization'] = `Bearer ${token}`;
          } else {
            options.headers = {
              ['Authorization']: `Bearer ${token}`,
            };
          }
          return executeNetworkRequest(
            () => this.httpTransport.request(options),
            options,
          );
        })
        .catch(error => {
          this.logger.error(error);
        });
    }

    return executeNetworkRequest(
      () => this.httpTransport.request(options),
      options,
    );
  }

  subscribeResuming(
    path: string,
    headers: ElementsHeaders,
    listeners: SubscriptionListeners,
    retryStrategyOptions: RetryStrategyOptions,
    initialEventId?: string,
    tokenProvider?: TokenProvider,
  ): Subscription {
    const completeListeners = replaceMissingListenersWithNoOps(listeners);
    const subscribeStrategyListeners = subscribeStrategyListenersFromSubscriptionListeners(
      completeListeners,
    );
    const subscriptionStrategy = createResumingStrategy(
      retryStrategyOptions,
      createTokenProvidingStrategy(
        createTransportStrategy(path, this.websocketTransport, this.logger),
        this.logger,
        tokenProvider,
      ),
      this.logger,
      initialEventId,
    );

    let opened = false;
    return subscriptionStrategy(
      {
        onEnd: subscribeStrategyListeners.onEnd,
        onError: subscribeStrategyListeners.onError,
        onEvent: subscribeStrategyListeners.onEvent,
        onOpen: subHeaders => {
          if (!opened) {
            opened = true;
            subscribeStrategyListeners.onOpen(subHeaders);
          }
          completeListeners.onSubscribe();
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
    tokenProvider?: TokenProvider,
  ) {
    const completeListeners = replaceMissingListenersWithNoOps(listeners);
    const subscribeStrategyListeners = subscribeStrategyListenersFromSubscriptionListeners(
      completeListeners,
    );

    const subscriptionStrategy = createRetryingStrategy(
      retryStrategyOptions,
      createTokenProvidingStrategy(
        createTransportStrategy(path, this.websocketTransport, this.logger),
        this.logger,
        tokenProvider,
      ),
      this.logger,
    );

    let opened = false;
    return subscriptionStrategy(
      {
        onEnd: subscribeStrategyListeners.onEnd,
        onError: subscribeStrategyListeners.onError,
        onEvent: subscribeStrategyListeners.onEvent,
        onOpen: subHeaders => {
          if (!opened) {
            opened = true;
            subscribeStrategyListeners.onOpen(subHeaders);
          }
          completeListeners.onSubscribe();
        },
        onRetrying: subscribeStrategyListeners.onRetrying,
      },
      headers,
    );
  }
}
