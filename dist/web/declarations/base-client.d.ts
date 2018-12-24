import { Logger } from './logger';
import { ElementsHeaders } from './network';
import { RequestOptions } from './request';
import { RetryStrategyOptions } from './retry-strategy';
import { Subscription, SubscriptionListeners } from './subscription';
import { TokenProvider } from './token-provider';
export interface BaseClientOptions {
    host: string;
    encrypted?: boolean;
    logger?: Logger;
    sdkProduct?: string;
    sdkVersion?: string;
}
export declare class BaseClient {
    private options;
    private host;
    private XMLHttpRequest;
    private logger;
    private websocketTransport;
    private httpTransport;
    private sdkProduct;
    private sdkVersion;
    private sdkPlatform;
    constructor(options: BaseClientOptions);
    request(options: RequestOptions, tokenParams?: any): Promise<any>;
    subscribeResuming(path: string, headers: ElementsHeaders, listeners: SubscriptionListeners, retryStrategyOptions: RetryStrategyOptions, initialEventId?: string, tokenProvider?: TokenProvider): Subscription;
    subscribeNonResuming(path: string, headers: ElementsHeaders, listeners: SubscriptionListeners, retryStrategyOptions: RetryStrategyOptions, tokenProvider?: TokenProvider): Subscription;
    private infoHeaders;
    private makeRequest;
}
