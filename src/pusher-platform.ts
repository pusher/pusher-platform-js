import { Authorizer } from './authorizer'
import { BaseClient } from './base-client'
import { Subscription, SubscribeOptions } from './subscription'
import { ResumableSubscription, ResumableSubscribeOptions } from './resumable-subscription'

type Headers = {
  [key: string]: string;
}

export interface Event {
  eventId: string;
  headers: Headers;
  body: any;
}

export interface RequestOptions {
  method: string;
  path: string;
  jwt?: string;
  headers?: Headers;
  body?: any;
}



function responseHeadersObj(headerStr: string): Headers {
  var headers: Headers = {};
  if (!headerStr) {
    return headers;
  }

  var headerPairs = headerStr.split('\u000d\u000a');
  for (var i = 0; i < headerPairs.length; i++) {
    var headerPair = headerPairs[i];
    var index = headerPair.indexOf('\u003a\u0020');
    if (index > 0) {
      var key = headerPair.substring(0, index);
      var val = headerPair.substring(index + 2);
      headers[key] = val;
    }
  }

  return headers;
}

export class ErrorResponse {
  public statusCode: number;
  public headers: Headers;
  public info: any;

  constructor(xhr: XMLHttpRequest) {
    this.statusCode = xhr.status;
    this.headers = responseHeadersObj(xhr.getAllResponseHeaders());
    this.info = xhr.responseText;
  }
}

// Follows https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/readyState
export enum XhrReadyState {
  UNSENT = 0,
  OPENED = 1,
  HEADERS_RECEIVED = 2,
  LOADING = 3,
  DONE = 4
}






type Response = any;

interface AppOptions {
  appId: string;
  cluster?: string;
  authorizer?: Authorizer;
  client?: BaseClient;
  encrypted?: boolean;
}

export class App {
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

  request(options: RequestOptions): Promise<Response> {
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
