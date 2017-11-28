import { Logger } from '../logger';
import {
  ElementsHeaders,
  ErrorResponse,
  NetworkError,
  responseToHeadersObject,
  XhrReadyState,
} from '../network';
import { RequestOptions } from '../request';
import {
  Subscription,
  SubscriptionEvent,
  SubscriptionListeners,
  SubscriptionTransport,
} from '../subscription';

export enum HttpTransportState {
  UNOPENED = 0, // haven't called xhr.send()
  OPENING, // called xhr.send(); not yet received response headers
  OPEN, // received response headers; called onOpen(); expecting message
  ENDING, // received EOS message; response not yet finished
  ENDED, // called onEnd() or onError(err)
}

class HttpSubscription implements Subscription {
  private gotEOS: boolean = false;
  private lastNewlineIndex: number = 0;
  private listeners: SubscriptionListeners;
  private state: HttpTransportState = HttpTransportState.UNOPENED;
  private xhr: XMLHttpRequest;

  constructor(xhr: XMLHttpRequest, listeners: SubscriptionListeners) {
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

  unsubscribe(): void {
    this.state = HttpTransportState.ENDED;
    this.xhr.abort();
    if (this.listeners.onEnd) {
      this.listeners.onEnd(null);
    }
  }

  private onLoading(): void {
    this.assertStateIsIn(
      HttpTransportState.OPENING,
      HttpTransportState.OPEN,
      HttpTransportState.ENDING,
    );

    if (this.xhr.status === 200) {
      // Check if we just transitioned to the open state
      if (this.state === HttpTransportState.OPENING) {
        this.state = HttpTransportState.OPEN;
        global.console.log(
          responseToHeadersObject(this.xhr.getAllResponseHeaders()),
        );
        if (this.listeners.onOpen) {
          this.listeners.onOpen(
            responseToHeadersObject(this.xhr.getAllResponseHeaders()),
          );
        }
      }

      this.assertStateIsIn(HttpTransportState.OPEN);
      const err = this.onChunk(); // might transition our state from OPEN -> ENDING
      this.assertStateIsIn(HttpTransportState.OPEN, HttpTransportState.ENDING);

      if (err) {
        this.state = HttpTransportState.ENDED;
        if (err instanceof ErrorResponse && err.statusCode !== 204) {
          if (this.listeners.onError) {
            this.listeners.onError(err);
          }
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
        if (this.listeners.onOpen) {
          this.listeners.onOpen(
            responseToHeadersObject(this.xhr.getAllResponseHeaders()),
          );
        }
      }
      this.assertStateIsIn(HttpTransportState.OPEN, HttpTransportState.ENDING);
      const err = this.onChunk();
      if (err) {
        this.state = HttpTransportState.ENDED;
        if ((err as any).statusCode === 204) {
          // TODO: That cast is horrific
          if (this.listeners.onEnd) {
            this.listeners.onEnd(null);
          }
        } else {
          if (this.listeners.onError) {
            this.listeners.onError(err);
          }
        }
      } else if (this.state <= HttpTransportState.ENDING) {
        if (this.listeners.onError) {
          this.listeners.onError(
            new Error('HTTP response ended without receiving EOS message'),
          );
        }
      } else {
        // Stream ended normally.
        if (this.listeners.onEnd) {
          this.listeners.onEnd(null);
        }
      }
    } else {
      this.assertStateIsIn(
        HttpTransportState.OPENING,
        HttpTransportState.OPEN,
        HttpTransportState.ENDED,
      );

      if (this.state === HttpTransportState.ENDED) {
        // We aborted the request deliberately, and called onError/onEnd elsewhere.
        return;
      } else if (this.xhr.status === 0) {
        // Something terrible has happened. Most likely a network error. XHR is useless at that point.
        if (this.listeners.onError) {
          this.listeners.onError(new NetworkError('Connection lost.'));
        }
      } else {
        if (this.listeners.onError) {
          this.listeners.onError(ErrorResponse.fromXHR(this.xhr));
        }
      }
    }
  }

  private onChunk(): Error | undefined {
    this.assertStateIsIn(HttpTransportState.OPEN);
    const response = this.xhr.responseText;
    const newlineIndex = response.lastIndexOf('\n');
    if (newlineIndex > this.lastNewlineIndex) {
      const rawEvents = response
        .slice(this.lastNewlineIndex, newlineIndex)
        .split('\n');
      this.lastNewlineIndex = newlineIndex;

      for (const rawEvent of rawEvents) {
        if (rawEvent.length === 0) {
          continue; // FIXME why? This should be a protocol error
        }
        const data = JSON.parse(rawEvent);
        const err = this.onMessage(data);
        if (err != null) {
          return err;
        }
      }
    }
  }

  private assertStateIsIn(...validStates: HttpTransportState[]) {
    const stateIsValid = validStates.some(
      validState => validState === this.state,
    );
    if (!stateIsValid) {
      const expectedStates = validStates
        .map(state => HttpTransportState[state])
        .join(', ');
      const actualState = HttpTransportState[this.state];
      global.console.warn(
        `Expected this.state to be one of [${expectedStates}] but it is ${
          actualState
        }`,
      );
    }
  }

  /**
   * Calls options.onEvent 0+ times, then returns an Error or null
   * Also asserts the message is formatted correctly and we're in an allowed state (not terminated).
   */
  private onMessage(message: any[]): Error | null {
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
        return new Error('Unknown Message: ' + JSON.stringify(message));
    }
  }

  // EITHER calls options.onEvent, OR returns an error
  private onEventMessage(eventMessage: any[]): Error | null {
    this.assertStateIsIn(HttpTransportState.OPEN);

    if (eventMessage.length !== 4) {
      return new Error(
        'Event message has ' + eventMessage.length + ' elements (expected 4)',
      );
    }
    const [_, id, headers, body] = eventMessage;
    if (typeof id !== 'string') {
      return new Error(
        'Invalid event ID in message: ' + JSON.stringify(eventMessage),
      );
    }
    if (typeof headers !== 'object' || Array.isArray(headers)) {
      return new Error(
        'Invalid event headers in message: ' + JSON.stringify(eventMessage),
      );
    }

    if (this.listeners.onEvent) {
      this.listeners.onEvent({ body, headers, eventId: id });
    }
    return null;
  }

  /**
   * EOS message received. Sets subscription state to Ending and returns an error with given status code
   * @param eosMessage final message of the subscription
   */

  private onEOSMessage(eosMessage: any[]): any {
    this.assertStateIsIn(HttpTransportState.OPEN);

    if (eosMessage.length !== 4) {
      return new Error(
        'EOS message has ' + eosMessage.length + ' elements (expected 4)',
      );
    }
    const [_, statusCode, headers, info] = eosMessage;
    if (typeof statusCode !== 'number') {
      return new Error('Invalid EOS Status Code');
    }
    if (typeof headers !== 'object' || Array.isArray(headers)) {
      return new Error('Invalid EOS ElementsHeaders');
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
      return new Error('Got another message after EOS message');
    }
    if (!Array.isArray(message)) {
      return new Error('Message is not an array');
    }
    if (message.length < 1) {
      return new Error('Message is empty array');
    }
  }
}

export default class HttpTransport implements SubscriptionTransport {
  private baseURL: string;

