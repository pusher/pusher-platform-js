import { ElementsHeaders } from './network';
import { Subscription, SubscriptionListeners } from './subscription';
import { RequestOptions } from './request';
import { BaseClient } from './base-client';
import { ConsoleLogger, Logger } from './logger';
import { TokenProvider } from './token-provider';
import { RetryStrategyOptions } from './retry-strategy';

const HOST_BASE = "pusherplatform.io";

export interface InstanceOptions {
    locator: string;
    serviceName: string;
    serviceVersion: string;
    host?: string; //Allows to inject the hostname by default.
    logger?: Logger;
    client?: BaseClient;
    encrypted?: boolean;
    tokenProvider?: TokenProvider;
}

export interface SubscribeOptions {
    path: string,
    headers?: ElementsHeaders,
    listeners: SubscriptionListeners,
    retryStrategyOptions?: RetryStrategyOptions,
    tokenProvider?: TokenProvider
}

export interface ResumableSubscribeOptions extends SubscribeOptions {
    initialEventId?: string
}

export default class Instance {
    private client: BaseClient;
    private host: string;
    private id: string;
    private cluster: string;
    private platformVersion: string;
    private serviceVersion: string;
    private serviceName: string;
    private tokenProvider?: TokenProvider;
    logger: Logger;

    constructor(options: InstanceOptions) {
        if (!options.locator) throw new Error('Expected `locator` property in Instance options!');
        if (options.locator.split(":").length !== 3) throw new Error('The locator property is in the wrong format!');
        if(!options.serviceName) throw new Error('Expected `serviceName` property in Instance options!');
        if(!options.serviceVersion) throw new Error('Expected `serviceVersion` property in Instance otpions!');

        let splitLocator = options.locator.split(":");
        this.platformVersion = splitLocator[0];
        this.cluster = splitLocator[1];
        this.id = splitLocator[2];

        this.serviceName = options.serviceName;
        this.serviceVersion = options.serviceVersion;

        this.host = options.host || `${this.cluster}.${HOST_BASE}`;
        this.logger = options.logger || new ConsoleLogger();

        this.client = options.client || new BaseClient({
            encrypted: options.encrypted,
            host: this.host,
            logger: this.logger
        });

        this.tokenProvider = options.tokenProvider;
    }

    request(options: RequestOptions, tokenProvider?: TokenProvider, tokenParams?: any): Promise<any> {
        options.path = this.absPath(options.path);
        if(options.headers == null || options.headers == undefined){
            options.headers = {}
        }
        const tokenProviderToUse = tokenProvider || this.tokenProvider;
        return this.client.request(options, tokenProviderToUse, tokenParams);
    }

    subscribeNonResuming(options: SubscribeOptions): Subscription {
        const headers: ElementsHeaders = options.headers || {};
        const retryStrategyOptions = options.retryStrategyOptions || {};
        const tokenProvider = options.tokenProvider || this.tokenProvider;

        return this.client.subscribeNonResuming(
            this.absPath(options.path),
            headers,
            options.listeners,
            retryStrategyOptions,
            tokenProvider
        );
    }

    subscribeResuming(options: ResumableSubscribeOptions): Subscription{

        const headers: ElementsHeaders = options.headers || {};
        const retryStrategyOptions = options.retryStrategyOptions || {};
        const tokenProvider = options.tokenProvider || this.tokenProvider;

        return this.client.subscribeResuming(
            this.absPath(options.path),
            headers,
            options.listeners,
            retryStrategyOptions,
            options.initialEventId,
            tokenProvider
        );
    }

    private absPath(relativePath: string): string {
        return `/services/${this.serviceName}/${this.serviceVersion}/${this.id}/${relativePath}`.replace(/\/+/g, "/").replace(/\/+$/, "");
    }
}
