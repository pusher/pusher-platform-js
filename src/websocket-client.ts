export const wsSubscribeType  = 100;
export const wsOpenType = 101;
export const wsEventType = 102;
export const wsUnsubscribeType = 198;
export const wsEosType = 199;
export const wsPingType = 16;
export const wsPongType = 17;
export const wsCloseType = 99;

export enum WSReadyState {
  Connecting = 0,
  Open,
  Closing,
  Closed
};

export interface WebSocketClientOptions {
  host: string;
};

export default class WebSocketClient {
  private baseURL: string;
  private webSocketPath: string = '/ws';
  private connection: WebSocket;

  constructor (private options: WebSocketClientOptions) {
    this.baseURL = `wss://${options.host}/ws`;

    try {
      this.connection = new WebSocket(this.baseURL);
      this.connection.addEventListener('open', (event) => console.log('Socket open'));
      this.connection.addEventListener('message', this.handleOnMessage);
      this.connection.addEventListener('error', (event) => console.log(event));
      this.connection.addEventListener('close', (event) => console.log(event));
    } catch (err) {
      console.log(err);
    }
  }

  private handleOnMessage (event) {

  }

  public subscribeToPath(path) {
    
  }

  public unsubscribe () {
    
  }
}
