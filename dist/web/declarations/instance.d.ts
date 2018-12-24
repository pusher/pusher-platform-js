import { BaseClient } from './base-client';
import { Logger } from './logger';
import { ElementsHeaders } from './network';
import { RequestOptions } from './request';
import { RetryStrategyOptions } from './retry-strategy';
import { Subscription, SubscriptionListeners } from './subscription';
import { TokenProvider } from './token-provider';
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
    logger: Logger;
    tokenProvider?: TokenProvider;
    private client;
    private host;
    private id;
    private cluster;
    private platformVersion;
    private serviceVersion;
    private serviceName;
    constructor(options: InstanceOptions);
    request(options: RequestOptions, tokenParams?: any): Promise<any>;
    subscribeNonResuming(options: SubscribeOptions): Subscription;
    subscribeResuming(options: ResumableSubscribeOptions): Subscription;
    private absPath;
}
