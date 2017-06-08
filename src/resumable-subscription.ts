import { TokenProvider } from './token-provider';
import { Subscription } from './subscription';
import { ErrorResponse, Event } from './base-client';
import { RetryStrategy, ExponentialBackoffRetryStrategy, Retry, DoNotRetry } from './retry-strategy';

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
    private retryStrategy: RetryStrategy = new ExponentialBackoffRetryStrategy({});

    private log: (message: string) => void = (message) => {};

    constructor(
        private xhrSource: () => XMLHttpRequest,
        private options: ResumableSubscribeOptions
    ) {
        this.assertState = assertState.bind(this, ResumableSubscriptionState);
        this.lastEventIdReceived = options.lastEventId;
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
                const shouldRetry = this.retryStrategy.shouldRetry(error);

                if(shouldRetry instanceof Retry){
                    this.state = ResumableSubscriptionState.OPENING;
                    if (this.options.onOpening) { this.options.onOpening(); }
                    this.backoff(shouldRetry.waitTimeMilis);
                }
                else {
                    this.state = ResumableSubscriptionState.ENDED;
                    if (this.options.onError) { this.options.onError(error); }
                }
            },
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

    backoff(delayMillis: number): void {
        
        console.log("Trying reconnect in " + delayMillis + " ms.");
        window.setTimeout(this.tryNow.bind(this), delayMillis);
    }

    open(): void {
        this.tryNow();
    }

    unsubscribe() {
        this.subscription.unsubscribe(); // We'll get onEnd and bubble this up
    }
}
