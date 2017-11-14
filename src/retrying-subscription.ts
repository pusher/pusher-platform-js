import { Logger } from './logger';
import { ElementsHeaders, ErrorResponse } from './network';
import {
  createRetryStrategyOptionsOrDefault,
  Retry,
  RetryResolution,
  RetryStrategyOptions,
  RetryStrategyResult,
} from './retry-strategy';
import {
  SubscribeStrategy,
  SubscribeStrategyListeners,
} from './subscribe-strategy';
import {
  Subscription,
  SubscriptionEvent,
  SubscriptionState,
} from './subscription';

export let createRetryingStrategy: (
  retryingOptions: RetryStrategyOptions,
  nextSubscribeStrategy: SubscribeStrategy,
  logger: Logger,
) => SubscribeStrategy = (
  retryOptions,
  nextSubscribeStrategy,
  logger,
): SubscribeStrategy => {
  const enrichedRetryOptions = createRetryStrategyOptionsOrDefault(
    retryOptions,
  );
  const retryResolution = new RetryResolution(enrichedRetryOptions, logger);

  class RetryingSubscription implements Subscription {
    private state: SubscriptionState;

    constructor(
      listeners: SubscribeStrategyListeners,
      headers: ElementsHeaders,
    ) {
      class OpeningSubscriptionState implements SubscriptionState {
        private underlyingSubscription: Subscription;

        constructor(onTransition: (newState: SubscriptionState) => void) {
          logger.verbose(
            `RetryingSubscription: transitioning to OpeningSubscriptionState`,
          );

          this.underlyingSubscription = nextSubscribeStrategy(
            {
              onEnd: error => onTransition(new EndedSubscriptionState(error)),
              onError: error =>
                onTransition(
                  new RetryingSubscriptionState(error, onTransition),
                ),
              onEvent: listeners.onEvent,
              onOpen: headers =>
                onTransition(
                  new OpenSubscriptionState(
                    headers,
                    this.underlyingSubscription,
                    onTransition,
                  ),
                ),
              onRetrying: listeners.onRetrying,
            },
            headers,
          );
        }

        unsubscribe() {
          this.underlyingSubscription.unsubscribe();
          throw new Error('Method not implemented.');
        }
      }

      class RetryingSubscriptionState implements SubscriptionState {
        private timeout: number;

        constructor(
          error: any,
          private onTransition: (newState: SubscriptionState) => void,
        ) {
          logger.verbose(
            `RetryingSubscription: transitioning to RetryingSubscriptionState`,
          );

          const executeSubscriptionOnce = (error: any) => {
            listeners.onRetrying();

            const resolveError: (error: any) => RetryStrategyResult = error => {
              if (error instanceof ErrorResponse) {
                error.headers['Request-Method'] = 'SUBSCRIBE';
              }
              return retryResolution.attemptRetry(error);
            };

            const errorResolution = resolveError(error);
            if (errorResolution instanceof Retry) {
              this.timeout = global.setTimeout(() => {
                executeNextSubscribeStrategy();
              }, errorResolution.waitTimeMillis);
            } else {
              onTransition(new FailedSubscriptionState(error));
            }
          };

          const executeNextSubscribeStrategy = () => {
            logger.verbose(
              `RetryingSubscription: trying to re-establish the subscription`,
            );

            const underlyingSubscription = nextSubscribeStrategy(
              {
                onEnd: error => onTransition(new EndedSubscriptionState(error)),
                onError: error => executeSubscriptionOnce(error),
                onEvent: listeners.onEvent,
                onOpen: headers => {
                  onTransition(
                    new OpenSubscriptionState(
                      headers,
                      underlyingSubscription,
                      onTransition,
                    ),
                  );
                },
                onRetrying: listeners.onRetrying,
              },
              headers,
            );
          };

          executeSubscriptionOnce(error);
        }

        unsubscribe() {
          global.clearTimeout(this.timeout);
          this.onTransition(new EndedSubscriptionState());
        }
      }

      class OpenSubscriptionState implements SubscriptionState {
        constructor(
          headers: ElementsHeaders,
          private underlyingSubscription: Subscription,
          private onTransition: (newState: SubscriptionState) => void,
        ) {
          logger.verbose(
            `RetryingSubscription: transitioning to OpenSubscriptionState`,
          );
          listeners.onOpen(headers);
        }
        unsubscribe() {
          this.underlyingSubscription.unsubscribe();
          this.onTransition(new EndedSubscriptionState());
        }
      }

      class EndedSubscriptionState implements SubscriptionState {
        constructor(error?: any) {
          logger.verbose(
            `RetryingSubscription: transitioning to EndedSubscriptionState`,
          );
          listeners.onEnd(error);
        }
        unsubscribe() {
          throw new Error('Subscription has already ended');
        }
      }

      class FailedSubscriptionState implements SubscriptionState {
        constructor(error: any) {
          logger.verbose(
            `RetryingSubscription: transitioning to FailedSubscriptionState`,
            error,
          );
          listeners.onError(error);
        }
        unsubscribe() {
          throw new Error('Subscription has already ended');
        }
      }

      this.state = new OpeningSubscriptionState(this.onTransition);
    }

    unsubscribe = () => {
      this.state.unsubscribe();
    };

    private onTransition = (newState: SubscriptionState) => {
      this.state = newState;
    };
  }

  return (listeners, headers) => new RetryingSubscription(listeners, headers);
};
