import { TokenProvider } from './token-provider';
import { BaseClient } from './base-client';
import { RequestOptions } from './base-client';
import { ConsoleLogger, Logger } from './logger';
import { ResumableSubscribeOptions, ResumableSubscription } from './resumable-subscription';
// import { SubscribeOptions, Subscription } from './subscription';
import { StatelessSubscribeOptions, StatelessSubscription } from './stateless-subscription';

const HOST_BASE = "pusherplatform.io";

export interface InstanceOptions {

    instance: string;
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

    private instanceId: string;
    private cluster: string;
    private platformVersion: string;
    private serviceVersion: string;
    private serviceName: string;

    private tokenProvider: TokenProvider;
    private logger: Logger;

    constructor(options: InstanceOptions) {
        if (!options.instance) throw new Error('Expected `instance` property in Instance options!');
        if (options.instance.split(":").length !== 3) throw new Error('The instance property is in the wrong format!');
        if(!options.serviceName) throw new Error('Expected `serviceName` property in Instance options!');
        if(!options.serviceVersion) throw new Error('Expected `serviceVersion` property in Instance otpions!');
        
        let splitInstance = options.instance.split(":");
        this.platformVersion = splitInstance[0];
        this.cluster = splitInstance[1];
        this.instanceId = splitInstance[2];

        this.serviceName = options.serviceName;
        this.serviceVersion = options.serviceVersion;
        this.tokenProvider = options.tokenProvider;

        if(options.host){
            this.host = options.host;
        } else{
            this.host = `${this.cluster}.${HOST_BASE}`;
        }

        this.client = options.client || new BaseClient({
            encrypted: options.encrypted,
            host: this.host
        });
        
        if(options.logger !== undefined){
            this.logger = options.logger;
        }
        else{
            this.logger = new ConsoleLogger();
        }
    }

    request(options: RequestOptions): Promise<any> {
        options.path = this.absPath(options.path);
        const tokenProvider = options.tokenProvider || this.tokenProvider;
        if (!options.jwt && tokenProvider) {
            return tokenProvider.fetchToken().then((jwt) => {
                return this.client.request({ jwt, ...options });
            });
        } else {
            return this.client.request(options);
        }
    }

    subscribe(options: StatelessSubscribeOptions): StatelessSubscription {
        options.path = this.absPath(options.path);
        options.logger = this.logger;

        let subscription: StatelessSubscription = this.clientSubscription(options);

        const tokenProvider = options.tokenProvider || this.tokenProvider;
        if (options.jwt) {
            subscription.open(options.jwt);
        } else if (tokenProvider) {
            tokenProvider.fetchToken().then((jwt) => {
                subscription.open(jwt);
            }).catch((err) => {
                subscription.unsubscribe(err);
            });
        } else {
            subscription.open(null);
        }
        return subscription;
    }

    resumableSubscribe(options: ResumableSubscribeOptions): ResumableSubscription {
        if(!options.logger) options.logger = this.logger;
        options.logger = this.logger;
        options.path = this.absPath(options.path);
        const tokenProvider = options.tokenProvider || this.tokenProvider;

        let resumableSubscription: ResumableSubscription =
            this.client.newResumableSubscription({ tokenProvider, ...options });

        resumableSubscription.open();

        return resumableSubscription;
    }

    private absPath(relativePath: string): string {
        return `/services/${this.serviceName}/${this.serviceVersion}/${this.instanceId}/${relativePath}`.replace(/\/+/g, "/").replace(/\/+$/, "");
    }
}