import { ErrorResponse, ElementsHeaders } from './network';
import {
  Subscription,
  SubscriptionConstructor,
  SubscriptionEvent,
  SubscriptionListeners,
} from './subscription';
import { Logger } from './logger';
import { TokenProvider } from './token-provider';
import { SubscribeStrategy, SubscribeStrategyListeners } from './subscribe-strategy';

export let createTokenProvidingStrategy: (
  nextSubscribeStrategy: SubscribeStrategy,
  logger: Logger,
  tokenProvider?: TokenProvider
) => SubscribeStrategy = (nextSubscribeStrategy, logger, tokenProvider) => {
  // Token provider might not be provided. If missing, go straight to underlying subscribe strategy.
  if (tokenProvider) {
    return (listeners, headers) =>
      new TokenProvidingSubscription(
        logger,
        listeners,
        headers,
        tokenProvider,
        nextSubscribeStrategy
      );
  }
  return nextSubscribeStrategy;
}

interface TokenProvidingSubscriptionState {
  subscribe(token: string, listeners: SubscriptionListeners): void;
  unsubscribe(): void;
}

class TokenProvidingSubscription implements Subscription {
  private state: TokenProvidingSubscriptionState;

  constructor(
    private logger: Logger,
    private listeners: SubscribeStrategyListeners,
    private headers: ElementsHeaders,
    private tokenProvider: TokenProvider,
    private nextSubscribeStrategy: SubscribeStrategy
  ) {
    this.state = new ActiveState(logger, headers, nextSubscribeStrategy);
    this.subscribe();
  }

  public unsubscribe = () => {
    this.state.unsubscribe();
    this.state = new InactiveState(this.logger);
  }

  private subscribe(): void {
    this.tokenProvider.fetchToken()
      .then(token => {
        const existingListeners = Object.assign({}, this.listeners);
        this.state.subscribe(token, {
          onOpen: this.listeners.onOpen,
          onEvent: this.listeners.onEvent,
          onEnd: (error: any) => {
            this.state = new InactiveState(this.logger);
            existingListeners.onEnd(error);
          },
          onError: (error: any) => {
            if (this.isTokenExpiredError(error)) {
              this.tokenProvider.clearToken(token);
              this.subscribe();
            } else {
              this.state = new InactiveState(this.logger);
              existingListeners.onError(error);
            }
          }
        });
      })
      .catch((error: any) => {
        this.logger.debug(`TokenProvidingSubscription: error when fetching token: ${error}`);
        this.state = new InactiveState(this.logger);
      });
  }

  private isTokenExpiredError(error: any): boolean {
    return (
      error instanceof ErrorResponse &&
      error.statusCode === 401 &&
      error.info === "authentication/expired"
    );
  }
}

class ActiveState implements TokenProvidingSubscriptionState {
  private underlyingSubscription: Subscription;

  constructor(
    private logger: Logger,
    private headers: ElementsHeaders,
    private nextSubscribeStrategy: SubscribeStrategy
  ) {
    logger.verbose(`TokenProvidingSubscription: transitioning to TokenProvidingState`);
  }

  subscribe(token: string, listeners: SubscribeStrategyListeners): void {
    this.putTokenIntoHeader(token);
    this.underlyingSubscription = this.nextSubscribeStrategy(
      {
        onOpen: headers => {
          this.logger.verbose(`TokenProvidingSubscription: subscription opened`);
          listeners.onOpen(headers);
        },
        onRetrying: listeners.onRetrying,
        onError: error => {
          this.logger.verbose(`TokenProvidingSubscription: subscription errored: ${error}`);
          listeners.onError(error);
        },
        onEvent: listeners.onEvent,
        onEnd: error => {
          this.logger.verbose(`TokenProvidingSubscription: subscription ended`);
          listeners.onEnd(error);
        }
      },
      this.headers
    )
  }

  unsubscribe() {
    this.underlyingSubscription.unsubscribe();
  }

  private putTokenIntoHeader(token: string) {
    this.headers['Authorization'] = `Bearer ${token}`;
    this.logger.verbose(`TokenProvidingSubscription: token fetched: ${token}`);
  }
}

class InactiveState implements TokenProvidingSubscriptionState {

  constructor(private logger: Logger){
    logger.verbose(`TokenProvidingSubscription: transitioning to OpenTokenProvidingSubscriptionState`);
  }

  subscribe(token: string, listeners: SubscribeStrategyListeners): void {
    this.logger.verbose("TokenProvidingSubscription: subscribe called in Inactive state; doing nothing");
  }

  unsubscribe(): void {
    this.logger.verbose("TokenProvidingSubscription: unsubscribe called in Inactive state; doing nothing");
  }

}
