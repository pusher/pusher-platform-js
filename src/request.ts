import { ErrorResponse, NetworkError, ElementsHeaders } from './network';
import { Logger } from './logger';
import { XMLHttpRequest } from 'xmlhttprequest';

import * as PCancelable from 'p-cancelable';

export type NetworkRequest<T> = (parameters?: any) => Promise<T>;

export interface RequestOptions {
    method: string;
    path: string;
    jwt?: string;
    headers?: ElementsHeaders;
    body?: any;
    logger?: Logger;
}

export function executeNetworkRequest(createXhr: () => XMLHttpRequest, options: RequestOptions): PCancelable<any> {

    let cancelablePromise: PCancelable<any> = new PCancelable( (onCancel, resolve, reject) => {
        const xhr = createXhr();

        onCancel( () => {
            xhr.abort();
        });

        xhr.onreadystatechange  = () => {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.response);
                } else if (xhr.status !== 0) {
                    reject(ErrorResponse.fromXHR(xhr));
                } else{
                    reject(new NetworkError("No Connection"));
                }
            }
        };
        xhr.send(JSON.stringify(options.body));
    });

    return cancelablePromise;
}
