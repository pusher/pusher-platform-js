import { TokenProvider } from './token-provider';
import { BaseClient } from './base-client';
import { RequestOptions } from './base-client';
import { ConsoleLogger, Logger } from './logger';
import { ResumableSubscribeOptions, ResumableSubscription } from './resumable-subscription';
import { SubscribeOptions, Subscription } from './subscription';

const DEFAULT_CLUSTER = "api-ceres.pusherplatform.io";

export interface InstanceOptions {

    serviceId: string;
    tokenProvider?: TokenProvider;
    client?: BaseClient;
    cluster?: string;
    encrypted?: boolean;
    logger?: Logger;
}

type Response = any;

export default class Instance {
    private client: BaseClient;

    private instanceId: string;
    private tokenProvider: TokenProvider;
    private logger: Logger;

    constructor(options: InstanceOptions) {
        if (!options.serviceId) {
          throw new Error('Expected `serviceId` property in App options')
        }
        this.instanceId = options.serviceId;
        this.tokenProvider = options.tokenProvider;
        this.client = options.client || new BaseClient({
            cluster: options.cluster ?
                sanitizeCluster(options.cluster) : DEFAULT_CLUSTER,
            encrypted: options.encrypted
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

    subscribe(options: SubscribeOptions): Subscription {
        options.path = this.absPath(options.path);
        options.logger = this.logger;

        let subscription: Subscription = this.client.newSubscription(options);

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

    private absPath(relativePath: string, serviceName: string): string {
        let newUrl = `/services/${serviceName}/v1/${this.instanceId}`.replace(/\/+/g, "/").replace(/\/+$/, "");
        return `/apps/${this.instanceId}/${relativePath}`.replace(/\/+/g, "/").replace(/\/+$/, "");
    }
}

function sanitizeCluster(cluster) {
    return cluster
        .replace(/^[^\/:]*:\/\//, "") // remove schema
        .replace(/\/$/, ""); // remove trailing slash
}
