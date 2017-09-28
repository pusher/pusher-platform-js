let verboseLogger = new PusherPlatform.ConsoleLogger(1) //Verbose logger 

let instance = new PusherPlatform.Instance({
    instanceId: CONSTANTS.instanceId,
    serviceName: 'example',
    serviceVersion: 'v1',
    host: 'localhost:10443',
    // logger: verboseLogger
});

const wsSubscribeType  = 100,
    wsOpenType        = 101,
    wsEventType       = 102,
    wsUnsubscribeType = 198,
    wsEosType         = 199,
    wsPingType        = 16,
    wsPongType        = 17,
    wsCloseType       = 99;

const runWebsocket = () => {
    // Create WebSocket connection.
    const socket = new WebSocket('wss://localhost:10443/ws');
    
    // Connection opened
    socket.addEventListener('open', function (event) {
        socket.send(`
        [${wsSubscribeType},10,"/services/example/v1/1/ticker",{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHAiOiIxIiwiZXhwIjoxNTA2NDQ2MjY3LCJpYXQiOjE1MDYzNTk4NjcsImlzcyI6ImZvbyJ9.Q7cjgjZb79aHqc0FPbQtNlpraRBIfPhjeFjBuZKkgJg"}]
        `);
        socket.send(`
        [${wsSubscribeType},20,"/services/example/v1/1/texter",{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHAiOiIxIiwiZXhwIjoxNTA2NDQ2MjY3LCJpYXQiOjE1MDYzNTk4NjcsImlzcyI6ImZvbyJ9.Q7cjgjZb79aHqc0FPbQtNlpraRBIfPhjeFjBuZKkgJg"}]
        `);
    });
    
    // Listen for messages
    socket.addEventListener('message', function (event) {
        console.log('Message from server ', event.data);
    });
};

// runWebsocket();

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
    path: "feeds/my-feed/items",
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
    tokenProvider: new TokenProvider()
});

let subscription1 = instance.subscribeResuming(createSubscribeOptions('my-feed'));
let subscription2 = instance.subscribeNonResuming(createSubscribeOptions('playground'));

function tryUnsubscribe(){
    subscription.unsubscribe(); 
}

