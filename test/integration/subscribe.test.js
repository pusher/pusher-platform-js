const {
  default: PusherPlatform,
} = require('../../dist/web/pusher-platform.js');

const PATH_10_AND_EOS = 'subscribe10';
const PATH_3_AND_OPEN = 'subscribe_3_continuous';
const PATH_0_EOS = 'subscribe_0_eos';

describe('Instance Subscribe', () => {
  beforeEach(() => {
    let logger = new PusherPlatform.ConsoleLogger(1);

    instance = new PusherPlatform.Instance({
      locator: 'v1:api-ceres:test',
      serviceName: 'platform_sdk_tester',
      serviceVersion: 'v1',
      host: 'localhost:10443',
      logger: logger,
    });

    neverRetryOptions = {
      limit: 0,
    };

    eventCount = 0;
    endCount = 0;
    errorCount = 0;
    errorThrown = false;
  });

  it('subscribes and terminates on EOS after receiving all events', done => {
    instance.subscribeNonResuming({
      path: PATH_10_AND_EOS,
      retryStrategyOptions: neverRetryOptions,
      listeners: {
        onOpen: headers => {},
        onEvent: event => {
          eventCount += 1;
        },
        onRetrying: () => console.log('onRetrying'),
        onEnd: () => {
          expect(eventCount).toBe(10);
          done();
        },
        onError: err => {
          fail();
        },
      },
    });
  });

  it('subscribes, terminates on EOS, and triggers onEnd callback exactly once', done => {
    instance.subscribeNonResuming({
      path: PATH_10_AND_EOS,
      retryStrategyOptions: neverRetryOptions,
      listeners: {
        onOpen: headers => {},
        onEvent: event => {},
        onEnd: () => {
          endCount += 1;
          expect(endCount).toBe(1);
          done();
        },
        onError: err => {
          fail();
        },
      },
    });
  });

  it('subscribes to a subscription that is kept open', done => {
    let sub = instance.subscribeNonResuming({
      path: PATH_3_AND_OPEN,
      retryStrategyOptions: neverRetryOptions,
      listeners: {
        onOpen: headers => {},
        onEvent: event => {
          eventCount += 1;
          if (eventCount > 3) {
            fail(`Too many events received: ${eventCount}`);
          }
          if (eventCount == 3) {
            done();
          }
        },
        onEnd: () => {
          fail("onEnd triggered. This shouldn't be!");
        },
        onError: err => {
          fail("onError triggered - this shouldn't be!");
        },
      },
    });
  });

  it('subscribes and then unsubscribes - expecting onEnd', done => {
    let sub = instance.subscribeNonResuming({
      path: PATH_3_AND_OPEN,
      retryStrategyOptions: neverRetryOptions,
      listeners: {
        onOpen: headers => {},
        onEvent: event => {
          eventCount += 1;
          if (eventCount > 3) {
            fail(`Too many events received: ${eventCount}`);
          }
          if (eventCount == 3) {
            sub.unsubscribe();
          }
        },
        onEnd: () => {
          done();
        },
        onError: err => {
          fail("onError triggered - this shouldn't be!");
        },
      },
    });
  });

  it('subscribes and receives EOS immediately - expecting onEnd with no events', done => {
    let sub = instance.subscribeNonResuming({
      path: PATH_0_EOS,
      retryStrategyOptions: neverRetryOptions,
      listeners: {
        onOpen: headers => {},
        onEvent: event => {
          fail('No events should have been received');
        },
        onEnd: () => {
          done();
        },
        onError: err => {
          fail('We should not error');
        },
      },
    });
  });

  it('subsccribes and receives EOS with retry-after headers', done => {
    let sub = instance.subscribeNonResuming({
      path: 'subscribe_retry_after',
      retryStrategyOptions: neverRetryOptions,
      listeners: {
        onOpen: headers => {},
        onEvent: event => {
          fail('No events should have been received');
        },
        onEnd: () => {
          fail('We should get an error');
          done();
        },
        onError: err => {
          expect(err.headers['Retry-After']).toBe('10');
          done();
        },
      },
    });
  });
});
