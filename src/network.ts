export type ElementsHeaders = {
  [key: string]: string;
};

export function responseToHeadersObject(headerStr: string): ElementsHeaders {
  const headers: ElementsHeaders = {};
  if (!headerStr) {
    return headers;
  }

  const headerPairs = headerStr.split('\u000d\u000a');
  for (const headerPair of headerPairs) {
    const index = headerPair.indexOf('\u003a\u0020');
    if (index > 0) {
      const key = headerPair.substring(0, index);
      const val = headerPair.substring(index + 2);
      headers[key] = val;
    }
  }
  return headers;
}

export class ErrorResponse {
  statusCode: number;
  headers: ElementsHeaders;
  info: any;

  constructor(statusCode: number, headers: ElementsHeaders, info: any) {
    this.statusCode = statusCode;
    this.headers = headers;
    this.info = info;
  }

  static fromXHR(xhr: XMLHttpRequest): ErrorResponse {
    let errorInfo = xhr.responseText;
    try {
      errorInfo = JSON.parse(xhr.responseText);
    } catch (e) {
      // Error info is formatted badly so we just return the raw text
    }
    return new ErrorResponse(
      xhr.status,
      responseToHeadersObject(xhr.getAllResponseHeaders()),
      errorInfo,
    );
  }
}

export class NetworkError {
  constructor(public error: string) {}
}

// Follows https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/readyState
export enum XhrReadyState {
  UNSENT = 0,
  OPENED = 1,
  HEADERS_RECEIVED = 2,
  LOADING = 3,
  DONE = 4,
}
