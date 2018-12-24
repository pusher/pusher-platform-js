export declare type ElementsHeaders = {
    [key: string]: string;
};
export declare function responseToHeadersObject(headerStr: string): ElementsHeaders;
export declare class ErrorResponse {
    statusCode: number;
    headers: ElementsHeaders;
    info: any;
    constructor(statusCode: number, headers: ElementsHeaders, info: any);
    static fromXHR(xhr: XMLHttpRequest): ErrorResponse;
}
export declare class NetworkError {
    error: string;
    constructor(error: string);
}
export declare class ProtocolError {
    error: string;
    constructor(error: string);
}
export declare enum XhrReadyState {
    UNSENT = 0,
    OPENED = 1,
    HEADERS_RECEIVED = 2,
    LOADING = 3,
    DONE = 4
}
