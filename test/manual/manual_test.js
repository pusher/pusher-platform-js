let verboseLogger = new PusherPlatform.ConsoleLogger(1) //Verbose logger 

let instance = new PusherPlatform.Instance({
    instanceId: CONSTANTS.instanceId,
    serviceName: 'feeds',
    serviceVersion: 'v1',
    logger: verboseLogger
});

let listeners = {
    onOpen: (headers) => console.log("onOpen"),
    onSubscribe: () => console.log("onSubscribed"),
    onEvent: (event) => console.log(event),
    onError: (error) => console.log(error),
    onEnd: (error) => console.log("onEnd"),
    onRetrying: () => console.log("onRetrying")
};

let resumableSubscribeOptions = {
    path: 'feeds/my-feed/items',
    listeners: listeners,
}

let requestOptions = {  
    method: "GET",
    path: "feeds/my-feed/items",
    // retryStrategy: myRetryStrategy
}

let postRequestOptions = {
    method: "POST",
    path: "feeds/my-feed/items",
    body: { items: [ {name: "kekec"}]},
    // retryStrategy: myRetryStrategy,
}

let nonResumableSubscribeOptions = {
    path: 'feeds/my-feed/items',
    // retryStrategy: myRetryStrategy,
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

let newResumableSubscription = instance.subscribeResuming(resumableSubscribeOptions);

console.log(newResumableSubscription);
// let nonResumableSubscription = instance.subscribe(nonResumableSubscribeOptions);

function tryUnsubscribe(){
    // newResumableSubscription.unsubscribe();
    newResumableSubscription.unsubscribe();    

}

