import { TokenProvider } from './token-provider';
import { BaseClient } from './base-client';
import { RequestOptions } from './base-client';
import { Subscription, SubscribeOptions } from './subscription';
import { ResumableSubscription, ResumableSubscribeOptions } from './resumable-subscription'; 
import { DefaultLogger, Logger } from './logger';

const DEFAULT_CLUSTER = "api-ceres.pusherplatform.io";

export interface AppOptions {

    serviceId: string;
    tokenProvider?: TokenProvider;
    client?: BaseClient;
    cluster?: string;
    encrypted?: boolean;
    logger?: Logger;
}

type Response = any;

export default class App {

    private client: BaseClient;

    private serviceId: string;
    private tokenProvider: TokenProvider;
    private logger: Logger;

    constructor(options: AppOptions) {
        this.serviceId = options.serviceId;
        this.tokenProvider = options.tokenProvider;
        this.client = options.client || new BaseClient({
            cluster: options.cluster ?
                sanitizeCluster(options.cluster) : DEFAULT_CLUSTER,
            encrypted: options.encrypted
        });
        if(options.logger){
            this.logger = options.logger;
        }
        else{
            this.logger = new DefaultLogger();
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
        options.logger = this.logger;
        options.path = this.absPath(options.path);
        const tokenProvider = options.tokenProvider || this.tokenProvider;

        let resumableSubscription: ResumableSubscription =
            this.client.newResumableSubscription({ tokenProvider, ...options });

        resumableSubscription.open();

        return resumableSubscription;
    }

    private absPath(relativePath: string): string {
        return `/apps/${this.serviceId}/${relativePath}`.replace(/\/+/g, "/").replace(/\/+$/, "");
    }
}

function sanitizeCluster(cluster) {
    return cluster
        .replace(/^[^\/:]*:\/\//, "") // remove schema
        .replace(/\/$/, ""); // remove trailing slash
}
