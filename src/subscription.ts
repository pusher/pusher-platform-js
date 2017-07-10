import { TokenProvider } from './token-provider';
import { ErrorResponse, NetworkError, Event, XhrReadyState } from './base-client';
import { Logger } from './logger';

export enum SubscriptionState {
    UNOPENED = 0, // haven't called xhr.send()
    OPENING,      // called xhr.send(); not yet received response headers
    OPEN,         // received response headers; called onOpen(); expecting message
    ENDING,       // received EOS message; response not yet finished
    ENDED         // called onEnd() or onError(err)
}

export interface SubscribeOptions {
    path: string;
    tokenProvider?: TokenProvider;
    jwt?: string;
    lastEventId?: string;
    onOpen?: () => void;
    onEvent?: (event: Event) => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
    logger: Logger;
}

// Asserts that the subscription state is one of the specified values,
// otherwise logs the current value.
export function assertState(stateEnum, states = []) {
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
                        this.state = SubscriptionState.ENDED;
                        if((err as ErrorResponse).statusCode != 204){
                            if (this.options.onError) { this.options.onError(err); }
                        }
                        // Because we abort()ed, we will get no more calls to our onreadystatechange handler,
                        // and so we will not call the event handler again.
                        // Finish with options.onError instead of the options.onEnd.

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

                        if((err as any).statusCode === 204){
                            
                            if (this.options.onEnd) {
                                this.options.onEnd();
                            }
                        }
                        else{
                            if (this.options.onError) { this.options.onError(err); }
                        }
                    } else if (this.state <= SubscriptionState.ENDING) {
                        if (this.options.onError) { this.options.onError(new Error("HTTP response ended without receiving EOS message")); }
                    } else {
                        // Stream ended normally.
                        if (this.options.onEnd) { this.options.onEnd(); }
                    }
               
                } 
                
                else {

                    // The server responded with a bad status code (finish with onError).
                    // Finish with an error.

                    this.assertState(['OPENING', 'OPEN', 'ENDED']);
                    if (this.state === SubscriptionState.ENDED) {
                        // We aborted the request deliberately, and called onError/onEnd elsewhere.
                    }
                    //Something terrible has happened. Most likely a network error. XHR is useless at that point.
                    else if(this.xhr.status === 0){
                        this.options.onError(new NetworkError("Connection lost."));

                    }else{
                        this.options.onError(ErrorResponse.fromXHR(this.xhr));
                    }
                }
            }
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
        return new ErrorResponse(statusCode, headers, info);
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
