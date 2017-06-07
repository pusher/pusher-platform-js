import { Authorizer } from './authorizer';
import { BaseClient } from './base-client';
import { RequestOptions } from './base-client';
import { Subscription, SubscribeOptions } from './subscription';
import { ResumableSubscription, ResumableSubscribeOptions } from './resumable-subscription'; 

const DEFAULT_CLUSTER = "api-ceres.kube.pusherplatform.io";

export interface AppOptions {
    appId: string;
    authorizer?: Authorizer;
    client?: BaseClient;
    cluster?: string;
    encrypted?: boolean;
}

type Response = any;

export class App {

    private client: BaseClient;
    private appId: string;
    private authorizer: Authorizer;

    constructor(options: AppOptions) {
        this.appId = options.appId;
        this.authorizer = options.authorizer;
        this.client = options.client || new BaseClient({
            cluster: options.cluster || DEFAULT_CLUSTER,
            encrypted: options.encrypted
        });
    }

    request(options: RequestOptions): Promise<any> {
        options.path = this.absPath(options.path);
        const authorizer = options.authorizer || this.authorizer;
        if (!options.jwt && authorizer) {
            return authorizer.authorize().then((jwt) => {
                return this.client.request({ jwt, ...options });
            });
        } else {
            return this.client.request(options);
        }
    }

    subscribe(options: SubscribeOptions): Subscription {
        options.path = this.absPath(options.path);

        let subscription: Subscription = this.client.newSubscription(options);

        const authorizer = options.authorizer || this.authorizer;
        if (options.jwt) {
            subscription.open(options.jwt);
        } else if (authorizer) {
            authorizer.authorize().then((jwt) => {
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
        options.path = this.absPath(options.path);
        const authorizer = options.authorizer || this.authorizer;

        let resumableSubscription: ResumableSubscription =
            this.client.newResumableSubscription({ authorizer, ...options });

        resumableSubscription.open();

        return resumableSubscription;
    }

    private absPath(relativePath: string): string {
        return `/apps/${this.appId}/${relativePath}`.replace(/\/+/g, "/").replace(/\/+$/, "");
    }
}
