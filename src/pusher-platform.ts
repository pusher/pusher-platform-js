type Headers = {
  [key : string]: string;
}

interface Event {
  eventId : string;
  headers: Headers;
  body: any;
}

interface RequestOptions {
  method : string;
  path : string;
  jwt? : string;
  headers? : Headers;
  body? : any;
}

interface SubscribeOptions {
  path : string;
  jwt? : string;
  headers? : Headers;
  onOpen? : () => void;
  onEvent? : (event: Event) => void;
  onEnd? : () => void;
  onError? : (error: Error) => void;
}

function responseHeadersObj(headerStr : string) : Headers {
  var headers : Headers = {};
  if (!headerStr) {
    return headers;
  }

  var headerPairs = headerStr.split('\u000d\u000a');
  for (var i = 0; i < headerPairs.length; i++) {
    var headerPair = headerPairs[i];
    var index = headerPair.indexOf('\u003a\u0020');
    if (index > 0) {
      var key = headerPair.substring(0, index);
      var val = headerPair.substring(index + 2);
      headers[key] = val;
    }
  }

  return headers;
}

class ErrorResponse {
  public statusCode: number;
  public headers: Headers;
  public info: any;

  constructor(xhr : XMLHttpRequest) {
    this.statusCode = xhr.status;
    this.headers = responseHeadersObj(xhr.getAllResponseHeaders());
    this.info = xhr.responseText;
  }
}

// Will call `options.onEvent` 0+ times,
// followed by EITHER `options.onEnd` or `options.onError` exactly once.
class Subscription {
  private gotEOS : boolean = false;
  private calledOnOpen : boolean = false;

  private opened() {
    if (!this.calledOnOpen) {
      if (this.options.onOpen) { this.options.onOpen(); }
      this.calledOnOpen = true;
    }
  }

  constructor(
      private xhr : XMLHttpRequest,
      private options : SubscribeOptions
  ) {
    this.xhr.onreadystatechange = () => {
      if (this.xhr.readyState === 3) {
        // The headers have loaded and we have partial body text.
        if (this.xhr.status === 200) {
          // We've received a successful response header.
          // The partial body text is a partial JSON message stream.
          this.opened();
          let err = this.onChunk();
          if (err != null) {
            this.xhr.abort();
            // Because we abort()ed, we will get no more calls to our onreadystatechange handler,
            // and so we will not call the event handler again.
            // Finish with options.onError instead of the options.onEnd.
            if (this.options.onError) { this.options.onError(err); }
          } else {
            // We consumed some response text, and all's fine. We expect more text.
          }
        } else {
          // Error response. Wait until the response completes (state 4) before erroring.
        }
      } else if (this.xhr.readyState === 4) {
        // This is the last time onreadystatechange is called.
        if (this.xhr.status === 200) {
          this.opened();
          let err = this.onChunk();
          if (err !== null && err != undefined) {
            if (this.options.onError) { this.options.onError(err); }
          } else if (!this.gotEOS) {
            if (this.options.onError) { this.options.onError(new Error("HTTP response ended without receiving EOS message")); }
          } else {
            // Stream ended normally.
            if (this.options.onEnd) { this.options.onEnd(); }
          }
        } else {
          // Either the server responded with a bad status code,
          // or the request errored in some other way (status 0).
          // Finish with an error.
          if (this.options.onError) { this.options.onError(new Error(new ErrorResponse(xhr).toString())); }
        }
      } else {
        // States 0, 1 or 2. Too early for us to do anything. Wait for a 3 or 4.
      }
    };
  }

  open(jwt: string) {
    if (jwt) {
      this.xhr.setRequestHeader("authorization", `Bearer ${jwt}`);
    }

    this.xhr.send();
  }

  private lastNewlineIndex : number = 0;

