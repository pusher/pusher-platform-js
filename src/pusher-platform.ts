import { Authorizer } from './authorizer'
import { BaseClient } from './base-client'
import { Subscription, SubscribeOptions } from './subscription'
import { ResumableSubscription, ResumableSubscribeOptions } from './resumable-subscription'

export type Headers = {
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

export function responseHeadersObj(headerStr: string): Headers {
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

