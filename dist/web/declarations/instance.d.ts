import { ElementsHeaders } from './network';
import { Subscription, SubscriptionListeners } from './subscription';
import { RequestOptions } from './request';
import { BaseClient } from './base-client';
import { Logger } from './logger';
import { TokenProvider } from './token-provider';
import { RetryStrategyOptions } from './retry-strategy';
export interface InstanceOptions {
    locator: string;
    serviceName: string;
    serviceVersion: string;
    host?: string;
    logger?: Logger;
    client?: BaseClient;
    encrypted?: boolean;
    tokenProvider?: TokenProvider;
}
export interface SubscribeOptions {
    path: string;
    headers?: ElementsHeaders;
    listeners: SubscriptionListeners;
    retryStrategyOptions?: RetryStrategyOptions;
    tokenProvider?: TokenProvider;
}
export interface ResumableSubscribeOptions extends SubscribeOptions {
    initialEventId?: string;
}
export default class Instance {
    private client;
    private host;
    private id;
    private cluster;
    private platformVersion;
    private serviceVersion;
    private serviceName;
    private tokenProvider?;
    logger: Logger;
    constructor(options: InstanceOptions);
    request(options: RequestOptions, tokenProvider?: TokenProvider, tokenParams?: any): Promise<any>;
    subscribeNonResuming(options: SubscribeOptions): Subscription;
    subscribeResuming(options: ResumableSubscribeOptions): Subscription;
    private absPath(relativePath);
}
