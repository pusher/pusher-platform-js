import { ElementsHeaders } from './network';
import { Logger } from './logger';
import { XMLHttpRequest } from 'xmlhttprequest';
export declare type NetworkRequest<T> = (parameters?: any) => Promise<T>;
export interface RequestOptions {
    method: string;
    path: string;
    jwt?: string;
    headers?: ElementsHeaders;
    body?: any;
    logger?: Logger;
}
export declare function executeNetworkRequest(createXhr: () => XMLHttpRequest, options: RequestOptions): Promise<any>;
