import { Logger } from './logger';
import { ErrorResponse, NetworkError } from './network';

export interface RetryStrategyOptions {
  increaseTimeout?: (currentTimeout: number) => number;
  initialTimeoutMillis?: number;
  limit?: number;
  maxTimeoutMillis?: number;
}

export interface CompleteRetryStrategyOptions {
  increaseTimeout: (currentTimeout: number) => number;
  initialTimeoutMillis: number;
  limit: number;
  maxTimeoutMillis: number;
}

export let createRetryStrategyOptionsOrDefault: (
  options: RetryStrategyOptions,
) => CompleteRetryStrategyOptions = (options: RetryStrategyOptions) => {
  const initialTimeoutMillis = options.initialTimeoutMillis || 1000;
  const maxTimeoutMillis = options.maxTimeoutMillis || 5000;

  let limit = -1;
  if (options.limit !== undefined && options.limit != null) {
    limit = options.limit;
  }

  let increaseTimeout: (currentTimeout: number) => number;

  if (options.increaseTimeout !== undefined) {
    increaseTimeout = options.increaseTimeout;
  } else {
    increaseTimeout = currentTimeout => {
      if (currentTimeout * 2 > maxTimeoutMillis) {
        return maxTimeoutMillis;
      } else {
        return currentTimeout * 2;
      }
    };
  }

  return {
    increaseTimeout,
    initialTimeoutMillis,
    limit,
    maxTimeoutMillis,
  };
};

/* tslint:disable-next-line:no-empty-interface */
export interface RetryStrategyResult {}

export class Retry implements RetryStrategyResult {
  waitTimeMillis: number;

  constructor(waitTimeMillis: number) {
    this.waitTimeMillis = waitTimeMillis;
  }
}

export class DoNotRetry implements RetryStrategyResult {
  error: Error;
  constructor(error: Error) {
    this.error = error;
  }
}

const requestMethodIsSafe: (method: string) => boolean = method => {
  method = method.toUpperCase();
  return (
    method === 'GET' ||
    method === 'HEAD' ||
    method === 'OPTIONS' ||
    method === 'SUBSCRIBE'
  );
};

export class RetryResolution {
  private initialTimeoutMillis: number;
  private maxTimeoutMillis: number;
  private limit: number;
  private increaseTimeoutFunction: (currentTimeout: number) => number;

  private currentRetryCount = 0;
  private currentBackoffMillis: number;

  constructor(
    private options: CompleteRetryStrategyOptions,
    private logger: Logger,
    private retryUnsafeRequests?: boolean,
  ) {
    this.initialTimeoutMillis = options.initialTimeoutMillis;
    this.maxTimeoutMillis = options.maxTimeoutMillis;
    this.limit = options.limit;
    this.increaseTimeoutFunction = options.increaseTimeout;
    this.currentBackoffMillis = this.initialTimeoutMillis;
  }

  attemptRetry(error: any): RetryStrategyResult {
    this.logger.verbose(`${this.constructor.name}: Error received`, error);

    if (this.currentRetryCount >= this.limit && this.limit >= 0) {
      this.logger.verbose(
        `${this.constructor.name}: Retry count is over the maximum limit: ${
          this.limit
        }`,
      );
      return new DoNotRetry(error);
    }

    if (error instanceof ErrorResponse && error.headers['Retry-After']) {
      this.logger.verbose(
        `${this.constructor.name}: Retry-After header is present, retrying in ${
          error.headers['Retry-After']
        }`,
      );
      return new Retry(parseInt(error.headers['Retry-After'], 10) * 1000);
    }

    if (
      error instanceof NetworkError ||
      (error instanceof ErrorResponse &&
        requestMethodIsSafe(error.headers['Request-Method'])) ||
      this.retryUnsafeRequests
    ) {
      return this.shouldSafeRetry(error);
    }
    if (error instanceof NetworkError) {
      return this.shouldSafeRetry(error);
    }

    this.logger.verbose(
      `${this.constructor.name}: Error is not retryable`,
      error,
    );
    return new DoNotRetry(error);
  }

  private shouldSafeRetry(error: any) {
    if (error instanceof NetworkError) {
      this.logger.verbose(
        `${this.constructor.name}: It's a Network Error, will retry`,
        error,
      );
      return new Retry(this.calulateMillisToRetry());
    } else if (error instanceof ErrorResponse) {
      if (error.statusCode >= 500 && error.statusCode < 600) {
        this.logger.verbose(`${this.constructor.name}: Error 5xx, will retry`);
        return new Retry(this.calulateMillisToRetry());
      }
    }
    this.logger.verbose(
      `${this.constructor.name}: Error is not retryable`,
      error,
    );
    return new DoNotRetry(error);
  }

  private calulateMillisToRetry(): number {
    this.currentBackoffMillis = this.increaseTimeoutFunction(
      this.currentBackoffMillis,
    );

    this.logger.verbose(
      `${this.constructor.name}: Retrying in ${this.currentBackoffMillis}ms`,
    );
    return this.currentBackoffMillis;
  }
}
