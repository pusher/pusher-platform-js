import { ElementsHeaders } from './network';
import { Subscription, SubscriptionListeners } from './subscription';
import { RequestOptions } from './request';
import { BaseClient } from './base-client';
import { ConsoleLogger, Logger } from './logger';
import { TokenProvider } from './token-provider';
import { RetryStrategyOptions } from './retry-strategy';
import * as CancelablePromise from 'p-cancelable';

const HOST_BASE = "pusherplatform.io";

export interface InstanceOptions {
    instanceId: string;
    serviceName: string;
    serviceVersion: string;
    host?: string; //Allows to inject the hostname by default.
    logger?: Logger;
    client?: BaseClient;
    encrypted?: boolean;
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
    private logger: Logger;
    
    constructor(options: InstanceOptions) {
        if (!options.instanceId) throw new Error('Expected `instanceId` property in Instance options!');
        if (options.instanceId.split(":").length !== 3) throw new Error('The instance property is in the wrong format!');
        if(!options.serviceName) throw new Error('Expected `serviceName` property in Instance options!');
        if(!options.serviceVersion) throw new Error('Expected `serviceVersion` property in Instance otpions!');
        
        let splitInstance = options.instanceId.split(":");
        this.platformVersion = splitInstance[0];
        this.cluster = splitInstance[1];
        this.id = splitInstance[2];
        
        this.serviceName = options.serviceName;
        this.serviceVersion = options.serviceVersion;
        
        this.host = options.host || `${this.cluster}.${HOST_BASE}`;
        this.logger = options.logger || new ConsoleLogger();
        
        this.client = options.client || new BaseClient({
            encrypted: options.encrypted,
            host: this.host,
            logger: this.logger
        });
    }
    

    request(options: RequestOptions): CancelablePromise<any>{
        options.path = this.absPath(options.path);
        return this.client.request(options);
    }

    subscribeNonResuming(options: SubscribeOptions): Subscription { 
        
        const headers: ElementsHeaders = options.headers || {};
        const retryStrategyOptions = options.retryStrategyOptions || {};
        const tokenProvider = options.tokenProvider;
    
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
        const tokenProvider = options.tokenProvider;
    
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