const { default: PusherPlatform } = require('../../target/pusher-platform.js');
    
const PATH_NOT_EXISTING = "subscribe_missing";
const PATH_FORBIDDEN = "subscribe_forbidden";

let logger = new PusherPlatform.ConsoleLogger(1);

let noRetryStrategy = new PusherPlatform.ExponentialBackoffRetryStrategy({
    limit: 0,
    logger: logger
})

describe('Instance Subscribe errors nicely', () => {

    beforeAll(() => {
        instance = new PusherPlatform.Instance({
            instanceId: "v1:api-ceres:1",
            serviceName: "platform_lib_tester",
            serviceVersion: "v1",
            host: "localhost:10443",
            logger: logger
        });
    })

    it('handles 404', (done) => {
        instance.subscribe({
            path: PATH_NOT_EXISTING,
            retryStrategy: noRetryStrategy,
            listeners: {
                onSubscribed: headers => {},
                onOpen: () => {},
                onEvent: (event) => {
                    fail("Expecting onError");
                },
                onEnd: () => {
                    fail("Expecting onError");
                },
                onError: (err) => {
                    expect(err.statusCode).toBe(404);
                    done();
                },
            }
        });
    });

    it('handles 403', (done) => {
        instance.subscribe({
            path: PATH_FORBIDDEN,
            retryStrategy: noRetryStrategy,
            listeners: {
                onSubscribed: headers => {},
                onOpen: () => {},
                onEvent: (event) => {
                    fail("Expecting onError");
                },
                onEnd: () => {
                    fail("Expecting onError");
                },
                onError: (err) => {
    
                    expect(err.statusCode).toBe(403);
                    done();
                },
            }
        });
    });

    it('handles 500', (done) => {
        instance.subscribe({
            path: "subscribe_internal_server_error",
            retryStrategy: noRetryStrategy,
            listeners: {
                onSubscribed: headers => {
                    console.log("sub");
                    
                },
                onOpen: () => {

                    console.log("open");
                    
                },
                onEvent: (event) => {
                    console.log(event);
                    
                    fail("Expecting onError");
                },
                onEnd: () => {
                    console.log("end");                    
                    fail("Expecting onError");
                },
                onError: (err) => {
                    console.log(err);
                    expect(err.statusCode).toBe(500);
                    done();
                },
            }
        });
    });

    //Not going to work unless the service supports it
    // it('tries to resumable subscribe to a subscription that doesnt support resuming', (done) => {
    //     instance.resumableSubscribe({
    //         path: "services/platform_lib_tester/v1/subscribe_try_resuming",
    //         lastEventId: "1234",
    //         onEvent: (event) => {
                
    //             fail("Expecting onError");
    //         },
    //         onEnd: () => {
    //             fail("Expecting onError");
    //         },
    //         onError: (err) => {

    //             expect(err.statusCode).toBe(403);
    //             done();
    //         }
    //     })
    // });


});
