import { Logger } from './logger';
// import { assertState } from './resumable-subscription';
import { TokenProvider } from './token-provider';
import { XhrReadyState } from "./base-client";

export enum SubscriptionState {
    UNOPENED = 0, // haven't called xhr.send()
    OPENING,      // called xhr.send(); not yet received response headers
    OPEN,         // received response headers; called onOpen(); expecting message
    ENDING,       // received EOS message; response not yet finished
    ENDED         // called onEnd() or onError(err)
}

export interface Header {
    key: string;
    value: string;
}

export interface SubscribeOptions {

    path: string;
    tokenProvider?: TokenProvider;
    headers: Array<Header>;

    logger: Logger;

    onOpen?: () => void;
    onEvent?: (event: Event) => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
}



export class BaseSubscription {

    private state: SubscriptionState = SubscriptionState.UNOPENED;

    constructor(
        private xhr: XMLHttpRequest,
        private options: SubscribeOptions
    ){  

        //Apply headers         
        options.headers.forEach(header => {
            xhr.setRequestHeader(header.key, header.value);
        });  

        //onReadyStateChange
        xhr.onreadystatechange = () => {

            switch(this.xhr.readyState){

                case XhrReadyState.UNSENT:
                case XhrReadyState.OPENED:
                case XhrReadyState.HEADERS_RECEIVED:
                    this.assertStateIsIn([SubscriptionState.OPENING]);
                    break;
                
                


            }
           
            if (
                this.xhr.readyState === XhrReadyState.UNSENT ||
                this.xhr.readyState === XhrReadyState.OPENED ||
                this.xhr.readyState === XhrReadyState.HEADERS_RECEIVED
            ) {
                // Too early for us to do anything.
                this.assertStateIsIn([SubscriptionState.OPENING]);
            }






        } 


    }

    /**
     * Asserts whether this subscription falls in one of the expected states and logs a warning if it's not. 
     * @param validStates Array of possible states this subscription could be in.
     */
    private assertStateIsIn(validStates: Array<SubscriptionState>){
        const stateIsValid = validStates.some( validState => validState === this.state );
        if(!stateIsValid){
            const expectedStates = validStates.map( state => SubscriptionState[state]).join(', ');
            const actualState = SubscriptionState[this.state];
            this.options.logger.warn(`Expected this.state to be one of [${expectedStates}] but it is ${actualState}`);
        }
    } 
}
