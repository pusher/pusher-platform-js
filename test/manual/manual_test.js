let verboseLogger = new PusherPlatform.ConsoleLogger(1) //Verbose logger 

let instance = new PusherPlatform.Instance({
    instanceId: CONSTANTS.instanceId,
    serviceName: 'feeds',
    serviceVersion: 'v1',
    logger: verboseLogger
});

let listeners = {
    onOpen: (headers) => {
        console.log(headers);
    },
    onSubscribe: () => console.log("onSubscribed"),
    onEvent: (event) => console.log(event),
    onError: (error) => console.log(error),
    onEnd: (error) => {
        console.log("onEnd");
        console.log(error);
    },
    onRetrying: () => console.log("onRetrying")
};

function urlEncode(data) {
    return Object.keys(data)
      .filter(key => data[key] !== undefined)
      .map(key => `${ key }=${ encodeURIComponent(data[key]) }`)
      .join("&");
}

class TokenProvider {
    
        constructor(){
            this.authData = { 
                "action": "READ",
                "path": "feeds/my-feed/items"
            };
            this.authEndpoint = "http://localhost:3000/feeds/tokens"; 
        }
        

        fetchToken(tokenParams){
            return new PCancelable( (onCancel, resolve, reject) => {
    
                const xhr = new XMLHttpRequest();
    
                onCancel( () => {
                    xhr.abort();
                })
                xhr.open("POST", authEndpoint);
                xhr.timeout = 3000;
                xhr.onload = () => {
                  if (xhr.status === 200) {
                      let token = JSON.parse(xhr.responseText);
                      resolve(token.access_token);
                  } else {
                    reject(new Error(`Couldn't fetch token from ${
                    this.authEndpoint
                    }; got ${ xhr.status } ${ xhr.responseText }.`));
                  }
                };
                xhr.ontimeout = () => {
                  reject(new Error(`Request timed out while fetching token from ${
                    this.authEndpoint
                  }`));
                };
                xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
                xhr.send(urlEncode({
                  ...this.authData,
                  grant_type: "client_credentials",
                }));
            });
        }
    
        clearToken(token){
            console.log("lol");
        }
    }

let subscribeOptions = {
    path: 'feeds/my-feed/items',
    listeners: listeners,
    tokenProvider: new TokenProvider()
}

let requestOptions = {  
    method: "GET",
    path: "feeds/my-feed/items",
}

let postRequestOptions = {
    method: "POST",
    path: "feeds/my-feed/items",
    body: { items: [ {name: "kekec"}]},
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

let subscription = instance.subscribeResuming(subscribeOptions);
// let subscription = instance.subscribeNonResuming(subscribeOptions);

function tryUnsubscribe(){
    subscription.unsubscribe(); 
}

