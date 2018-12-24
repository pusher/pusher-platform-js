import { ElementsHeaders } from '../network';
import { RequestOptions } from '../request';
import { Subscription, SubscriptionListeners, SubscriptionTransport } from '../subscription';
export declare enum HttpTransportState {
    UNOPENED = 0,
    OPENING = 1,
    OPEN = 2,
    ENDING = 3,
    ENDED = 4
}
export default class HttpTransport implements SubscriptionTransport {
    private baseURL;
    constructor(host: string, encrypted?: boolean);
    request(requestOptions: RequestOptions): XMLHttpRequest;
    subscribe(path: string, listeners: SubscriptionListeners, headers: ElementsHeaders): Subscription;
    private createXHR;
    private setJSONHeaderIfAppropriate;
}
