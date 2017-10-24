import { TokenProvider } from './token-provider';
import { Logger } from './logger';
import { XhrReadyState, ElementsHeaders, responseToHeadersObject, ErrorResponse, NetworkError } from './network';
import { SubscriptionEvent, Subscription, SubscriptionTransport } from './subscription';

export class BaseSubscription implements Subscription {
    private subID: number;
    
    constructor(
        private path: string,
        private transport: SubscriptionTransport,
        private headers: ElementsHeaders,
        private logger: Logger,
        private onOpen: (headers: ElementsHeaders) => void = headers => {},
        private onError: (error: any) => void = error => {}, 
        private onEvent: (event: SubscriptionEvent) => void = event => {},
        private onEnd: (error?: any) => void = error => {},
        subID?: number
    ) {
        this.subID = this.transport.subscribe(
            path,
            {
                onOpen,
                onError,
                onEvent,
                onEnd
            },
            headers,
            subID
        );
    }

    public unsubscribe () {
        this.transport.unsubscribe(this.subID);
    }

}
