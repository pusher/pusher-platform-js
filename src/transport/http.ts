import { RequestOptions } from '../request';
import { Subscription, SubscriptionListeners } from '../subscription';
import { XhrReadyState, ElementsHeaders, responseToHeadersObject, ErrorResponse, NetworkError } from '../network';
import { SubscriptionEvent, SubscriptionTransport } from '../subscription';
import { Logger } from '../logger';

export enum HttpTransportState {
  UNOPENED = 0, // haven't called xhr.send()
  OPENING,      // called xhr.send(); not yet received response headers
  OPEN,         // received response headers; called onOpen(); expecting message
  ENDING,       // received EOS message; response not yet finished
  ENDED         // called onEnd() or onError(err)
};

class HttpSubscription implements Subscription {
  private xhr: XMLHttpRequest;
  private state: HttpTransportState = HttpTransportState.UNOPENED;
  private listeners: SubscriptionListeners;

  constructor (
    xhr: XMLHttpRequest,
    listeners: SubscriptionListeners
  ) {
    this.xhr = xhr;
    this.listeners = listeners;

    this.xhr.onreadystatechange = () => {
      switch (this.xhr.readyState) {
        case XhrReadyState.UNSENT:
        case XhrReadyState.OPENED:
        case XhrReadyState.HEADERS_RECEIVED:
          this.assertStateIsIn(HttpTransportState.OPENING);
          break;

        case XhrReadyState.LOADING:
          this.onLoading();
          break;

        case XhrReadyState.DONE:
          this.onDone();
          break;
      }
    };
    this.state = HttpTransportState.OPENING;
    this.xhr.send();

    return this;
  }

  public unsubscribe(): void {
    this.state = HttpTransportState.ENDED;
    this.xhr.abort();
    this.listeners.onEnd(null);
  }

  private onLoading(): void {
    this.assertStateIsIn(
      HttpTransportState.OPENING,
      HttpTransportState.OPEN,
      HttpTransportState.ENDING
    );

    if (this.xhr.status === 200) {
      //Check if we just transitioned to the open state
      if (this.state === HttpTransportState.OPENING) {
        this.state = HttpTransportState.OPEN;
        console.log(responseToHeadersObject(this.xhr.getAllResponseHeaders()));
        this.listeners.onOpen(responseToHeadersObject(this.xhr.getAllResponseHeaders()));
      }

      this.assertStateIsIn(HttpTransportState.OPEN);
      let err = this.onChunk(); // might transition our state from OPEN -> ENDING
      this.assertStateIsIn(HttpTransportState.OPEN, HttpTransportState.ENDING);

      if (err) {
        this.state = HttpTransportState.ENDED;
        if (err instanceof ErrorResponse && err.statusCode != 204) {
          this.listeners.onError(err);
        }
        // Because we abort()ed, we will get no more calls to our onreadystatechange handler,
        // and so we will not call the event handler again.
        // Finish with options.onError instead of the options.onEnd.

      } else {
        // We consumed some response text, and all's fine. We expect more text.
      }
    }
  }

  private onDone(): void {
    if (this.xhr.status === 200) {
      if (this.state === HttpTransportState.OPENING) {
        this.state = HttpTransportState.OPEN;
        this.listeners.onOpen(responseToHeadersObject(this.xhr.getAllResponseHeaders()));
      }
      this.assertStateIsIn(HttpTransportState.OPEN, HttpTransportState.ENDING);
      let err = this.onChunk();
      if (err) {
        this.state = HttpTransportState.ENDED;
        if ((err as any).statusCode === 204) { //TODO: That cast is horrific
          this.listeners.onEnd(null);
        }
        else {
          this.listeners.onError(err);
        }
      } else if (this.state <= HttpTransportState.ENDING) {
        this.listeners.onError(new Error("HTTP response ended without receiving EOS message"));
      } else {
        // Stream ended normally.
        this.listeners.onEnd(null);
      }
    } else {
      this.assertStateIsIn(
        HttpTransportState.OPENING,
        HttpTransportState.OPEN,
        HttpTransportState.ENDED
      );

      if (this.state === HttpTransportState.ENDED) {
        // We aborted the request deliberately, and called onError/onEnd elsewhere.
        return;
      }
      //Something terrible has happened. Most likely a network error. XHR is useless at that point.
      else if (this.xhr.status === 0) {
        this.listeners.onError(new NetworkError("Connection lost."));
      } else {
        this.listeners.onError(ErrorResponse.fromXHR(this.xhr));
      }
    }
  }

