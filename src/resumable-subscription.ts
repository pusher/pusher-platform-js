import { TokenProvider } from './token-provider';
import { ErrorResponse } from './base-client';
import { RetryStrategy, ExponentialBackoffRetryStrategy, Retry, DoNotRetry } from './retry-strategy';
import { Logger } from './logger';
import { BaseSubscription, SubscribeOptions, SubscriptionEvent } from './base-subscription' 

export interface ResumableSubscribeOptions extends SubscribeOptions {
    lastEventId?: string;
    retryStrategy?: RetryStrategy;
    tokenProvider?: TokenProvider; 
}

// pattern of callbacks: ((onOpening (onOpen onEvent*)?)? (onError|onEnd)) | onError
export class ResumableSubscription {

    private baseSubscription: BaseSubscription;
    private lastEventIdReceived: string;
    private retryStrategy: RetryStrategy;
    private logger: Logger;

    constructor(
        private xhrSource: () => XMLHttpRequest,
        private options: ResumableSubscribeOptions
    ) {
        // this.assertState = assertState.bind(this, ResumableSubscriptionState);
        this.lastEventIdReceived = options.lastEventId;
        this.logger = options.logger;
        
        //Use the default RetryStrategy is none exists
        if(options.retryStrategy !== undefined){
             this.retryStrategy = options.retryStrategy;
        }
        else{
            this.retryStrategy = new ExponentialBackoffRetryStrategy({
                logger: this.logger
            })
        }
    }

    tryNow(): void {
        let newXhr = this.xhrSource();
        
        if (this.lastEventIdReceived) {
            newXhr.setRequestHeader("Last-Event-Id", this.lastEventIdReceived);
        }
        
        this.baseSubscription = new BaseSubscription(newXhr, {
            path: this.options.path,
            headers: this.options.headers,
            
            onOpen: () => {
                if (this.options.onOpen) { this.options.onOpen(); }
                this.retryStrategy.reset(); //We need to reset the counter once the connection has been re-established.
            },
            onEvent: (event: SubscriptionEvent) => {
                if (this.options.onEvent) { this.options.onEvent(event); }
                this.lastEventIdReceived = event.eventId;
            },
            onEnd: () => {
                if (this.options.onEnd) { this.options.onEnd(); }
            },
            onError: (error: Error) => {
                this.retryStrategy.attemptRetry(error)
                .then(() => { 
                  if (this.options.onRetry !== undefined) {
                    this.options.onRetry();
                  } else {
                    this.tryNow();
                  }
                })
                .catch(error => {
                    if (this.options.onError) { this.options.onError(error); }
                })},
            logger: this.logger
        });
               
        if (this.options.tokenProvider) {
            this.options.tokenProvider.fetchToken().then((jwt) => {
                this.baseSubscription.open(jwt);
            }).catch((err) => {
                if(this.options.onError) this.options.onError(err);
            });
        } else {
            this.baseSubscription.open();
        }
    }

    open(): void {
        this.tryNow();
    }

    unsubscribe(error?: Error) {
        if(!this.baseSubscription){
            throw new Error("Subscription doesn't exist! Have you called open()?");
        }
        this.baseSubscription.unsubscribe(error); // We'll get onEnd and bubble this up
    }
}
