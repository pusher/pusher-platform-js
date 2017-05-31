import { Event } from './pusher-platform';
import App from './app';
import { ResumableSubscription } from './resumable-subscription'; 

export interface FeedSubscribeOptions {
    lastEventId?: string;
    onOpening?: () => void;
    onOpen?: () => void;
    onItem?: (item: Event) => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
}

export interface FeedsGetOptions {
    id?: string;
    limit?: number;
}

type Response = any;

export default class FeedsHelper {
    public app: App;
    public feedId: string;
    readonly serviceName: string = "feeds-service";

    constructor(feedId: string, app: App) {
        this.feedId = feedId;
        this.app = app;
    }

    subscribe(options: FeedSubscribeOptions): ResumableSubscription {
        return this.app.resumableSubscribe({
            path: this.feedItemsPath(),
            lastEventId: options.lastEventId,
            onOpening: options.onOpening,
            onOpen: options.onOpen,
            onEvent: options.onItem,
            onEnd: options.onEnd,
            onError: options.onError
        });
    }

    fetchOlderThan(options?: FeedsGetOptions): Promise<any> {
        var queryString = "";
        var queryParams: string[] = [];
        if (options && options.id) { queryParams.push("from_id=" + options.id); }
        if (options && options.limit) { queryParams.push("limit=" + options.limit); }

        if (queryParams.length > 0) { queryString = "?" + queryParams.join("&"); }

        var pathWithQuery = this.feedItemsPath() + queryString;

        return new Promise((resolve, reject) => {
            return this.app.request({ method: "GET", path: pathWithQuery })
                .then((response) => {
                    try {
                    resolve(JSON.parse(response));
                    } catch(e) {
                        reject(e);
                    }
                }).catch((error) => {
                    reject(error);
                });
        });
    }

    publish(item: any): Promise<Response> {
        return this.app.request({
            method: "POST",
            path: this.feedItemsPath(),
            body: { items: [item] }
        });
    }

    private feedItemsPath(): string {
        return `${this.serviceName}/feeds/${this.feedId}/items`;
    }

    listFeeds(): Promise<Array<string>> {
        return new Promise((resolve, reject) => {

            this.app.request({ method: "GET", path: "feeds"})
                .then((responseBody) => {
                    try { 
                        resolve(JSON.parse(responseBody));
                    } catch(e){
                        reject(e);
                    }
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }
}