import { CancellablePromise } from './rejig/rejig';
import { ErrorResponse, NetworkError, Headers } from './base-client';
import { Logger } from './logger';
import { RetryStrategy } from './retry-strategy/retry-strategy';

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

export class NetworkResponse<T> implements CancellablePromise<T> {
    private next: (result: T) => void;
    private onError: (error: any) => void;
    private result: T;
    private error: any;

    constructor(
        private execute: (resolve: (result: T) => void,  reject: (reason: any) => void) => void, private onCancel: () => void) {
        execute( 
            result => {
                if(this.next){
                    this.next(result);
                }
                else{
                    this.result = result;
                }
            },
            error => {
                if(this.onError){
                    this.onError(error);
                }
                else{
                    this.error = error;
                }
            }
        );
    }

    then(onResult: (result: T) => void) {
        if(this.result){
            onResult(this.result);
        }
        else{
            this.next = onResult;
        }
    }
    catch(onError: (error: any) => void) {
        if(this.error){
            onError(this.error);
        }
        else{
            this.onError = onError;
        }
    }
    cancel() {
        this.onCancel();
    }
}

export function executeNetworkRequest<T>(createXhr: () => XMLHttpRequest, options: RequestOptions): NetworkResponse<T> {

    const xhr = createXhr();

    return new NetworkResponse<T>( 
        (resolve, reject) => {
            xhr.onreadystatechange  = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        resolve(xhr.response as T);
                    } else if (xhr.status !== 0) {
                        reject(ErrorResponse.fromXHR(xhr));
                    } else{
                        reject(new NetworkError("No Connection"));
                    }
                }
            };
            xhr.send(JSON.stringify(options.body));
        }, 
        () => {
            xhr.abort();
    });
}

// export function executeRequest<T>(createXhr: () => XMLHttpRequest, options: RequestOptions): Promise<T> {
//     let networkRequest: NetworkRequest<any> = () => {
//         return new Promise<T>((resolve, reject) => {
//             let xhr = createXhr();    
//             xhr.onreadystatechange = () => {
//                 if (xhr.readyState === 4) {
//                     if (xhr.status === 200) {
//                         resolve(xhr.response as T);
//                     } else if (xhr.status !== 0) {
//                         reject(ErrorResponse.fromXHR(xhr));
//                     } else{
//                         reject(new NetworkError("No Connection"));
//                     }
//                 }
//             };
//             xhr.send(JSON.stringify(options.body));
//         });
//     }
//     return options.retryStrategy.executeRequest(null, networkRequest);
// }