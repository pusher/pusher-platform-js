import { RequestOptions, ErrorResponse } from './pusher-platform';
import { Subscription, SubscribeOptions } from './subscription';
import { ResumableSubscribeOptions, ResumableSubscription} from './resumable-subscription';

export interface BaseClientOptions {
    cluster: string;
    encrypted?: boolean;
    timeout?: number;
    XMLHttpRequest?: Function;
}

export class BaseClient {
    private baseURL: string;
    private XMLHttpRequest: any;

    constructor(private options: BaseClientOptions) {
        let cluster = options.cluster.replace(/\/$/, '');
        this.baseURL = `${options.encrypted !== false ? "https" : "http"}://${cluster}`;
        this.XMLHttpRequest = options.XMLHttpRequest || (<any>window).XMLHttpRequest;
    }

    request(options: RequestOptions): Promise<any> {
        let xhr = this.createXHR(this.baseURL, options);

        return new Promise<any>((resolve, reject) => {

            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        resolve(xhr.responseText);
                    } else {
                        reject(new ErrorResponse(xhr));
                    }
                }
            };

            xhr.send(JSON.stringify(options.body));
        });
    }

    newSubscription(subOptions: SubscribeOptions): Subscription {
        return new Subscription(
            this.createXHR(this.baseURL, {
                method: "SUBSCRIBE",
                path: subOptions.path,
                headers: {},
                body: null,
            }),
            subOptions
        );
    }

    newResumableSubscription(subOptions: ResumableSubscribeOptions): ResumableSubscription {
        return new ResumableSubscription(
            () => {
                return this.createXHR(this.baseURL, {
                    method: "SUBSCRIBE",
                    path: subOptions.path,
                    headers: {},
                    body: null,
                });
            },
            subOptions
        );
    }

    private createXHR(baseURL: string, options: RequestOptions): XMLHttpRequest {
        let XMLHttpRequest: any = this.XMLHttpRequest;
        let xhr = new XMLHttpRequest();
        let path = options.path.replace(/^\/+/, "");
        let endpoint = `${baseURL}/${path}`;

        xhr.open(options.method.toUpperCase(), endpoint, true);

        if (options.body) {
            xhr.setRequestHeader("content-type", "application/json");
        }

        if (options.jwt) {
            xhr.setRequestHeader("authorization", `Bearer ${options.jwt}`);
        }

        for (let key in options.headers) {
            xhr.setRequestHeader(key, options.headers[key]);
        }

        return xhr;
    }
}