  private lastNewlineIndex: number = 0;

  private onChunk(): Error {
    this.assertStateIsIn(HttpTransportState.OPEN);
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

  private assertStateIsIn(...validStates: HttpTransportState[]) {
    const stateIsValid = validStates.some(validState => validState === this.state);
    if (!stateIsValid) {
      const expectedStates = validStates.map(state => HttpTransportState[state]).join(', ');
      const actualState = HttpTransportState[this.state];
      console.warn(`Expected this.state to be one of [${expectedStates}] but it is ${actualState}`);
    }
  }

  private gotEOS: boolean = false;

  /**
  * Calls options.onEvent 0+ times, then returns an Error or null
  * Also asserts the message is formatted correctly and we're in an allowed state (not terminated).
  */
  private onMessage(message: any[]): Error {
    this.assertStateIsIn(HttpTransportState.OPEN);
    this.verifyMessage(message);

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
    this.assertStateIsIn(HttpTransportState.OPEN);

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
    this.listeners.onEvent({ eventId: id, headers: headers, body: body });
  }

  /**
  * EOS message received. Sets subscription state to Ending and returns an error with given status code
  * @param eosMessage final message of the subscription
  */

  private onEOSMessage(eosMessage: any[]): any {
    this.assertStateIsIn(HttpTransportState.OPEN);

    if (eosMessage.length !== 4) {
      return new Error("EOS message has " + eosMessage.length + " elements (expected 4)");
    }
    let [_, statusCode, headers, info] = eosMessage;
    if (typeof statusCode !== "number") {
      return new Error("Invalid EOS Status Code");
    }
    if (typeof headers !== "object" || Array.isArray(headers)) {
      return new Error("Invalid EOS ElementsHeaders");
    }

    this.state = HttpTransportState.ENDING;
    return new ErrorResponse(statusCode, headers, info);
  }

  /**
  * Check if a single subscription message is in the right format.
  * @param message The message to check.
  * @returns null or error if the message is wrong.
  */
  private verifyMessage(message: any[]) {
    if (this.gotEOS) {
      return new Error("Got another message after EOS message");
    }
    if (!Array.isArray(message)) {
      return new Error("Message is not an array");
    }
    if (message.length < 1) {
      return new Error("Message is empty array");
    }
  }

}

export default class HttpTransport implements SubscriptionTransport {
  private baseURL: string;

  constructor(host: string, encrypted?: boolean) {
    this.baseURL = `${encrypted !== false ? "https" : "http"}://${host}`;
  }

  public request (requestOptions: RequestOptions): XMLHttpRequest {
    return this.createXHR(this.baseURL, requestOptions);
  }

  public subscribe(
    path: string,
    listeners: SubscriptionListeners,
    headers: ElementsHeaders
  ): Subscription {
    const requestOptions: RequestOptions = {
      method: "SUBSCRIBE",
      path: path,
      headers: headers
    };

    return new HttpSubscription(
      this.createXHR(this.baseURL, requestOptions),
      listeners
    );
  }

  private createXHR(baseURL: string, options: RequestOptions): XMLHttpRequest {
    let XMLHttpRequest: any = (<any>window).XMLHttpRequest;
    let xhr = new XMLHttpRequest();
    let path = options.path.replace(/^\/+/, "");
    let endpoint = `${baseURL}/${path}`;
    xhr.open(options.method.toUpperCase(), endpoint, true);
    if (options.body) {
      xhr.setRequestHeader("content-type", "application/json");
    }
    if (options.jwt) {
      xhr.setRequestHeader("authorization", `Bearer ${options.jwt}`);
    }
    for (let key in options.headers) {
      xhr.setRequestHeader(key, options.headers[key]);
    }
    return xhr;
  }
}
