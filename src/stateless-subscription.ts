import { TokenProvider, NoOpTokenProvider } from './token-provider';
import { ErrorResponse } from './base-client';
import { 
    RetryStrategy, 
    ExponentialBackoffRetryStrategy, 
    Retry, 
    DoNotRetry 
} from './retry-strategy';
import { Logger } from './logger';
import {
    BaseSubscription,
    replaceUnimplementedListenersWithNoOps,
    SubscribeOptions,
    SubscriptionEvent,
} from './base-subscription'; 

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
        
        this.options = replaceUnimplementedListenersWithNoOps(options);
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
                    this.options.onEvent(event);
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
    }
    