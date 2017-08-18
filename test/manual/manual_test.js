let instance = new PusherPlatform.Instance({
    instanceId: CONSTANTS.instanceId,
    serviceName: 'feeds',
    serviceVersion: 'v1',
    logger: new PusherPlatform.ConsoleLogger(1) //Verbose logger
});

//This setup is prone to error.
let myRetryStrategy = new PusherPlatform.ExponentialBackoffRetryStrategy({
    limit: 10
});

let resumableSubscribeOptions = {
    path: 'feeds/my-feed/items',
    retryStrategy: myRetryStrategy,
    initialEventId: "347720",
    listeners: {
       onSubscribed: headers => console.log("onSubscribed " + headers),
       onOpen: () => console.log("onOpen"),
       onResuming: () => console.log("onResuming"),
       onEvent: event => console.log(event),
       onEnd: error => console.log("onEnd " + error),
       onError: error => console.log("onError " + error),
    },
}

let newResumableSubscription = instance.resumableSubscribe(resumableSubscribeOptions);