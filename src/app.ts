import { Authorizer } from './authorizer';
import { BaseClient } from './base-client';
import { RequestOptions } from './pusher-platform';
import { Subscription, SubscribeOptions } from './subscription';
import { ResumableSubscription, ResumableSubscribeOptions } from './resumable-subscription'; 

export type AppOptions = {
    appId: string;
    cluster?: string;
    authorizer?: Authorizer;
    client?: BaseClient;
    encrypted?: boolean;
}

type Response = any;

export default class App {
    private client: BaseClient;
    private appId: string;
    private authorizer: Authorizer;

    constructor(options: AppOptions) {
        this.appId = options.appId;
        this.authorizer = options.authorizer;

        this.client = options.client || new BaseClient({
            cluster: options.cluster || "api.private-beta-1.pusherplatform.com",
            encrypted: options.encrypted
        });
    }

    request(options: RequestOptions): Promise<any> {
        options.path = this.absPath(options.path);

        if (!options.jwt && this.authorizer) {
            return this.authorizer.authorize().then((jwt) => {
                return this.client.request(Object.assign(options, { jwt }));
            });
        } else {
            return this.client.request(options);
        }
    }

    subscribe(options: SubscribeOptions): Subscription {
        options.path = this.absPath(options.path);

        let subscription: Subscription = this.client.newSubscription(options);

        if (options.jwt) {
            subscription.open(options.jwt);
        } else if (this.authorizer) {
            this.authorizer.authorize().then((jwt) => {
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
        options.authorizer = this.authorizer;

        let resumableSubscription: ResumableSubscription = this.client.newResumableSubscription(options);

        resumableSubscription.open();

        return resumableSubscription;
    }

    private absPath(relativePath: string): string {
        return `/apps/${this.appId}/${relativePath}`.replace(/\/+/g, "/").replace(/\/+$/, "");
    }
}
