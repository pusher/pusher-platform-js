import { Logger } from './logger';
import { ElementsHeaders } from './network';
import { TokenProvider } from './token-provider';
import { XMLHttpRequest } from 'xmlhttprequest';
export interface RequestOptions {
    method: string;
    path: string;
    jwt?: string;
    headers?: ElementsHeaders;
    body?: any;
    logger?: Logger;
    tokenProvider?: TokenProvider;
}
export declare function executeNetworkRequest(createXhr: () => XMLHttpRequest, options: RequestOptions): Promise<any>;