  constructor(host: string, encrypted = true) {
    this.baseURL = `${encrypted ? 'https' : 'http'}://${host}`;
  }

  request(requestOptions: RequestOptions): XMLHttpRequest {
    return this.createXHR(this.baseURL, requestOptions);
  }

  subscribe(
    path: string,
    listeners: SubscriptionListeners,
    headers: ElementsHeaders,
  ): Subscription {
    const requestOptions: RequestOptions = {
      headers,
      method: 'SUBSCRIBE',
      path,
    };

    return new HttpSubscription(
      this.createXHR(this.baseURL, requestOptions),
      listeners,
    );
  }

  private createXHR(baseURL: string, options: RequestOptions): XMLHttpRequest {
    let xhr = new global.XMLHttpRequest();
    const path = options.path.replace(/^\/+/, '');
    const endpoint = `${baseURL}/${path}`;
    xhr.open(options.method.toUpperCase(), endpoint, true);
    xhr = this.setJSONHeaderIfAppropriate(xhr, options);
    if (options.jwt) {
      xhr.setRequestHeader('authorization', `Bearer ${options.jwt}`);
    }

    if (options.headers) {
      for (const key in options.headers) {
        if (options.headers.hasOwnProperty(key)) {
          xhr.setRequestHeader(key, options.headers[key]);
        }
      }
    }
    return xhr;
  }

  private setJSONHeaderIfAppropriate(
    xhr: XMLHttpRequest,
    options: any,
  ): XMLHttpRequest {
    if (options.json) {
      xhr.setRequestHeader('content-type', 'application/json');
    }
    return xhr;
  }
}
