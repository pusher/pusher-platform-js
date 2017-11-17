declare module 'websocket' {
  export class WebSocket {
    send(payload: any): void;
    close(code?: any, reason?: any): void;

    onopen?(evt?: any): void;
    onerror?(error: any): void;
    onclose?(closeEvent: any): void;
    onmessage?(message: any): void;
    // onactivity?() : void;

    readyState: number;
  }
}