  // calls options.onEvent 0+ times, then possibly returns an error.
  // idempotent.
  onChunk(): Error {
    let response = this.xhr.responseText;

    let newlineIndex = response.lastIndexOf("\n");
    if (newlineIndex > this.lastNewlineIndex) {

      let rawEvents = response.slice(this.lastNewlineIndex, newlineIndex).split("\n");
      this.lastNewlineIndex = newlineIndex;

      for (let rawEvent of rawEvents) {
        if (rawEvent.length === 0) {
          continue; // FIXME why? This should be a protocol error
        }
        let data = JSON.parse(rawEvent);
        let err = this.onMessage(data);
        if (err != null) {
          return err;
        }
      }
    }
  }

  // calls options.onEvent 0+ times, then returns an Error or null
  private onMessage(message : any[]): Error {
    if (this.gotEOS) {
      return new Error("Got another message after EOS message");
    }
    if (!Array.isArray(message)) {
       return new Error("Message is not an array");
    }
    if (message.length < 1) {
      return new Error("Message is empty array");
    }

    switch(message[0]) {
      case 0:
        return null;
      case 1:
        return this.onEventMessage(message);
      case 255:
        return this.onEOSMessage(message);
      default:
        return new Error("Unknown Message: " + JSON.stringify(message));
    }
  }

  // EITHER calls options.onEvent, OR returns an error
  private onEventMessage(eventMessage: any[]): Error {
    if (eventMessage.length !== 4) {
      return new Error("Event message has " + eventMessage.length + " elements (expected 4)");
    }
    let [_, id, headers, body] = eventMessage;
    if (typeof id !== "string") {
      return new Error("Invalid event ID in message: " + JSON.stringify(eventMessage));
    }
    if (typeof headers !== "object" || Array.isArray(headers)) {
      return new Error("Invalid event headers in message: " + JSON.stringify(eventMessage));
    }
    if (this.options.onEvent) { this.options.onEvent({ eventId: id, headers: headers, body: body }); }
  }

  // calls options.onEvent 0+ times, then possibly returns an error
  private onEOSMessage(eosMessage: any[]): Error {
    if (eosMessage.length !== 4) {
      return new Error("EOS message has " + eosMessage.length + " elements (expected 4)");
    }
    let [_, statusCode, headers, info] = eosMessage;
    if (typeof statusCode !== "number") {
      return new Error("Invalid EOS Status Code");
    }
    if (typeof headers !== "object" || Array.isArray(headers)) {
      return new Error("Invalid EOS Headers");
    }
    this.gotEOS = true;
  }

  abort(err: Error) {
    this.xhr.abort();
    if (err) {
      if (this.options.onError) { this.options.onError(err); }
    } else {
      if (this.options.onEnd) { this.options.onEnd(); }
    }
  }
}

interface BaseClientOptions {
  cluster: string;
  encrypted?: boolean;
  timeout?: number;
  XMLHttpRequest?: Function;
}

export class BaseClient {
  private baseURL : string;
  private XMLHttpRequest : any;

  constructor(private options: BaseClientOptions) {
    let cluster = options.cluster.replace(/\/$/, '');
    this.baseURL = `${options.encrypted !== false ? "https" : "http"}://${cluster}`;
    this.XMLHttpRequest = options.XMLHttpRequest || (<any>window).XMLHttpRequest;
  }

  request(options : RequestOptions) : Promise<any> {
    let xhr = this.createXHR(this.baseURL, options);

    return new Promise<any>((resolve, reject) => {

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            resolve(xhr.responseText);
          } else {
            reject(new ErrorResponse(xhr));
          }
        }
      };

      xhr.send(JSON.stringify(options.body));
    });
  }

  newSubscription(subOptions : SubscribeOptions) : Subscription {
    return new Subscription(
      this.createXHR(this.baseURL, {
        method: "SUBSCRIBE",
        path: subOptions.path,
        headers: subOptions.headers,
        body: null,
      }),
      subOptions
    );
  }

  private createXHR(baseURL : string, options : RequestOptions) : XMLHttpRequest {
    let XMLHttpRequest: any = this.XMLHttpRequest;
    let xhr = new XMLHttpRequest();
    let path = options.path.replace(/^\/+/, "");
    let endpoint = `${baseURL}/${path}`;

    xhr.open(options.method.toUpperCase(), endpoint, true);

    if (options.body) {
      xhr.setRequestHeader("content-type", "application/json");
    }

    for (let key in options.headers) {
      xhr.setRequestHeader(key, options.headers[key]);
    }

    return xhr;
  }
}

