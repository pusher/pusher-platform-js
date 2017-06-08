import { TokenProvider } from './token-provider';
import { Subscription } from './subscription';
import { Event } from './base-client'

export interface ResumableSubscribeOptions {
    path: string;
    lastEventId?: string;
    tokenProvider?: TokenProvider;
    onOpening?: () => void;
    onOpen?: () => void;
    onEvent?: (event: Event) => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
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
    private delayMillis: number = 0;

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
                if (this.isResumableError(error)) {
                    this.state = ResumableSubscriptionState.OPENING;
                    if (this.options.onOpening) { this.options.onOpening(); }
                    this.backoff();
                } else {
                    this.state = ResumableSubscriptionState.ENDED;
                    if (this.options.onError) { this.options.onError(error); }
                }
            },
        });
        if (this.options.tokenProvider) {
            this.options.tokenProvider.provideToken().then((jwt) => {
                this.subscription.open(jwt);
            }).catch((err) => {
                // This is a resumable error?
                console.log("Error getting auth token; backing off");
                this.backoff();
            });
        } else {
            this.subscription.open(null);
        }
    }

    backoff(): void {
        this.delayMillis = this.delayMillis * 2 + 1000;
        console.log("Trying reconnect in " + this.delayMillis + " ms.");
        window.setTimeout(() => { this.tryNow(); }, this.delayMillis);
    }

    open(): void {
        this.tryNow();
    }

    private isResumableError(error: Error) {
        return error.message === "resumable"; // TODO this is a horrible way to represent resumableness
    }

    unsubscribe() {
        this.subscription.unsubscribe(); // We'll get onEnd and bubble this up
    }
}
