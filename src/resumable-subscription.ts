import { NoOpTokenProvider, TokenProvider } from './token-provider';
import { ErrorResponse } from './base-client';
import { RetryStrategy, ExponentialBackoffRetryStrategy, Retry, DoNotRetry } from './retry-strategy';
import { Logger } from './logger';
import { BaseSubscription, SubscribeOptions, SubscriptionEvent } from './base-subscription' 

export interface ResumableSubscribeOptions extends SubscribeOptions {
    lastEventId?: string;
    retryStrategy?: () => RetryStrategy;
    tokenProvider?: TokenProvider; 
}

export class ResumableSubscription {
    
    private baseSubscription: BaseSubscription;
    private lastEventIdReceived: string;
    private retryStrategy: RetryStrategy;
    private logger: Logger;
    
    constructor(
        private xhrSource: () => XMLHttpRequest,
        private options: ResumableSubscribeOptions
    ) {
        this.lastEventIdReceived = options.lastEventId;
        this.logger = options.logger;
        this.retryStrategy = options.retryStrategy();
        
        if(!this.options.tokenProvider)
            this.options.tokenProvider = new NoOpTokenProvider();
        
        this.options = this.replaceUnimplementedListenersWithNoOps(options);
    }
    
    private tryNow(): void {
        let newXhr = this.xhrSource();
        
        if (this.lastEventIdReceived) {
            newXhr.setRequestHeader("Last-Event-Id", this.lastEventIdReceived);
        }
        
        this.options.tokenProvider.fetchToken()
        .then( token => {
            this.baseSubscription = new BaseSubscription(newXhr, {
                path: this.options.path,
                headers: this.options.headers,
                jwt: token,
                
                onOpen: () => {
                    this.options.onOpen();
                    this.retryStrategy.reset(); //We need to reset the counter once the connection has been re-established.
                },
                onEvent: (event: SubscriptionEvent) => {
                    this.options.onEvent(event);
                    this.lastEventIdReceived = event.eventId;
                },
                onEnd: () => {
                    this.options.onEnd();
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
                        this.options.onError(error);
                    })},
                    logger: this.logger
                });
                this.baseSubscription.open();
            })
            .catch(error => {
                this.options.onError(error);
            });
        }
        
        open(): void {
            this.tryNow();
        }
        
        unsubscribe() {
            if(!this.baseSubscription){
                throw new Error("Subscription doesn't exist! Have you called open()?");
            }
            this.retryStrategy.cancel();
            this.baseSubscription.unsubscribe(); // We'll get onEnd and bubble this up
        }
        
        /**
        * Allows avoiding making null check every. Single. Time.
        * @param options the options that come in
        * @returns the mutated options
        * TODO: should this be cloned instead?
        */
        replaceUnimplementedListenersWithNoOps(options: SubscribeOptions): SubscribeOptions{
            if(!options.onOpen) options.onOpen = () => {};
            if(!options.onEvent) options.onEvent = (event) => {};
            if(!options.onEnd) options.onEnd = () => {};
            if(!options.onError) options.onError = (error) => {}; 
            return options;
        }
    }
    