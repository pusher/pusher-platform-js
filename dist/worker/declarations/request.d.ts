import { ElementsHeaders } from './network';
import { TokenProvider } from './token-provider';
export interface BasicRequestOptions {
    method: string;
    path: string;
    jwt?: string;
    headers?: ElementsHeaders;
    tokenProvider?: TokenProvider;
}
export interface SimpleRequestOptions extends BasicRequestOptions {
    body?: any;
}
export interface JSONRequestOptions extends BasicRequestOptions {
    json?: any;
}
export declare type RequestOptions = SimpleRequestOptions | JSONRequestOptions;
export interface RawRequestOptions {
    method: string;
    url: string;
    headers?: ElementsHeaders;
    body?: any;
}
export declare function executeNetworkRequest(createXhr: () => XMLHttpRequest, options: RequestOptions): Promise<any>;
export declare function sendRawRequest(options: RawRequestOptions): Promise<any>;
