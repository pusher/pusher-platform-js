import {
  ElementsHeaders,
  ErrorResponse,
  NetworkError,
  responseToHeadersObject,
} from '../network';
import {
  Subscription,
  SubscriptionEvent,
  SubscriptionListeners,
  SubscriptionTransport,
} from '../subscription';

type WsMessageType = number;
type Message = any[];

const SubscribeMessageType: WsMessageType = 100;
const OpenMessageType: WsMessageType = 101;
const EventMessageType: WsMessageType = 102;
const UnsubscribeMessageType: WsMessageType = 198;
const EosMessageType: WsMessageType = 199;
const PingMessageType: WsMessageType = 16;
const PongMessageType: WsMessageType = 17;
const CloseMessageType: WsMessageType = 99;

export enum WSReadyState {
  Connecting = 0,
  Open,
  Closing,
  Closed,
}

class WsSubscription implements Subscription {
  constructor(private wsTransport: WebSocketTransport, private subID: number) {}

  unsubscribe() {
    this.wsTransport.unsubscribe(this.subID);
  }
}

const pingIntervalMs: number = 30000;
const pingTimeoutMs: number = 10000;

export default class WebSocketTransport implements SubscriptionTransport {
  private baseURL: string;
  private webSocketPath: string = '/ws';
  private socket: WebSocket;
  private forcedClose: boolean = false;
  private closedError: any = null;
  private lastSubscriptionID: number;
  private lastMessageReceivedTimestamp: number;
  private pingInterval: any;
  private pongTimeout: any;
  private lastSentPingID: number | null;

  constructor(host: string) {
    this.baseURL = `wss://${host}${this.webSocketPath}`;
    this.lastSubscriptionID = 0;
    this.connect();
  }

  subscribe(
    path: string,
    listeners: SubscriptionListeners,
    headers: ElementsHeaders,
  ): Subscription {
    const subID = this.lastSubscriptionID++;
    return new WsSubscription(this, subID);
  }

  unsubscribe(subID: number): void {}

  private connect() {
    global.console.log("At the top of connect");

    this.forcedClose = false;
    this.closedError = null;

    this.socket = new global.WebSocket(this.baseURL);

    this.socket.onopen = (event: any) => {
      global.console.log("At the top of socket onopen");

      this.pingInterval = global.setInterval(() => {
        if (this.pongTimeout) {
          return;
        }

        const now = new Date().getTime();

        if (pingTimeoutMs > now - this.lastMessageReceivedTimestamp) {
          return;
        }

        this.sendMessage(this.getMessage(PingMessageType, now));

        this.lastSentPingID = now;

        this.pongTimeout = global.setTimeout(() => {
          const pongNow = new Date().getTime();

          if (pingTimeoutMs > pongNow - this.lastMessageReceivedTimestamp) {
            this.pongTimeout = null;
            return;
          }

          global.console.log(`Calling close because pong response timeout`);
          this.close(
            new NetworkError(`Pong response wasn't received until timeout.`),
          );
        }, pingTimeoutMs);
      }, pingIntervalMs);
    };

    this.socket.onmessage = (event: any) => this.receiveMessage(event);
    this.socket.onerror = (event: any) => {
      global.console.log("Received an error in onerror");
      global.console.log(event);

      // TODO: Should we set closedError here?

      // this.close(new NetworkError('Connection was lost.'));
    };
    this.socket.onclose = (event: any) => {
      global.console.log(`At the top of onclose`);

      global.console.log(`Trace start`);
      global.console.trace();
      global.console.log(`Trace end`);

      global.console.log(`Event in onclose`);
      global.console.log(event);

      global.console.log(`Is there a closedError?`);
      global.console.log(this.closedError);

      global.console.log("About to call tryReconnectIfNeeded");
      this.tryReconnectIfNeeded();
    };
  }

  private close(error?: any) {
    global.console.log("At the top of close()")
    if (!(this.socket instanceof global.WebSocket)) {
      return;
    }

    global.console.log(`Doing a forced close`);

    // In Chrome there is a substantial delay between calling close on a broken
    // websocket and the onclose method firing. When we're force closing the
    // connection we can expedite the reconnect process by manually calling
    // onclose. We then need to delete the socket's handlers so that we don't
    // get extra calls from the dying socket.
    const onClose = this.socket.onclose.bind(this);

    delete this.socket.onclose;
    delete this.socket.onerror;
    delete this.socket.onmessage;
    delete this.socket.onopen;

    this.forcedClose = true;
    this.closedError = error;
    global.console.log(`THIS.SOCKET.CLOSE ABOUT TO BE CALLED`);
    this.socket.close();

    global.clearTimeout(this.pingInterval);
    global.clearTimeout(this.pongTimeout);
    delete this.pongTimeout;
    this.lastSentPingID = null;

    onClose();
  }

