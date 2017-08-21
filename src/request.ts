import { ErrorResponse, NetworkError, Headers } from './base-client';
import { Logger } from './logger';
import { RetryStrategy } from './retry-strategy/retry-strategy';

//Single request
export type NetworkRequest<T> = (parameters?: any) => Promise<T>;

export interface RequestOptions {
    method: string;
    path: string;
    jwt?: string;
    headers?: Headers;
    body?: any;
    retryStrategy?: RetryStrategy;
    logger?: Logger;
}

export function executeRequest<T>(createXhr: () => XMLHttpRequest, options: RequestOptions): Promise<any> {
    let networkRequest: NetworkRequest<any> = () => {
        return new Promise<any>((resolve, reject) => {
            let xhr = createXhr();    
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        resolve(xhr.responseText);
                    } else if (xhr.status !== 0) {
                        reject(ErrorResponse.fromXHR(xhr));
                    } else{
                        reject(new NetworkError("No Connection"));
                    }
                }
            };
            xhr.send(JSON.stringify(options.body));
        });
    }
    return options.retryStrategy.executeRequest(null, networkRequest);
}