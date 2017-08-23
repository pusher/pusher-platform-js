import { TokenProvider } from '../token-provider';
import { RetryStrategy } from '../retry-strategy/retry-strategy';
import { Logger } from '../logger';
import { XhrReadyState, NetworkError, ErrorResponse, Headers, responseHeadersObj } from "../base-client";

export enum SubscriptionState {
    UNOPENED = 0, // haven't called xhr.send()
    OPENING,      // called xhr.send(); not yet received response headers
    OPEN,         // received response headers; called onOpen(); expecting message
    ENDING,       // received EOS message; response not yet finished
    ENDED         // called onEnd() or onError(err)
}

export interface SubscriptionEvent {
    eventId: string;
    headers: Headers;
    body: any;
}

export function createSubscriptionConstructor(
    retryStrategy: RetryStrategy, 
    headers: Headers, 
    xhrSource: () => XMLHttpRequest): 
    (error: any, lastEventId?: string) => BaseSubscriptionConstruction {
        return  (error: any, lastEventId?: string) => { 
            return new BaseSubscriptionConstruction(retryStrategy, xhrSource, error, lastEventId); 
        };   
    }
    
    export class BaseSubscriptionConstruction {
        private subscription: BaseSubscription;
        private error: any;
        private subscriptionCallback: (subscription: BaseSubscription) => void;
        private errorCallback: (error: any) => void;
        
        constructor(
            private retryStrategy: RetryStrategy,
            xhrSource: () => XMLHttpRequest,
            error: any,
            lastEventId?: string
        ){
            retryStrategy.executeSubscription( 
                null,
                xhrSource, 
                lastEventId,
                (subscription) => { 
                    if(this.subscriptionCallback) this.subscriptionCallback(subscription); 
                    else this.subscription = subscription;
                },
                (error) => {
                    if(this.errorCallback) this.errorCallback(error);
                    else this.error = error;
                }
            );
        }
        
        //These either execute immediately, or whenever the sub is created (or error is raised)
        onComplete( callback: (subscription: BaseSubscription) => void ){
            if(this.subscription) callback(this.subscription);
            else this.subscriptionCallback = callback;
        }
        onError( callback: (error: any) => void ){
            if(this.error) callback(this.error);
            else this.errorCallback = callback;
        }

        cancel(){
            this.retryStrategy.stopRetrying(); //TODO:
        }
    }
        
    export class BaseSubscription {
        
        private state: SubscriptionState = SubscriptionState.UNOPENED;
        
        //new public api.
        //no-ops at construction time.
        public onOpen: (headers: Headers) => void = () => {};
        public onEvent: (event: SubscriptionEvent) => void = () => {};
        public onEnd: (error?: ErrorResponse) => void = () => {};
        public onError: (error: any) => void = () => {};
        
        constructor(
            private xhr: XMLHttpRequest,
            private logger: Logger,
            onOpen: (headers: Headers) => void,
            onError: (error: any) => void, 
        ){
            this.onOpen = onOpen;
            this.onError = onError;
            
            xhr.onreadystatechange = () => {
                switch(this.xhr.readyState) {
                    case XhrReadyState.UNSENT:
                    case XhrReadyState.OPENED:
                    case XhrReadyState.HEADERS_RECEIVED:
                    this.assertStateIsIn(SubscriptionState.OPENING);
                    break;
                    
                    case XhrReadyState.LOADING:
                    this.onLoading();
                    break;
                    
                    case XhrReadyState.DONE:
                    this.onDone();
                    break;
                }
            }
            this.state = SubscriptionState.OPENING;
            this.xhr.send();
        }  
        
        public unsubscribe(): void {
            this.state = SubscriptionState.ENDED;
            this.xhr.abort();
            this.onEnd();
        }

        public getHeaders(): Headers {
            return responseHeadersObj(this.xhr.getAllResponseHeaders());
        }
        
        private onLoading(): void {
            this.assertStateIsIn(SubscriptionState.OPENING, SubscriptionState.OPEN, SubscriptionState.ENDING);
            if(this.xhr.status === 200){
                
                //Check if we just transitioned to the open state
                if(this.state === SubscriptionState.OPENING) {
                    this.state = SubscriptionState.OPEN;
                    this.onOpen(responseHeadersObj(this.xhr.getAllResponseHeaders()));
                }
                
                this.assertStateIsIn(SubscriptionState.OPEN);
                let err = this.onChunk(); // might transition our state from OPEN -> ENDING
                this.assertStateIsIn(SubscriptionState.OPEN, SubscriptionState.ENDING);
                
                if (err) {
                    this.state = SubscriptionState.ENDED;
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
                if (this.state === SubscriptionState.OPENING) {
                    this.state = SubscriptionState.OPEN;
                    this.onOpen(responseHeadersObj(this.xhr.getAllResponseHeaders()));
                }
                this.assertStateIsIn( SubscriptionState.OPEN, SubscriptionState.ENDING );
                let err = this.onChunk();
                if (err) {
                    this.state = SubscriptionState.ENDED;
                    if ( (err as any).statusCode === 204 ) { //TODO: That cast is horrific
                        this.onEnd();
                    }
                    else {
                        this.onError(err);
                    }
                } else if (this.state <= SubscriptionState.ENDING) {
                    this.onError(new Error("HTTP response ended without receiving EOS message"));
                } else {
                    // Stream ended normally.
                    this.onEnd();
                }
            }
            
            else {
                this.assertStateIsIn(SubscriptionState.OPENING, SubscriptionState.OPEN, SubscriptionState.ENDED);
                
                if (this.state === SubscriptionState.ENDED) {
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
            this.assertStateIsIn(SubscriptionState.OPEN);
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
            this.assertStateIsIn(SubscriptionState.OPEN);
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
            this.assertStateIsIn(SubscriptionState.OPEN);
            
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
            this.assertStateIsIn(SubscriptionState.OPEN);
            
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
        
        /******
        Utility methods
        ******/
        
        /**
        * Asserts whether this subscription falls in one of the expected states and logs a warning if it's not.
        * @param validStates Array of possible states this subscription could be in.
        */
        private assertStateIsIn(...validStates: SubscriptionState[]){
            const stateIsValid = validStates.some( validState => validState === this.state );
            if(!stateIsValid){
                const expectedStates = validStates.map( state => SubscriptionState[state]).join(', ');
                const actualState = SubscriptionState[this.state];
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
