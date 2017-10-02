import { SubscriptionEvent, SubscriptionTransport, SubscriptionListeners } from '../subscription';
import { ElementsHeaders, responseToHeadersObject, ErrorResponse, NetworkError } from '../network';

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
  Closed
};

class WsSubscriptions {
  private lastID: number;
  private subscriptions: Map<Number,SubscriptionListeners>;

  constructor () {
    this.lastID = 0;
    this.subscriptions = new Map();
  }

  public addNew (listeners: SubscriptionListeners): number {
    this.lastID = this.lastID + 1;
    this.subscriptions.set(this.lastID, listeners);
    return this.lastID;
  }

  public remove (subID: number): boolean {
    return this.subscriptions.delete(subID);
  }

  public get (subID: number): SubscriptionListeners {
    return this.subscriptions.get(subID);
  }

}

export default class WebSocketTransport implements SubscriptionTransport {
  private baseURL: string;
  private webSocketPath: string = '/ws';
  private socket: WebSocket;
  private subscriptions: WsSubscriptions;
  private subMessageQueue: Message[];

  constructor(host: string) {
    this.baseURL = `wss://${host}/ws`;
    this.subMessageQueue = [];
    this.subscriptions = new WsSubscriptions();
    
    this.socket = new WebSocket(this.baseURL);
    this.socket.addEventListener('open', (event) => {
      let l = this.subMessageQueue.length;
      for (let i=0; i<l; i++) {
        this.sendMessage(this.subMessageQueue.shift());
      }
    });
    this.socket.addEventListener('message', (event) => this.recieveMessage(event));
    this.socket.addEventListener('error', (event) => this.recieveMessage(event));
    this.socket.addEventListener('close', (event) => this.recieveMessage(event));
  }

  public subscribe(
    path: string,
    listeners: SubscriptionListeners,
    headers: ElementsHeaders
  ) {
    const subID = this.subscriptions.addNew(listeners);

    this.sendMessage(
      this.getMessage(
        SubscribeMessageType,
        subID,
        path,
        headers
      )
    );

    return subID;
  }

  public unsubscribe(subID: number) {
    this.sendMessage(
      this.getMessage(
        UnsubscribeMessageType,
        subID
      )
    );

    this.subscriptions.get(subID).onEnd(null);
    this.subscriptions.remove(subID);
  }

  private getMessage (
      messageType: WsMessageType,
      subID: number,
      path?: string,
      headers?: ElementsHeaders
  ): Message {
    return [
      messageType,
      subID,
      path,
      headers
    ];
  }

  private sendMessage (message: Message) {
    if (this.socket.readyState === WSReadyState.Connecting) {
      this.subMessageQueue.push(message);
    }

    if (this.socket.readyState !== WSReadyState.Open) {
      return console.warn(`Can't send in "${WSReadyState[this.socket.readyState]}" state`);
    }

    this.socket.send(JSON.stringify(message));
  }

  private subscription (subID: number) {
    return this.subscriptions.get(subID);
  }

  private recieveMessage (event: any) {
    // First try to parse event to JSON message.
    let message: Message;
    try {
      message = JSON.parse(event.data);
    } catch (err) {
      console.warn(new Error('Message is not valid JSON format'));
    }

    // Validate structure of message
    const nonValidMessageError = this.validateMessage(message);
    if (nonValidMessageError) {
      return console.warn(nonValidMessageError);
    }

    const messageType = message.shift();
    const subID = message.shift();
    const subscription = this.subscription(subID);

    if (!subscription) {
      return console.warn(`Recieved message for non existing subscription id: "${subID}"`);
    }

    switch (messageType) {
      case OpenMessageType:
        this.onOpenMessage(message, subID, subscription);
      break;
      case EventMessageType:
        this.onEOSMessage(message, subscription);
      break;
      case EosMessageType:
        this.onEOSMessage(message, subscription);
      break;
      default:
        subscription.onError(new Error('Recived non existing type of message.'));
    }
  }

  /**
  * Check if a single subscription message is in the right format.
  * @param message The message to check.
  * @returns null or error if the message is wrong.
  */
  private validateMessage(message: Message): Error {
    if (!Array.isArray(message)) {
      return new Error(`Message is expected to be an array. Getting: ${JSON.stringify(message)}`);
    }

    if (message.length < 1) {
      return new Error(`Message is empty array ${JSON.stringify(message)}`);
    }

    return null;
  }

  private onOpenMessage (message: Message, subID: number, subscription: SubscriptionListeners) {
    const [statusCode] = message;
    if (statusCode != 200) {
      return this.subscriptions.remove(subID);
    }
    
    subscription.onOpen(message[1]);
  }

  private onEventMessage(eventMessage: any[], subscription: SubscriptionListeners): Error {
    if (eventMessage.length !== 3) {
      return new Error('Event message has ' + eventMessage.length + ' elements (expected 4)');
    }

    let [eventId, headers, body] = eventMessage;
    if (typeof eventId !== 'string') {
      return new Error(`Invalid event ID in message: ${JSON.stringify(eventMessage)}`);
    }
    if (typeof headers !== 'object' || Array.isArray(headers)) {
      return new Error(`Invalid event headers in message: ${JSON.stringify(eventMessage)}`);
    }
    
    subscription.onEvent({eventId, headers, body});
  }

  private onEOSMessage(eosMessage: any[], subscription: SubscriptionListeners): void {
    if (eosMessage.length !== 3) {
      return subscription.onError(new Error(`EOS message has ${eosMessage.length} elements (expected 4)`));
    }

    const [statusCode, headers, body] = eosMessage;
    if (typeof statusCode !== 'number') {
      return subscription.onError(new Error('Invalid EOS Status Code'));
    }
    
    if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
      return subscription.onError(new Error('Invalid EOS ElementsHeaders'));
    }

    if (statusCode === 204) {
      return subscription.onEnd(null);
    }

    return subscription.onError(new ErrorResponse(statusCode, headers, body));
  }

}