  private tryReconnectIfNeeded() {
    global.console.log("At the top of tryReconnectIfNeeded");
    // If we've force closed, the socket might not actually be in the Closed
    // state yet but we should create a new one anyway.

    global.console.log(`this.socket.readyState: ${this.socket.readyState}`);
    global.console.log(`this.forcedClose: ${this.forcedClose}`);

    if (this.forcedClose || this.socket.readyState === WSReadyState.Closed) {
      global.console.log(`About to try to (re)connect`);
      this.connect();
    }
  }

  private getMessage(
    messageType: WsMessageType,
    id: number,
    path?: string,
    headers?: ElementsHeaders,
  ): Message {
    return [messageType, id, path, headers];
  }

  private sendMessage(message: Message) {
    if (this.socket.readyState !== WSReadyState.Open) {
      return global.console.warn(
        `Can't send in "${WSReadyState[this.socket.readyState]}" state`,
      );
    }

    this.socket.send(JSON.stringify(message));
  }

  private receiveMessage(event: any) {
    this.lastMessageReceivedTimestamp = new Date().getTime();

    // First try to parse event to JSON message.
    let message: Message;
    try {
      message = JSON.parse(event.data);
    } catch (err) {
      global.console.log(`Calling close because invalid JSON in message`);
      this.close(
        new Error(`Message is not valid JSON format. Getting ${event.data}`),
      );
      return;
    }

    // Validate structure of message.
    // Close connection if not valid.
    const nonValidMessageError = this.validateMessage(message);
    if (nonValidMessageError) {
      global.console.log(`Calling close because message is invalid`);
      this.close(new Error(nonValidMessageError.message));
      return;
    }

    const messageType = message.shift();

    // Try to handle connection level messages first
    switch (messageType) {
      case PongMessageType:
        this.onPongMessage(message);
        return;
      case PingMessageType:
        this.onPingMessage(message);
        return;
      case CloseMessageType:
        this.onCloseMessage(message);
        return;
    }
  }

  /**
   * Check if a single subscription message is in the right format.
   * @param message The message to check.
   * @returns null or error if the message is wrong.
   */
  private validateMessage(message: Message): Error | null {
    if (!Array.isArray(message)) {
      return new Error(
        `Message is expected to be an array. Getting: ${JSON.stringify(
          message,
        )}`,
      );
    }

    if (message.length < 1) {
      return new Error(`Message is empty array: ${JSON.stringify(message)}`);
    }

    return null;
  }

  private onCloseMessage(closeMessage: Message) {
    const [statusCode, headers, body] = closeMessage;
    if (typeof statusCode !== 'number') {
      global.console.log(`Calling close because of invalid EOS Status Code`);
      return this.close(new Error('Close message: Invalid EOS Status Code'));
    }

    if (typeof headers !== 'object' || Array.isArray(headers)) {
      global.console.log(`Calling close because of invalid EOS ElementsHeaders`);
      return this.close(
        new Error('Close message: Invalid EOS ElementsHeaders'),
      );
    }

    global.console.log(`Calling close because at end of onCloseMessage function`);

    const errorInfo = {
      error: body.error || 'network_error',
      error_description: body.error_description || 'Network error',
    };

    this.close(new ErrorResponse(statusCode, headers, errorInfo));
  }

  private onPongMessage(message: Message) {
    const [receviedPongID] = message;

    if (this.lastSentPingID !== receviedPongID) {
      global.console.warn(
        `Received pong with ID ${receviedPongID} but lastSentPingID was ${
          this.lastSentPingID
        }`,
      );
    }

    global.console.log(`Received pong ID ${receviedPongID}`);

    global.clearTimeout(this.pongTimeout);
    delete this.pongTimeout;
    this.lastSentPingID = null;
  }

  private onPingMessage(message: Message) {
    const [receviedPingID] = message;

    global.console.log(`Received ping ID ${receviedPingID}`);

    this.sendMessage(this.getMessage(PongMessageType, receviedPingID));
  }
}
