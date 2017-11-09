import { PCancelable } from 'p-cancelable';

export interface TokenProvider {
  fetchToken(tokenParams?: any): PCancelable<string>;
  clearToken(token?: string);
}
