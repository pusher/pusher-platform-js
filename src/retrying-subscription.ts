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
  return (listeners, headers) =>
    new RetryingSubscription(
      logger,
      headers,
      listeners,
      nextSubscribeStrategy,
      retryResolution,
    );
};

class RetryingSubscription implements Subscription {
  private state: SubscriptionState;

  constructor(
    logger: Logger,
    headers: ElementsHeaders,
    listeners: SubscribeStrategyListeners,
    nextSubscribeStrategy: SubscribeStrategy,
    retryResolution: RetryResolution,
  ) {
    this.state = new OpeningSubscriptionState(
      this.onTransition,
      logger,
      headers,
      listeners,
      nextSubscribeStrategy,
      retryResolution,
    );
  }

  unsubscribe = () => {
    this.state.unsubscribe();
  };

  private onTransition = (newState: SubscriptionState) => {
    this.state = newState;
  };
}

class OpeningSubscriptionState implements SubscriptionState {
  private underlyingSubscription: Subscription;

  constructor(
    onTransition: (newState: SubscriptionState) => void,
    private logger: Logger,
    private headers: ElementsHeaders,
    private listeners: SubscribeStrategyListeners,
    private nextSubscribeStrategy: SubscribeStrategy,
    private retryResolution: RetryResolution,
  ) {
    logger.verbose(
      `RetryingSubscription: transitioning to OpeningSubscriptionState`,
    );

    this.underlyingSubscription = nextSubscribeStrategy(
      {
        onEnd: error =>
          onTransition(new EndedSubscriptionState(logger, listeners, error)),
        onError: error =>
          onTransition(
            new RetryingSubscriptionState(
              error,
              onTransition,
              logger,
              headers,
              listeners,
              nextSubscribeStrategy,
              retryResolution,
            ),
          ),
        onEvent: listeners.onEvent,
        onOpen: subHeaders =>
          onTransition(
            new OpenSubscriptionState(
              logger,
              listeners,
              subHeaders,
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
    private logger: Logger,
    private headers: ElementsHeaders,
    private listeners: SubscribeStrategyListeners,
    private nextSubscribeStrategy: SubscribeStrategy,
    private retryResolution: RetryResolution,
  ) {
    logger.verbose(
      `RetryingSubscription: transitioning to RetryingSubscriptionState`,
    );

    const executeSubscriptionOnce = (subError: any) => {
      listeners.onRetrying();

      const resolveError: (
        errToResolve: any,
      ) => RetryStrategyResult = errToResolve => {
        if (errToResolve instanceof ErrorResponse) {
          errToResolve.headers['Request-Method'] = 'SUBSCRIBE';
        }
        return retryResolution.attemptRetry(errToResolve);
      };

      const errorResolution = resolveError(subError);
      if (errorResolution instanceof Retry) {
        this.timeout = global.setTimeout(() => {
          executeNextSubscribeStrategy();
        }, errorResolution.waitTimeMillis);
      } else {
        onTransition(new FailedSubscriptionState(logger, listeners, subError));
      }
    };

    const executeNextSubscribeStrategy = () => {
      logger.verbose(
        `RetryingSubscription: trying to re-establish the subscription`,
      );

      const underlyingSubscription = nextSubscribeStrategy(
        {
          onEnd: endError =>
            onTransition(
              new EndedSubscriptionState(logger, listeners, endError),
            ),
          onError: subError => executeSubscriptionOnce(subError),
          onEvent: listeners.onEvent,
          onOpen: openHeaders => {
            onTransition(
              new OpenSubscriptionState(
                logger,
                listeners,
                openHeaders,
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
    this.onTransition(new EndedSubscriptionState(this.logger, this.listeners));
  }
}

class OpenSubscriptionState implements SubscriptionState {
  constructor(
    private logger: Logger,
    private listeners: SubscribeStrategyListeners,
    private headers: ElementsHeaders,
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
    this.onTransition(new EndedSubscriptionState(this.logger, this.listeners));
  }
}

class EndedSubscriptionState implements SubscriptionState {
  constructor(
    private logger: Logger,
    private listeners: SubscribeStrategyListeners,
    error?: any,
  ) {
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
  constructor(
    private logger: Logger,
    private listeners: SubscribeStrategyListeners,
    error?: any,
  ) {
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
