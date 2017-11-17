import { Logger } from './logger';
import { ElementsHeaders, ErrorResponse, NetworkError } from './network';
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

// TODO: Could we make this generic and remove the `any`s?
export function executeNetworkRequest(
  createXhr: () => XMLHttpRequest,
  options: RequestOptions,
): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    const xhr = createXhr();

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response);
        } else if (xhr.status !== 0) {
          reject(ErrorResponse.fromXHR(xhr));
        } else {
          reject(new NetworkError('No Connection'));
        }
      }
    };
    xhr.send(JSON.stringify(options.body));
  });
}
