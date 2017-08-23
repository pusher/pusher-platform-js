let verboseLogger = new PusherPlatform.ConsoleLogger(1) //Verbose logger 

let instance = new PusherPlatform.Instance({
    instanceId: CONSTANTS.instanceId,
    serviceName: 'feeds',
    serviceVersion: 'v1',
    logger: verboseLogger
});

//This setup is prone to error.
//TODO: we probably need to clear up this
let myRetryStrategy = new PusherPlatform.ExponentialBackoffRetryStrategy({
    limit: 10,
    logger: verboseLogger
});

let resumableSubscribeOptions = {
    path: 'feeds/my-feed/items',
    retryStrategy: myRetryStrategy,
    listeners: {
        onOpen: headers => {
            console.log("onSubscribed headers:");
            console.log(headers);
        },
        onConnected: () => console.log("onConnected"),
        onResuming: () => console.log("onResuming"),
        onEvent: event => console.log(event),
        onEnd: error => console.log("onEnd " + error),
        onError: error => console.log("onError " + error),
    },
}

let requestOptions = {  
    method: "GET",
    path: "feeds/my-feed/items",
    retryStrategy: myRetryStrategy
}

let postRequestOptions = {
    method: "POST",
    path: "feeds/my-feed/items",
    body: { items: [ {name: "kekec"}]},
    retryStrategy: myRetryStrategy,
}

let nonResumableSubscribeOptions = {
    path: 'feeds/my-feed/items',
    retryStrategy: myRetryStrategy,
    listeners: {
        onOpen: headers => {
            console.log("0 onOpen headers:");
            console.log(headers);
        },
        onConnected: () => console.log("2 onConnected"),
        onRetrying: () => console.log("1 onRetrying"),
        onEvent: event => console.log(event),
        onEnd: error => console.log("3 onEnd " + error),
        onError: error => console.log("4 onError " + error),
     },
}

// instance.request(postRequestOptions)
//     .then( response => {
//         console.log(response);
//     }).catch( error => {
//         console.log(error);
//     });
// function tryCancelRequest(){
//     //TODO:
// }

let newResumableSubscription = instance.resumableSubscribe(resumableSubscribeOptions);
// let nonResumableSubscription = instance.subscribe(nonResumableSubscribeOptions);

function tryUnsubscribe(){
    // newResumableSubscription.unsubscribe();
    nonResumableSubscription.unsubscribe();    

}

