import { RequestOptions } from './request';
import { NonResumableSubscribeOptions, NonResumableSubscription } from './subscription/non-resumable-subscription';
import { RetryStrategy } from './retry-strategy/retry-strategy';
import { TokenProvider } from './token-provider';
import { BaseClient } from './base-client';
import { ConsoleLogger, Logger } from './logger';
import { ResumableSubscribeOptions, ResumableSubscription } from './subscription/resumable-subscription';

const HOST_BASE = "pusherplatform.io";

export interface InstanceOptions {
    instanceId: string;
    serviceName: string;
    serviceVersion: string;
    host?: string; //Allows to inject the hostname by default.
    logger?: Logger;
    tokenProvider?: TokenProvider;
    client?: BaseClient;
    encrypted?: boolean;
}

type Response = any;

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
    
    request(options: RequestOptions): Promise<any> {
        options.path = this.absPath(options.path);
        if(!options.logger) options.logger = this.logger;

        return this.client.request(options);
    }
    
    subscribe(options: NonResumableSubscribeOptions): NonResumableSubscription {
        this.logger.verbose("Starting to subscribe to a non-resumable subscription");
        options.path = this.absPath(options.path);
        options.logger = this.logger;

        return this.client.newNonResumableSubscription(options);;
    }
    
    resumableSubscribe(options: ResumableSubscribeOptions): ResumableSubscription {
        this.logger.verbose("Starting to subscribe to a resumable subscription");
        
        options.path = this.absPath(options.path);
        options.logger = this.logger;
        
        return this.client.newResumableSubscription(options);
    }
    
    private absPath(relativePath: string): string {
        return `/services/${this.serviceName}/${this.serviceVersion}/${this.id}/${relativePath}`.replace(/\/+/g, "/").replace(/\/+$/, "");
    }
}