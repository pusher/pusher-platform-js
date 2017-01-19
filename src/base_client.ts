import {RequestOptions, SubscribeOptions} from "./types";
import Subscription from "./subscription";
import ErrorResponse from "./error_response";

export interface BaseClientOptions {
  cluster: string;
  encrypted?: boolean;
  timeout?: number;
  XMLHttpRequest?: Function;
}

export class BaseClient {
  private baseURL : string;
  private XMLHttpRequest : any;

  constructor(private options: BaseClientOptions) {
    let cluster = options.cluster.replace(/\/$/, '');
    this.baseURL = `${options.encrypted !== false ? "https" : "http"}://${cluster}`;
    this.XMLHttpRequest = options.XMLHttpRequest || (<any>window).XMLHttpRequest;
  }

  request(options : RequestOptions) : Promise<any> {
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

  newSubscription(subOptions : SubscribeOptions) : Subscription {
    return new Subscription(
      this.createXHR(this.baseURL, {
        method: "SUBSCRIBE",
        path: subOptions.path,
        headers: subOptions.headers,
        body: null,
      }),
      subOptions
    );
  }

  private createXHR(baseURL : string, options : RequestOptions) : XMLHttpRequest {
    let XMLHttpRequest: any = this.XMLHttpRequest;
    let xhr = new XMLHttpRequest();
    let path = options.path.replace(/^\/+/, "");
    let endpoint = `${baseURL}/${path}`;

    xhr.open(options.method.toUpperCase(), endpoint, true);

    if (options.body) {
      xhr.setRequestHeader("content-type", "application/json");
    }

    for (let key in options.headers) {
      xhr.setRequestHeader(key, options.headers[key]);
    }

    return xhr;
  }
}
