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
  const completeRetryOptions = createRetryStrategyOptionsOrDefault(
    retryOptions,
  );
  const retryResolution = new RetryResolution(completeRetryOptions, logger);

  // All the magic in the world.
  return (listeners, headers) =>
    new ResumingSubscription(
      logger,
      headers,
      nextSubscribeStrategy,
      listeners,
      retryResolution,
    );
};

class ResumingSubscription implements Subscription {
  private state: SubscriptionState;

  constructor(
    logger: Logger,
    headers: ElementsHeaders,
    nextSubscribeStrategy: SubscribeStrategy,
    listeners: SubscribeStrategyListeners,
    retryResolution: RetryResolution,
  ) {
    // Here we init the state transition shenaningans
    this.state = new OpeningSubscriptionState(
      this.onTransition,
      logger,
      headers,
      nextSubscribeStrategy,
      listeners,
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
    private onTransition: (newState: SubscriptionState) => void,
    private logger: Logger,
    private headers: ElementsHeaders,
    private nextSubscribeStrategy: SubscribeStrategy,
    private listeners: SubscribeStrategyListeners,
    private retryResolution: RetryResolution,
    private initialEventId?: string,
  ) {
    let lastEventId = initialEventId;
    logger.verbose(
      `ResumingSubscription: transitioning to OpeningSubscriptionState`,
    );

    if (lastEventId) {
      headers['Last-Event-Id'] = lastEventId;
      logger.verbose(`ResumingSubscription: initialEventId is ${lastEventId}`);
    }

    this.underlyingSubscription = nextSubscribeStrategy(
      {
        onEnd: error => {
          onTransition(new EndedSubscriptionState(logger, listeners, error));
        },
        onError: error => {
          onTransition(
            new ResumingSubscriptionState(
              error,
              onTransition,
              logger,
              headers,
              listeners,
              nextSubscribeStrategy,
              retryResolution,
              lastEventId,
            ),
          );
        },
        onEvent: event => {
          lastEventId = event.eventId;
          listeners.onEvent(event);
        },
        onOpen: subHeaders => {
          onTransition(
            new OpenSubscriptionState(
              logger,
              subHeaders,
              listeners,
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
    this.onTransition(new EndingSubscriptionState(this.logger));
    this.underlyingSubscription.unsubscribe();
  }
}

class OpenSubscriptionState implements SubscriptionState {
  constructor(
    private logger: Logger,
    private headers: ElementsHeaders,
    private listeners: SubscribeStrategyListeners,
    private underlyingSubscription: Subscription,
    private onTransition: (state: SubscriptionState) => void,
  ) {
    logger.verbose(
      `ResumingSubscription: transitioning to OpenSubscriptionState`,
    );
    listeners.onOpen(headers);
  }

  unsubscribe() {
    this.onTransition(new EndingSubscriptionState(this.logger));
    this.underlyingSubscription.unsubscribe();
  }
}

class ResumingSubscriptionState implements SubscriptionState {
  private timeout: number;
  private underlyingSubscription: Subscription;

  constructor(
    error: any,
    private onTransition: (newState: SubscriptionState) => void,
    private logger: Logger,
    private headers: ElementsHeaders,
    private listeners: SubscribeStrategyListeners,
    private nextSubscribeStrategy: SubscribeStrategy,
    private retryResolution: RetryResolution,
    lastEventId?: string,
  ) {
    logger.verbose(
      `ResumingSubscription: transitioning to ResumingSubscriptionState`,
    );

    const executeSubscriptionOnce = (
      subError: any,
      subLastEventId?: string,
    ) => {
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
          executeNextSubscribeStrategy(subLastEventId);
        }, errorResolution.waitTimeMillis);
      } else {
        onTransition(new FailedSubscriptionState(logger, listeners, subError));
      }
    };

    const executeNextSubscribeStrategy = (subLastEventId?: string) => {
      logger.verbose(
        `ResumingSubscription: trying to re-establish the subscription`,
      );
      if (subLastEventId) {
        logger.verbose(`ResumingSubscription: lastEventId: ${subLastEventId}`);
        headers['Last-Event-Id'] = subLastEventId;
      }

      this.underlyingSubscription = nextSubscribeStrategy(
        {
          onEnd: endError => {
            onTransition(
              new EndedSubscriptionState(logger, listeners, endError),
            );
          },
          onError: subError => {
            executeSubscriptionOnce(subError, lastEventId);
          },
          onEvent: event => {
            lastEventId = event.eventId;
            listeners.onEvent(event);
          },
          onOpen: openHeaders => {
            onTransition(
              new OpenSubscriptionState(
                logger,
                openHeaders,
                listeners,
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
    this.onTransition(new EndingSubscriptionState(this.logger));
    global.clearTimeout(this.timeout);
    this.underlyingSubscription.unsubscribe();
  }
}

class EndingSubscriptionState implements SubscriptionState {
  constructor(private logger: Logger, error?: any) {
    logger.verbose(
      `ResumingSubscription: transitioning to EndingSubscriptionState`,
    );
  }
  unsubscribe() {
    throw new Error('Subscription is already ending');
  }
}

class EndedSubscriptionState implements SubscriptionState {
  constructor(
    private logger: Logger,
    private listeners: SubscribeStrategyListeners,
    error?: any,
  ) {
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
  constructor(
    private logger: Logger,
    private listeners: SubscribeStrategyListeners,
    error?: any,
  ) {
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
