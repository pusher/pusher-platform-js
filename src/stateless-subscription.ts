import { TokenProvider, NoOpTokenProvider } from './token-provider';
import { ErrorResponse } from './base-client';
import { RetryStrategy, ExponentialBackoffRetryStrategy, Retry, DoNotRetry } from './retry-strategy';
import { Logger } from './logger';
import { BaseSubscription, SubscribeOptions, SubscriptionEvent } from './base-subscription' 

export interface StatelessSubscribeOptions extends SubscribeOptions {
    retryStrategy?: RetryStrategy;
    tokenProvider?: TokenProvider; 
}

// pattern of callbacks: ((onOpening (onOpen onEvent*)?)? (onError|onEnd)) | onError
export class StatelessSubscription {
    
    private baseSubscription: BaseSubscription;
    private retryStrategy: RetryStrategy;
    private logger: Logger;
    
    constructor(
        private xhrSource: () => XMLHttpRequest,
        private options: StatelessSubscribeOptions
    ) {
        this.logger = options.logger;
        if(!this.options.tokenProvider)
            this.options.tokenProvider = new NoOpTokenProvider();
        
        this.options = this.replaceUnimplementedListenersWithNoOps(options);
    }
    
    tryNow(): void {
        let newXhr = this.xhrSource();
        
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
                    if (this.options.onEvent) { this.options.onEvent(event); }
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
                this.baseSubscription.open();
            })
            .catch(error => {
                this.options.onError(error);
            });   
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
        
        /**
        * Allows avoiding making null check every. Single. Time.
        * @param options the options that come in
        * @returns the mutated options
        * TODO: should this be cloned instead?
        */
        replaceUnimplementedListenersWithNoOps(options: SubscribeOptions): SubscribeOptions {
            if(!options.onOpen) options.onOpen = () => {};
            if(!options.onEvent) options.onEvent = (event) => {};
            if(!options.onEnd) options.onEnd = () => {};
            if(!options.onError) options.onError = (error) => {}; 
            return options;
        }
    }
    