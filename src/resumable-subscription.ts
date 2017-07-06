import { TokenProvider } from './token-provider';
import { Subscription } from './subscription';
import { ErrorResponse, Event } from './base-client';
import { RetryStrategy, ExponentialBackoffRetryStrategy, Retry, DoNotRetry } from './retry-strategy';
import { Logger } from './logger';

export interface ResumableSubscribeOptions {
    path: string;
    lastEventId?: string;
    tokenProvider?: TokenProvider;
    onOpening?: () => void;
    onOpen?: () => void;
    onEvent?: (event: Event) => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
    retryStrategy?: RetryStrategy;
    onRetry?: ()=>void;
    logger?: Logger;
}

export enum ResumableSubscriptionState {
    UNOPENED = 0,
    OPENING,      // can be visited multiple times
    OPEN,         // called onOpen(); expecting message
    ENDING,       // received EOS message; response not yet finished
    ENDED         // called onEnd() or onError(err)
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

// pattern of callbacks: ((onOpening (onOpen onEvent*)?)? (onError|onEnd)) | onError
export class ResumableSubscription {

    private state: ResumableSubscriptionState = ResumableSubscriptionState.UNOPENED;
    private assertState: Function;
    private subscription: Subscription;
    private lastEventIdReceived: string;
    private retryStrategy: RetryStrategy;
    private logger?: Logger;

    constructor(
        private xhrSource: () => XMLHttpRequest,
        private options: ResumableSubscribeOptions
    ) {
        this.assertState = assertState.bind(this, ResumableSubscriptionState);
        this.lastEventIdReceived = options.lastEventId;
        this.logger = options.logger;
        
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
        this.state = ResumableSubscriptionState.OPENING;
        let newXhr = this.xhrSource();
        this.subscription = new Subscription(newXhr, {
            path: this.options.path,
            lastEventId: this.lastEventIdReceived,
            onOpen: () => {
                this.assertState(['OPENING']);
                this.state = ResumableSubscriptionState.OPEN;
                if (this.options.onOpen) { this.options.onOpen(); }
                this.retryStrategy.reset(); //We need to reset the counter once the connection has been re-established.
            },
            onEvent: (event: Event) => {
                this.assertState(['OPEN']);
                if (this.options.onEvent) { this.options.onEvent(event); }
                console.assert(
                    !this.lastEventIdReceived ||
                    parseInt(event.eventId) > parseInt(this.lastEventIdReceived),
                    'Expected the current event id to be larger than the previous one'
                );
                this.lastEventIdReceived = event.eventId;
            },
            onEnd: () => {
                this.state = ResumableSubscriptionState.ENDED;
                if (this.options.onEnd) { this.options.onEnd(); }
            },
            onError: (error: Error) => {
                this.state = ResumableSubscriptionState.OPENING
                this.retryStrategy.attemptRetry(error)
                .then(() => {
                  if (this.options.onRetry !== undefined) {
                    this.options.onRetry();
                  } else {
                    this.tryNow();
                  }
                })
                .catch(error => {
                    this.state = ResumableSubscriptionState.ENDED;
                    if (this.options.onError) { this.options.onError(error); }
                })},
            logger: this.logger
        });
               
        if (this.options.tokenProvider) {
            this.options.tokenProvider.fetchToken().then((jwt) => {
                this.subscription.open(jwt);
            }).catch((err) => {
                if(this.options.onError) this.options.onError(err);
            });
        } else {
            this.subscription.open(null);
        }
    }

    open(): void {
        this.tryNow();
    }

    unsubscribe(error?: Error) {
        this.subscription.unsubscribe(error); // We'll get onEnd and bubble this up
    }
}
