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
  SubscriptionConstructor,
  SubscriptionEvent,
  SubscriptionState,
} from './subscription';

export let createResumingStrategy: (
  retryingOptions: RetryStrategyOptions,
  nextSubscribeStrategy: SubscribeStrategy,
  logger: Logger,
  initialEventId?: string,
) => SubscribeStrategy = (
  retryOptions,
  nextSubscribeStrategy,
  logger,
  initialEventId,
) => {
  retryOptions = createRetryStrategyOptionsOrDefault(retryOptions);
  const retryResolution = new RetryResolution(retryOptions, logger);

  class ResumingSubscription implements Subscription {
    private state: SubscriptionState;

    constructor(
      listeners: SubscribeStrategyListeners,
      headers: ElementsHeaders,
    ) {
      class OpeningSubscriptionState implements SubscriptionState {
        private underlyingSubscription: Subscription;

        constructor(private onTransition: (newState) => void) {
          let lastEventId = initialEventId;
          logger.verbose(
            `ResumingSubscription: transitioning to OpeningSubscriptionState`,
          );

          if (lastEventId) {
            headers['Last-Event-Id'] = lastEventId;
            logger.verbose(
              `ResumingSubscription: initialEventId is ${lastEventId}`,
            );
          }

          this.underlyingSubscription = nextSubscribeStrategy(
            {
              onEnd: error => {
                onTransition(new EndedSubscriptionState(error));
              },
              onError: error => {
                onTransition(
                  new ResumingSubscriptionState(
                    error,
                    lastEventId,
                    onTransition,
                  ),
                );
              },
              onEvent: event => {
                lastEventId = event.eventId;
                listeners.onEvent(event);
              },
              onOpen: headers => {
                onTransition(
                  new OpenSubscriptionState(
                    headers,
                    this.underlyingSubscription,
                    onTransition,
                  ),
                );
              },
              onRetrying: listeners.onRetrying,
            },
            headers,
          );
        }
        unsubscribe() {
          this.onTransition(new EndingSubscriptionState());
          this.underlyingSubscription.unsubscribe();
        }
      }

      class OpenSubscriptionState implements SubscriptionState {
        constructor(
          headers: ElementsHeaders,
          private underlyingSubscription: Subscription,
          private onTransition: (state: SubscriptionState) => void,
        ) {
          logger.verbose(
            `ResumingSubscription: transitioning to OpenSubscriptionState`,
          );
          listeners.onOpen(headers);
        }

        unsubscribe() {
          this.onTransition(new EndingSubscriptionState());
          this.underlyingSubscription.unsubscribe();
        }
      }

      class ResumingSubscriptionState implements SubscriptionState {
        private timeout: number;
        private underlyingSubscription: Subscription;

        constructor(
          error: any,
          lastEventId: string,
          private onTransition: (newState: SubscriptionState) => void,
        ) {
          logger.verbose(
            `ResumingSubscription: transitioning to ResumingSubscriptionState`,
          );

          const executeSubscriptionOnce = (error: any, lastEventId: string) => {
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
                executeNextSubscribeStrategy(lastEventId);
              }, errorResolution.waitTimeMillis);
            } else {
              onTransition(new FailedSubscriptionState(error));
            }
          };

          const executeNextSubscribeStrategy = (lastEventId: string) => {
            logger.verbose(
              `ResumingSubscription: trying to re-establish the subscription`,
            );
            if (lastEventId) {
              logger.verbose(
                `ResumingSubscription: lastEventId: ${lastEventId}`,
              );
              headers['Last-Event-Id'] = lastEventId;
            }

            this.underlyingSubscription = nextSubscribeStrategy(
              {
                onEnd: error => {
                  onTransition(new EndedSubscriptionState(error));
                },
                onError: error => {
                  executeSubscriptionOnce(error, lastEventId);
                },
                onEvent: event => {
                  lastEventId = event.eventId;
                  listeners.onEvent(event);
                },
                onOpen: headers => {
                  onTransition(
                    new OpenSubscriptionState(
                      headers,
                      this.underlyingSubscription,
                      onTransition,
                    ),
                  );
                },
                onRetrying: listeners.onRetrying,
              },
              headers,
            );
          };
          executeSubscriptionOnce(error, lastEventId);
        }

        unsubscribe() {
          this.onTransition(new EndingSubscriptionState());
          global.clearTimeout(this.timeout);
          this.underlyingSubscription.unsubscribe();
        }
      }

      class EndingSubscriptionState implements SubscriptionState {
        constructor(error?: any) {
          logger.verbose(
            `ResumingSubscription: transitioning to EndingSubscriptionState`,
          );
        }
        unsubscribe() {
          throw new Error('Subscription is already ending');
        }
      }

      class EndedSubscriptionState implements SubscriptionState {
        constructor(error?: any) {
          logger.verbose(
            `ResumingSubscription: transitioning to EndedSubscriptionState`,
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
            `ResumingSubscription: transitioning to FailedSubscriptionState`,
            error,
          );
          listeners.onError(error);
        }
        unsubscribe() {
          throw new Error('Subscription has already ended');
        }
      }

      // Here we init the state transition shenaningans
      this.state = new OpeningSubscriptionState(this.onTransition);
    }

    unsubscribe = () => {
      this.state.unsubscribe();
    };

    private onTransition = (newState: SubscriptionState) => {
      this.state = newState;
    };
  }

  // All the magic in the world.
  return (listeners, headers) => new ResumingSubscription(listeners, headers);
};
