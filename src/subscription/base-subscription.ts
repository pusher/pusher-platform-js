import { TokenProvider } from '../token-provider';
import { RetryStrategy } from '../retry-strategy/retry-strategy';
import { Logger } from '../logger';
import { XhrReadyState, NetworkError, ErrorResponse, Headers, responseHeadersObj } from "../base-client";
import { SubscriptionEvent } from '../rejig/subscription';

export enum BaseSubscriptionState {
    UNOPENED = 0, // haven't called xhr.send()
    OPENING,      // called xhr.send(); not yet received response headers
    OPEN,         // received response headers; called onOpen(); expecting message
    ENDING,       // received EOS message; response not yet finished
    ENDED         // called onEnd() or onError(err)
}

export type BaseSubscriptionConstruction = (headers: Headers) => Promise<BaseSubscription>;
        
    export class BaseSubscription {
        
        private state: BaseSubscriptionState = BaseSubscriptionState.UNOPENED;
        
        constructor(
            private xhr: XMLHttpRequest,
            private logger: Logger,
            private onOpen: (headers: Headers) => void = headers => {},
            private onError: (error: any) => void = error => {}, 
            private onEvent: (event: SubscriptionEvent) => void = event => {},
            private onEnd: (error?: any) => void = error => {}
        ){            
            xhr.onreadystatechange = () => {
                switch(this.xhr.readyState) {
                    case XhrReadyState.UNSENT:
                    case XhrReadyState.OPENED:
                    case XhrReadyState.HEADERS_RECEIVED:
                    this.assertStateIsIn(BaseSubscriptionState.OPENING);
                    break;
                    
                    case XhrReadyState.LOADING:
                    this.onLoading();
                    break;
                    
                    case XhrReadyState.DONE:
                    this.onDone();
                    break;
                }
            }
            this.state = BaseSubscriptionState.OPENING;
            this.xhr.send();
        }  
        
        public unsubscribe(): void {
            this.state = BaseSubscriptionState.ENDED;
            this.xhr.abort();
            this.onEnd();
        }

        public getHeaders(): Headers {
            return responseHeadersObj(this.xhr.getAllResponseHeaders());
        }
        
        private onLoading(): void {
            this.assertStateIsIn(BaseSubscriptionState.OPENING, BaseSubscriptionState.OPEN, BaseSubscriptionState.ENDING);
            if(this.xhr.status === 200){
                
                //Check if we just transitioned to the open state
                if(this.state === BaseSubscriptionState.OPENING) {
                    this.state = BaseSubscriptionState.OPEN;
                    this.onOpen(responseHeadersObj(this.xhr.getAllResponseHeaders()));
                }
                
                this.assertStateIsIn(BaseSubscriptionState.OPEN);
                let err = this.onChunk(); // might transition our state from OPEN -> ENDING
                this.assertStateIsIn(BaseSubscriptionState.OPEN, BaseSubscriptionState.ENDING);
                
                if (err) {
                    this.state = BaseSubscriptionState.ENDED;
                    if((err as ErrorResponse).statusCode != 204){
                        this.onError(err);
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
                if (this.state === BaseSubscriptionState.OPENING) {
                    this.state = BaseSubscriptionState.OPEN;
                    this.onOpen(responseHeadersObj(this.xhr.getAllResponseHeaders()));
                }
                this.assertStateIsIn( BaseSubscriptionState.OPEN, BaseSubscriptionState.ENDING );
                let err = this.onChunk();
                if (err) {
                    this.state = BaseSubscriptionState.ENDED;
                    if ( (err as any).statusCode === 204 ) { //TODO: That cast is horrific
                        this.onEnd();
                    }
                    else {
                        this.onError(err);
                    }
                } else if (this.state <= BaseSubscriptionState.ENDING) {
                    this.onError(new Error("HTTP response ended without receiving EOS message"));
                } else {
                    // Stream ended normally.
                    this.onEnd();
                }
            }
            
            else {
                this.assertStateIsIn(BaseSubscriptionState.OPENING, BaseSubscriptionState.OPEN, BaseSubscriptionState.ENDED);
                
                if (this.state === BaseSubscriptionState.ENDED) {
                    // We aborted the request deliberately, and called onError/onEnd elsewhere.
                    return;
                }
                //Something terrible has happened. Most likely a network error. XHR is useless at that point.
                else if(this.xhr.status === 0) {
                    this.onError(new NetworkError("Connection lost."));
                    
                } else {
                    this.onError(ErrorResponse.fromXHR(this.xhr));
                }
            }
        }
        
        private lastNewlineIndex: number = 0;
        
        private onChunk(): Error {
            this.assertStateIsIn(BaseSubscriptionState.OPEN);
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
        
        /******
        Message parsing
        ******/
        
        private gotEOS: boolean = false;
        
        /**
        * Calls options.onEvent 0+ times, then returns an Error or null
        * Also asserts the message is formatted correctly and we're in an allowed state (not terminated).
        */
        private onMessage(message: any[]): Error {
            this.assertStateIsIn(BaseSubscriptionState.OPEN);
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
            this.assertStateIsIn(BaseSubscriptionState.OPEN);
            
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
            this.onEvent({ eventId: id, headers: headers, body: body });
        }
        
        /**
        * EOS message received. Sets subscription state to Ending and returns an error with given status code
        * @param eosMessage final message of the subscription
        */
        
        private onEOSMessage(eosMessage: any[]): Error {
            this.assertStateIsIn(BaseSubscriptionState.OPEN);
            
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
            
            this.state = BaseSubscriptionState.ENDING;
            return new ErrorResponse(statusCode, headers, info);
        }
        
        /******
        Utility methods
        ******/
        
        /**
        * Asserts whether this subscription falls in one of the expected states and logs a warning if it's not.
        * @param validStates Array of possible states this subscription could be in.
        */
        private assertStateIsIn(...validStates: BaseSubscriptionState[]){
            const stateIsValid = validStates.some( validState => validState === this.state );
            if(!stateIsValid){
                const expectedStates = validStates.map( state => BaseSubscriptionState[state]).join(', ');
                const actualState = BaseSubscriptionState[this.state];
                this.logger.warn(`Expected this.state to be one of [${expectedStates}] but it is ${actualState}`);
            }
        }
        
        /**
        * Check if a single subscription message is in the right format.
        * @param message The message to check.
        * @returns null or error if the message is wrong.
        */
        private verifyMessage(message: any[]){
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
