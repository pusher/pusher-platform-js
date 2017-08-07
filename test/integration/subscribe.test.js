const { default: PusherPlatform } = require('../../target/pusher-platform.js');
    
const PATH_10_AND_EOS = "subscribe10";
const PATH_3_AND_OPEN = "subscribe_3_continuous";
const PATH_0_EOS = "subscribe_0_eos";

describe('Instance Subscribe', () => {
    beforeEach(() => {

        instance = new PusherPlatform.Instance({
            instance: "v1:api-ceres:1",
            serviceName: "platform_lib_tester",
            serviceVersion: "v1",
            host: "localhost:10443"
        });

        eventCount = 0;
        endCount = 0;
        errorCount = 0;
        errorThrown = false;
    });

    //TODO: use spies and expect methods to be called

    it('subscribes and terminates on EOS after receiving all events', (done) => {
        instance.subscribe({
            path: PATH_10_AND_EOS,
            onEvent: (event) => {
                eventCount += 1;
            },
            onEnd: () => {
                expect(eventCount).toBe(10);
                done();
            },
            onError: (err) => {
                fail();
            }
        });
    });

    it('subscribes, terminates on EOS, and triggers onEnd callback exactly once', (done) => {
        instance.subscribe({
            path: PATH_10_AND_EOS,
            onEvent: (event) => {},
            onEnd: () => {
                endCount += 1;
                expect(endCount).toBe(1);
                done();
            },
            onError: (err) => {
                fail();
            }
        });
    });

    it('subscribes to a subscription that is kept open', (done) => {        
        let sub = instance.subscribe({
            path: PATH_3_AND_OPEN,
            onEvent: (event) => {
                eventCount += 1;                
                if(eventCount > 3){
                    fail(`Too many events received: ${eventCount}`);
                }
                if(eventCount == 3){
                    done();
                }
            },
            onEnd: () => {
                fail("onEnd triggered. This shouldn't be!");
            },
            onError: (err) => {
                fail("onError triggered - this shouldn't be!");
            }
        });

    });

    it('subscribes and then unsubscribes - expecting onEnd', (done) => {
        let sub = instance.subscribe({
            path: PATH_3_AND_OPEN,
            onEvent: (event) => {
                eventCount += 1;                
                if(eventCount > 3){
                    fail(`Too many events received: ${eventCount}`);
                }
                if(eventCount == 3){
                    sub.unsubscribe();
                }
            },
            onEnd: () => {
                done();
            },
            onError: (err) => {
                fail("onError triggered - this shouldn't be!");
            }
        });

    });

    it('subscribes and receives EOS immediately - expecting onEnd with no events', (done) => {
         let sub = instance.subscribe({
            path: PATH_0_EOS,
            onEvent: (event) => {
                fail("No events should have been received");
            },
            onEnd: () => {
                done();
            },
            onError: (err) => {
                fail("We should not error");
            }
        });
    });

//TODO: this should probably involve the retry strategy
    it('subsccribes and receives EOS with retry-after headers', (done) => {
        let sub = instance.subscribe({
            path: "subscribe_retry_after",
            onEvent: (event) => {
                fail("No events should have been received");
            },
            onEnd: () => {
                fail("We should get an error");
                done();
            },
            onError: (err) => {
                expect(err.headers["retry-after"]).toBe('10');
                done();
            }
        });
    })
});


