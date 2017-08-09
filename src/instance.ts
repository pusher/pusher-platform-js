import { ExponentialBackoffRetryStrategy, RetryStrategy } from './retry-strategy';
import { TokenProvider } from './token-provider';
import { BaseClient } from './base-client';
import { RequestOptions } from './base-client';
import { ConsoleLogger, Logger } from './logger';
import { ResumableSubscribeOptions, ResumableSubscription } from './resumable-subscription';
import { StatelessSubscribeOptions, StatelessSubscription } from './stateless-subscription';

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
                    
        if (!options.jwt && options.tokenProvider) {
             return options.tokenProvider.fetchToken().then((jwt) => {
                 return this.client.request({ jwt, ...options });
             });
         } else {
             return this.client.request(options);
         }
    }
    
    subscribe(options: StatelessSubscribeOptions): StatelessSubscription {
        this.logger.verbose("Starting to statelessly subscribe");
        options.path = this.absPath(options.path);
        if(!options.logger) options.logger = this.logger;

        let subscription: StatelessSubscription = 
        this.client.newStatelessSubscription( { ...options } );
        subscription.open();

        return subscription;
    }
    
    resumableSubscribe(options: ResumableSubscribeOptions): ResumableSubscription {
        options.path = this.absPath(options.path);
        if(!options.logger) options.logger = this.logger;
        
        let resumableSubscription: ResumableSubscription =
        this.client.newResumableSubscription({ ...options });
        resumableSubscription.open();
        
        return resumableSubscription;
    }
    
    private absPath(relativePath: string): string {
        return `/services/${this.serviceName}/${this.serviceVersion}/${this.id}/${relativePath}`.replace(/\/+/g, "/").replace(/\/+$/, "");
    }
}