import { Authorizer } from './authorizer'
import { BaseClient } from './base-client'

type Headers = {
  [key: string]: string;
}

export interface Event {
  eventId: string;
  headers: Headers;
  body: any;
}

export interface RequestOptions {
  method: string;
  path: string;
  jwt?: string;
  headers?: Headers;
  body?: any;
}

export interface SubscribeOptions {
  path: string;
  jwt?: string;
  lastEventId?: string;
  onOpen?: () => void;
  onEvent?: (event: Event) => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

function responseHeadersObj(headerStr: string): Headers {
  var headers: Headers = {};
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

export class ErrorResponse {
  public statusCode: number;
  public headers: Headers;
  public info: any;

  constructor(xhr: XMLHttpRequest) {
    this.statusCode = xhr.status;
    this.headers = responseHeadersObj(xhr.getAllResponseHeaders());
    this.info = xhr.responseText;
  }
}

// Follows https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/readyState
enum XhrReadyState {
  UNSENT = 0,
  OPENED = 1,
  HEADERS_RECEIVED = 2,
  LOADING = 3,
  DONE = 4
}

enum SubscriptionState {
  UNOPENED = 0, // haven't called xhr.send()
  OPENING,      // called xhr.send(); not yet received response headers
  OPEN,         // received response headers; called onOpen(); expecting message
  ENDING,       // received EOS message; response not yet finished
  ENDED         // called onEnd() or onError(err)
}

// Asserts that the subscription state is one of the specified values,
// otherwise logs the current value.
function assertState(stateEnum, states = []) {
  const check = states.some(state => stateEnum[state] === this.state);
  const expected = states.join(', ');
  const actual = stateEnum[this.state];
  console.assert(check, `Expected this.state to be ${expected} but it is ${actual}`);
  if (!check) {
    console.trace();
  }
};

// Callback pattern: (onOpen onEvent* (onEnd|onError)) | onError
// A call to `unsubscribe()` will call `options.onEnd()`;
// a call to `unsubscribe(someError)` will call `options.onError(someError)`.
export class Subscription {
  private state: SubscriptionState = SubscriptionState.UNOPENED;
  private assertState: Function;

  private gotEOS: boolean = false;

  constructor(
    private xhr: XMLHttpRequest,
    private options: SubscribeOptions
  ) {
    this.assertState = assertState.bind(this, SubscriptionState);
    if (options.lastEventId) {
      this.xhr.setRequestHeader("Last-Event-Id", options.lastEventId);
    }
    this.xhr.onreadystatechange = () => {
      if (
        this.xhr.readyState === XhrReadyState.UNSENT ||
        this.xhr.readyState === XhrReadyState.OPENED ||
        this.xhr.readyState === XhrReadyState.HEADERS_RECEIVED
      ) {
        // Too early for us to do anything.
        this.assertState(['OPENING']);
      }
      else if (this.xhr.readyState === XhrReadyState.LOADING) {
        // The headers have loaded and we have partial body text.
        // We can get this one multiple times.
        this.assertState(['OPENING', 'OPEN', 'ENDING']);

        if (this.xhr.status === 200) {
          // We've received a successful response header.
          // The partial body text is a partial JSON message stream.

          if (this.state === SubscriptionState.OPENING) {
            this.state = SubscriptionState.OPEN;
            if (this.options.onOpen) { this.options.onOpen(); }
          }

          this.assertState(['OPEN', 'ENDING']);
          let err = this.onChunk();  // might transition our state from OPEN -> ENDING
          this.assertState(['OPEN', 'ENDING']);

          if (err != null) {
            this.xhr.abort();
            // Because we abort()ed, we will get no more calls to our onreadystatechange handler,
            // and so we will not call the event handler again.
            // Finish with options.onError instead of the options.onEnd.

            this.state = SubscriptionState.ENDED;
            if (this.options.onError) { this.options.onError(err); }
          } else {
            // We consumed some response text, and all's fine. We expect more text.
          }
        } else {
          // Error response. Wait until the response completes (state 4) before erroring.
          this.assertState(['OPENING']);
        }
      } else if (this.xhr.readyState === XhrReadyState.DONE) {
        // This is the last time onreadystatechange is called.
        if (this.xhr.status === 200) {
          if (this.state === SubscriptionState.OPENING) {
            this.state = SubscriptionState.OPEN;
            if (this.options.onOpen) { this.options.onOpen(); }
          }
          this.assertState(['OPEN', 'ENDING']);

          let err = this.onChunk();
          if (err !== null && err !== undefined) {
            this.state = SubscriptionState.ENDED;
            if (this.options.onError) { this.options.onError(err); }
          } else if (this.state !== SubscriptionState.ENDING) {
            if (this.options.onError) { this.options.onError(new Error("HTTP response ended without receiving EOS message")); }
          } else {
            // Stream ended normally.
            if (this.options.onEnd) { this.options.onEnd(); }
          }
        } else {
          // The server responded with a bad status code (finish with onError).
          // Finish with an error.
          this.assertState(['OPENING', 'OPEN', 'ENDED']);
          if (this.state === SubscriptionState.ENDED) {
            // We aborted the request deliberately, and called onError/onEnd elsewhere.
          } else {
            // The server
            if (this.options.onError) { this.options.onError(new Error("error from server: " + this.xhr.responseText)); }
          }
        }
      }
    };

    xhr.onerror = () => {
      if (this.options.onError) { this.options.onError(new Error("resumable")); }
    };
  }

  open(jwt: string) {
    if (this.state !== SubscriptionState.UNOPENED) {
      throw new Error("Called .open() on Subscription object in unexpected state: " + this.state);
    }

    this.state = SubscriptionState.OPENING;

    if (jwt) {
      this.xhr.setRequestHeader("authorization", `Bearer ${jwt}`);
    }

    this.xhr.send();
  }

  private lastNewlineIndex: number = 0;

  // calls options.onEvent 0+ times, then possibly returns an error.
  // idempotent.
  private onChunk(): Error {
    this.assertState(['OPEN']);

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
  private onMessage(message: any[]): Error {
    this.assertState(['OPEN']);

    if (this.gotEOS) {
      return new Error("Got another message after EOS message");
    }
    if (!Array.isArray(message)) {
      return new Error("Message is not an array");
    }
    if (message.length < 1) {
      return new Error("Message is empty array");
    }

    switch (message[0]) {
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
    this.assertState(['OPEN']);

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
    this.assertState(['OPEN']);

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

    this.state = SubscriptionState.ENDING;
  }

  unsubscribe(err?: Error) {
    this.state = SubscriptionState.ENDED;
    this.xhr.abort();
    if (err) {
      if (this.options.onError) { this.options.onError(err); }
    } else {
      if (this.options.onEnd) { this.options.onEnd(); }
    }
  }
}

export interface ResumableSubscribeOptions {
  path: string;
  lastEventId?: string;
  authorizer?: Authorizer;
  onOpening?: () => void;
  onOpen?: () => void;
  onEvent?: (event: Event) => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

enum ResumableSubscriptionState {
  UNOPENED = 0,
  OPENING,      // can be visited multiple times
  OPEN,         // called onOpen(); expecting message
  ENDING,       // received EOS message; response not yet finished
  ENDED         // called onEnd() or onError(err)
}

// pattern of callbacks: ((onOpening (onOpen onEvent*)?)? (onError|onEnd)) | onError
export class ResumableSubscription {

  private state: ResumableSubscriptionState = ResumableSubscriptionState.UNOPENED;
  private assertState: Function;
  private subscription: Subscription;
  private lastEventIdReceived: string = null;
  private delayMillis: number = 0;

  constructor(
    private xhrSource: () => XMLHttpRequest,
    private options: ResumableSubscribeOptions
  ) {
    this.assertState = assertState.bind(this, ResumableSubscriptionState);
    this.lastEventIdReceived = options.lastEventId;
  }

  tryNow(): void {
    this.state = ResumableSubscriptionState.OPENING;
    let newXhr = this.xhrSource();
    this.subscription = new Subscription(newXhr, {
      path: this.options.path,
      lastEventId: this.lastEventIdReceived,
      onOpen: () => {
        this.assertState(['OPENING']);
        this.state = ResumableSubscriptionState.OPEN;
        if (this.options.onOpen) { this.options.onOpen(); }
      },
      onEvent: (event: Event) => {
        this.assertState(['OPEN']);
        if (this.options.onEvent) { this.options.onEvent(event); }
        console.assert(
          this.lastEventIdReceived === null ||
          parseInt(event.eventId) > parseInt(this.lastEventIdReceived),
          'Expected the current event id to be larger than the previous one'
        );
        this.lastEventIdReceived = event.eventId;
        console.log("Set lastEventIdReceived to " + this.lastEventIdReceived);
      },
      onEnd: () => {
        this.state = ResumableSubscriptionState.ENDED;
        if (this.options.onEnd) { this.options.onEnd(); }
      },
      onError: (error: Error) => {
        if (this.isResumableError(error)) {
          this.state = ResumableSubscriptionState.OPENING;
          if (this.options.onOpening) { this.options.onOpening(); }
          this.backoff();
        } else {
          this.state = ResumableSubscriptionState.ENDED;
          if (this.options.onError) { this.options.onError(error); }
        }
      },
    });
    if (this.options.authorizer) {
      this.options.authorizer.authorize().then((jwt) => {
        this.subscription.open(jwt);
      }).catch((err) => {
        // This is a resumable error?
        console.log("Error getting auth token; backing off");
        this.backoff();
      });
    } else {
      this.subscription.open(null);
    }
  }

  backoff(): void {
    this.delayMillis = this.delayMillis * 2 + 1000;
    console.log("Trying reconnect in " + this.delayMillis + " ms.");
    window.setTimeout(() => { this.tryNow(); }, this.delayMillis);
  }

  open(): void {
    this.tryNow();
  }

  private isResumableError(error: Error) {
    return error.message === "resumable"; // TODO this is a horrible way to represent resumableness
  }

  unsubscribe() {
    this.subscription.unsubscribe(); // We'll get onEnd and bubble this up
  }
}



type Response = any;

interface AppOptions {
  appId: string;
  cluster?: string;
  authorizer?: Authorizer;
  client?: BaseClient;
  encrypted?: boolean;
}

export class App {
  private client: BaseClient;
  private appId: string;
  private authorizer: Authorizer;

  constructor(options: AppOptions) {
    this.appId = options.appId;
    this.authorizer = options.authorizer;

    this.client = options.client || new BaseClient({
      cluster: options.cluster || "api.private-beta-1.pusherplatform.com",
      encrypted: options.encrypted
    });
  }

  request(options: RequestOptions): Promise<Response> {
    options.path = this.absPath(options.path);

    if (!options.jwt && this.authorizer) {
      return this.authorizer.authorize().then((jwt) => {
        return this.client.request(Object.assign(options, { jwt }));
      });
    } else {
      return this.client.request(options);
    }
  }

  subscribe(options: SubscribeOptions): Subscription {
    options.path = this.absPath(options.path);

    let subscription: Subscription = this.client.newSubscription(options);

    if (options.jwt) {
      subscription.open(options.jwt);
    } else if (this.authorizer) {
      this.authorizer.authorize().then((jwt) => {
        subscription.open(jwt);
      }).catch((err) => {
        subscription.unsubscribe(err);
      });
    } else {
      subscription.open(null);
    }

    return subscription;
  }

  resumableSubscribe(options: ResumableSubscribeOptions): ResumableSubscription {
    options.path = this.absPath(options.path);
    options.authorizer = this.authorizer;

    let resumableSubscription: ResumableSubscription = this.client.newResumableSubscription(options);

    resumableSubscription.open();

    return resumableSubscription;
  }

  private absPath(relativePath: string): string {
    return `/apps/${this.appId}/${relativePath}`.replace(/\/+/g, "/").replace(/\/+$/, "");
  }
}
