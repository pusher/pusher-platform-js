let verboseLogger = new PusherPlatform.ConsoleLogger(1) //Verbose logger 

let instance = new PusherPlatform.Instance({
    instanceId: CONSTANTS.instanceId,
    serviceName: 'example',
    serviceVersion: 'v1',
    host: 'localhost:10443',
    // logger: verboseLogger
});

function urlEncode(data) {
    return Object.keys(data)
      .filter(key => data[key] !== undefined)
      .map(key => `${ key }=${ encodeURIComponent(data[key]) }`)
      .join("&");
}

class TokenProvider {
    
        constructor() {
            this.authData = {
                "action": "READ",
                "path": "feeds/private-my-feed/items"
            };
            this.authEndpoint = "http://localhost:3000/path/tokens"; 
        }
        
        fetchToken(tokenParams){
            return new PCancelable( (onCancel, resolve, reject) => {
    
                const xhr = new XMLHttpRequest();
    
                onCancel( () => {
                    xhr.abort();
                })
                xhr.open("POST", this.authEndpoint);
                xhr.timeout = 3000;
                xhr.onerror = (err) => {
                    console.log(err);
                }
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
                
                xhr.onerror = error => {
                    console.log(error);
                    reject(error);
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
            })
            .catch(err => {
                console.error(err);
            })
        }
    
        clearToken(token){
            console.log("lol");
        }
    }

let requestOptions = {
    method: "GET",
    path: "feeds/private-my-feed/items"
}

let postRequestOptions = {
    method: "POST",
    path: "text",
    body: { text: "Ahoj Karl" },
};

instance.request(postRequestOptions)
    .then( response => {
        console.log('Request (response):', response);
    }).catch( error => {
        console.log('Request (response):', error);
    });

function tryCancelRequest(){
    //TODO:
}

const createListeners = (feedId) => {
    const log = console.log.bind(null, `Log from "${feedId}":`);

    return {
        onOpen: (headers) => log('onOpen', headers),
        onSubscribe: () => log('onSubscribed'),
        onEvent: (event) => log('onEvent', event),
        onError: (error) => log('onError', error),
        onEnd: (error) => log('onEnd', error),
        onRetrying: () => log('onRetrying')
    };
};

const createSubscribeOptions = (feedId) => ({
    path: `ticker/`,
    listeners: createListeners(feedId),
    // tokenProvider: new TokenProvider()
});

let subscription1 = instance.subscribeResuming(createSubscribeOptions('my-feed'));
// let subscription2 = instance.subscribeNonResuming(createSubscribeOptions('hey-2'));

function tryUnsubscribe() {
    subscription1.unsubscribe();
    // subscription2.unsubscribe();
}