export interface Authorizer {
  authorize() : Promise<string>;
}

export class SimpleTokenAuthorizer implements Authorizer {
  constructor(public jwt : string) { }
  authorize() : Promise<string> {
    return new Promise<string>((resolve, reject) => {
      resolve(this.jwt);
    });
  }
}

function base64UrlDecode(encoded: string): string {
  return atob(encoded.replace(/\-/g, '+').replace(/_/g, '/'));
}

export class AuthServerAuthorizer implements Authorizer {
  private accessToken : string = null;
  constructor(private authServerUrl: string) { }
  authorize() : Promise<string> {
    return new Promise<string>((resolve, reject) => {
      if (this.accessToken != null && Date.now() < JSON.parse(base64UrlDecode(this.accessToken.split(".")[1]))["exp"]*1000) {
        resolve(this.accessToken);
      } else {
        let xhr : XMLHttpRequest = new XMLHttpRequest();
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (200 <= xhr.status && xhr.status < 300) {
              this.accessToken = JSON.parse(xhr.responseText)["access_token"];
              resolve(this.accessToken);
            } else {
              reject(new Error("Unexpected status code in response from auth server: " + xhr.status));
            }
          }
        };
        xhr.open("POST", this.authServerUrl, true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.send("grant_type=client_credentials&credentials=jim");  // FIXME credentials should come from a session cookie or similar
      }
    });
  }
}

type Response = any;

interface FeedSubscribeOptions {
  lastEventId?: string;
  onOpen? : () => void;
  onItem? : (item: Event) => void;
  onError? : (error: Error) => void;
}

class FeedsHelper {
  public app : App;
  public feedName : string;

  constructor(name : string, app: App){
    this.feedName = name;
    this.app = app;
  }

  subscribe(options: FeedSubscribeOptions) : Subscription {
    return this.app.subscribe({
      path: "feeds/" + this.feedName,
      headers: options.lastEventId ? { "Last-Event-Id": options.lastEventId } : {},
      onOpen: options.onOpen,
      onEvent: options.onItem,
      onEnd: () => { options.onError(new Error("Unexpected end to Feed subscription")); },
      onError: options.onError
    });
  }

  append(item : any) : Promise<Response> {
    var path = "feeds/" + this.feedName;
    return this.app.request({ method: "POST", path: path, body: { items: [item] } });
  }
}


interface AppOptions {
  appId: string;
  cluster?: string;
  authorizer?: Authorizer;
  client?: BaseClient;
  encrypted? : boolean;
}

export class App {
  private client : BaseClient;
  private appId : string;
  private authorizer : Authorizer;

  constructor(options : AppOptions) {
    this.appId = options.appId;
    this.authorizer = options.authorizer;

    this.client = options.client || new BaseClient({
      cluster: options.cluster || "api.private-beta-1.pusherplatform.com",
      encrypted: options.encrypted
    });
  }

  request(options : RequestOptions) : Promise<Response> {
    options.path = this.absPath(options.path);

    if (!options.jwt && this.authorizer) {
      return this.authorizer.authorize().then((jwt) => {
        return this.client.request(Object.assign(options, {jwt}));
      });
    } else {
      return this.client.request(options);
    }
  }

  subscribe(options : SubscribeOptions) : Subscription {
    options.path = this.absPath(options.path);

    let subscription : Subscription = this.client.newSubscription(options);

    if (options.jwt) {
      subscription.open(options.jwt);
    } else if (this.authorizer) {
      this.authorizer.authorize().then((jwt) => {
        subscription.open(jwt);
      }).catch((err) => {
        subscription.abort(err);
      });
    } else {
      subscription.open(null);
    }

    return subscription;
  }

  feed(name : string) : FeedsHelper {
    return new FeedsHelper(name, this);
  }

  private absPath(relativePath: string): string {
    return `/apps/${this.appId}/${relativePath}`.replace(/\/+/g, "/").replace(/\/+$/, "");
  }
}
