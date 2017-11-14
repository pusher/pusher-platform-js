declare module 'xmlhttprequest' {
  export class XMLHttpRequest {
    open(method: string, url: string, async: boolean): void;
    send(payload?: any): Function;
    setRequestHeader(key: string, value: string): void;
    getAllResponseHeaders(): string;
    onreadystatechange: Function;
    withCredentials: any;

    ontimeout: Function;
    onerror: Function;
    onprogress: Function;
    onload: Function;
    abort: Function;

    responseText: string;

    response: any;

    status: number;
    readyState: number;
  }
}
