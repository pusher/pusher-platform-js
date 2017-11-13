import { Logger } from './logger';
import { ElementsHeaders } from './network';
import { XMLHttpRequest } from 'xmlhttprequest';
export interface RequestOptions {
    method: string;
    path: string;
    jwt?: string;
    headers?: ElementsHeaders;
    body?: any;
    logger?: Logger;
}
export declare function executeNetworkRequest(createXhr: () => XMLHttpRequest, options: RequestOptions): Promise<any>;
