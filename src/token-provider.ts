import { CancellablePromise } from './cancelable-promise';
export interface TokenPromise extends CancellablePromise<string> {}

export interface TokenProvider {
    fetchToken(tokenParams?: any): TokenPromise;
    clearToken(token?: string);
}