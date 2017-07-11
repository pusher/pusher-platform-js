export type ElementsHeaders = {
    [key: string]: string;
}

export function responseToHeadersObject(headerStr: string): ElementsHeaders {
    var headers: ElementsHeaders = {};
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

export class ErrorResponse{
    public statusCode: number;
    public headers: ElementsHeaders;
    public info: any;

    constructor(statusCode: number, headers: ElementsHeaders, info: any) {
        this.statusCode = statusCode;
        this.headers = headers;
        this.info = info;
    }

    static fromXHR(xhr: XMLHttpRequest): ErrorResponse {
        return new ErrorResponse(
            xhr.status, responseToHeadersObject(xhr.getAllResponseHeaders()), xhr.responseText);
        }
    }

export class NetworkError{
        constructor(public error: string){}
}

// Follows https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/readyState
export enum XhrReadyState {
    UNSENT = 0,
    OPENED = 1,
    HEADERS_RECEIVED = 2,
    LOADING = 3,
    DONE = 4
}