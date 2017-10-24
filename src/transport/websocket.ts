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

type SubscriptionData = {
  path: string,
  listeners: SubscriptionListeners,
  headers: ElementsHeaders,
  subID?: number;
};

type WsSubscriptionsType = {
  [key: number]: SubscriptionData
};

class WsSubscriptions {
  private lastID: number;
  private subscriptions: WsSubscriptionsType;

  constructor () {
    this.lastID = 0;
    this.subscriptions = {};
  }

  public addNew (
    path: string,
    listeners: SubscriptionListeners,
    headers: ElementsHeaders
  ): number {
    this.lastID = this.lastID + 1;
    this.subscriptions[this.lastID] = {
      path,
      listeners,
      headers
    };

    return this.lastID;
  }

  public has (subID: number): boolean {
    return this.subscriptions[subID] != undefined;
  }

  public remove (subID: number): boolean {
    return delete this.subscriptions[subID];
  }

  public get (subID: number): SubscriptionData {
    return this.subscriptions[subID];
  }

  public getAll (): WsSubscriptionsType {
    return this.subscriptions;
  }

  public getAllAsArray (): SubscriptionData[] {
    return Object.keys(this.subscriptions).map(subID => (
      {subID: parseInt(subID), ...this.subscriptions[subID]}
    ));
  }

}

const pingIntervalMs: number = 2000;
const pingTimeoutMs: number = 2000;

export default class WebSocketTransport implements SubscriptionTransport {
  private baseURL: string;
  private webSocketPath: string = '/ws';
  private socket: WebSocket;
  private subscriptions: WsSubscriptions;
  private lastMessageReceivedTimestamp: number;
  private pingInterval: any;
  private pongTimeout: any;
  private lastSentPingID: number;

  constructor(host: string) {
    this.baseURL = `wss://${host}${this.webSocketPath}`;
    this.subscriptions = new WsSubscriptions();
  
    this.pingInterval = setInterval(() => {
      if (this.pongTimeout) {
        return;
      }

      const now = new Date().getTime();

      if (pingTimeoutMs > (now - this.lastMessageReceivedTimestamp)) {
        return;
      }

      this.sendMessage(
        this.getMessage(
          PingMessageType,
          now
        )
      );

      this.lastSentPingID = now;

      this.pongTimeout = setTimeout(() => {
        const now = new Date().getTime();

        if (pingTimeoutMs > (now - this.lastMessageReceivedTimestamp)) {
          this.pongTimeout = null;
          return;
        }

        this.socket.close(4000, `Pong response wasn't recivied in timeout.`);
      }, pingTimeoutMs);

    }, pingIntervalMs);

    this.connect();
  }
  
  private connect () {
    if (this.socket instanceof WebSocket) {
      this.socket.close();
    }

    this.socket = new WebSocket(this.baseURL);
    
    this.socket.addEventListener('open', (event) => {
      const allSubscriptions = this.subscriptions.getAllAsArray();
    
      if (!allSubscriptions.length) {
        return;
      }

      // Re-subscribe old subscriptions for new connection
      allSubscriptions.forEach(subscription => {
        const { subID, path, listeners, headers } = subscription;
        this.subscribe(path, listeners, headers, subID);
      });

    });
    
    this.socket.addEventListener('message', (event) => this.recieveMessage(event));
    this.socket.addEventListener('error', (event) => {
      // Propagate an error to all subscriptions
      this.subscriptions
        .getAllAsArray()
        .forEach(subscription => {
          subscription.listeners.onError(new Error('Connection was lost.'));
        });
    });
    this.socket.addEventListener('close', (event) => {
      if (event.wasClean) {
        return;
      }

      this.tryReconnect();
    });
  }

  private tryReconnect () {
    if (this.socket.readyState === WSReadyState.Closed) {
      return this.connect();
    }

    this.subscriptions
      .getAllAsArray()
      .forEach(subscription => {
        subscription.listeners.onError(new NetworkError('Connection was lost.', subscription.subID));
      });
  }

  public subscribe(
    path: string,
    listeners: SubscriptionListeners,
    headers: ElementsHeaders,
    existingSubID?: number
  ) {
    if (existingSubID && typeof existingSubID === 'string') {
      debugger;
    }

    // If connection was closed, try to reconnect
    if (this.socket.readyState === WSReadyState.Closed) {
      this.tryReconnect();
    }
    
    // Add or select subscription
    const subID = (this.subscriptions.has(existingSubID)) ? existingSubID : this.subscriptions.addNew(path, listeners, headers);

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
    console.log('unsubscribe subID:', subID);
    this.sendMessage(
      this.getMessage(
        UnsubscribeMessageType,
        subID
      )
    );

    this.subscriptions.get(subID).listeners.onEnd(null);
    this.subscriptions.remove(subID);
  }

  private getMessage (
      messageType: WsMessageType,
      id: number,
      path?: string,
      headers?: ElementsHeaders
  ): Message {
    return [
      messageType,
      id,
      path,
      headers
    ];
  }

  private sendMessage (message: Message) {
    if (this.socket.readyState !== WSReadyState.Open) {
      return console.warn(`Can't send in "${WSReadyState[this.socket.readyState]}" state`);
    }

    this.socket.send(JSON.stringify(message));
  }

  private subscription (subID: number) {
    return this.subscriptions.get(subID);
  }

  private recieveMessage (event: any) {
    this.lastMessageReceivedTimestamp = new Date().getTime();

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

    switch (messageType) {
      case PongMessageType:
        this.onPongMessage(message);
      return;
      case PingMessageType:
        this.onPingMessage(message);
      return;
    }

    const subID = message.shift();
    const subscription = this.subscription(subID);

    if (!subscription) {
      return console.warn(`Recieved message for non existing subscription id: "${subID}"`);
    }

    const { listeners } = subscription;

    switch (messageType) {
      case OpenMessageType:
        this.onOpenMessage(message, subID, listeners);
      break;
      case EventMessageType:
        this.onEventMessage(message, listeners);
      break;
      case EosMessageType:
        this.onEOSMessage(message, subID, listeners);
      break;
      case PongMessageType:
        this.onPongMessage(message);
      break;
      default:
        listeners.onError(new Error('Recived non existing type of message.'));
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

  private onOpenMessage (message: Message, subID: number, subscriptionListeners: SubscriptionListeners) {
    subscriptionListeners.onOpen(message[1]);
  }

  private onEventMessage(eventMessage: Message, subscriptionListeners: SubscriptionListeners): Error {
    if (eventMessage.length !== 3) {
      return new Error('Event message has ' + eventMessage.length + ' elements (expected 4)');
    }

    const [eventId, headers, body] = eventMessage;
    if (typeof eventId !== 'string') {
      return new Error(`Invalid event ID in message: ${JSON.stringify(eventMessage)}`);
    }

    if (typeof headers !== 'object' || Array.isArray(headers)) {
      return new Error(`Invalid event headers in message: ${JSON.stringify(eventMessage)}`);
    }
    
    subscriptionListeners.onEvent({eventId, headers, body});
  }

  private onEOSMessage(eosMessage: Message, subID: number, subscriptionListeners: SubscriptionListeners): void {
    if (eosMessage.length !== 3) {
      return subscriptionListeners.onError(new Error(`EOS message has ${eosMessage.length} elements (expected 4)`));
    }

    const [statusCode, headers, body] = eosMessage;
    if (typeof statusCode !== 'number') {
      return subscriptionListeners.onError(new Error('Invalid EOS Status Code'));
    }
    
    if (typeof headers !== 'object' || Array.isArray(headers)) {
      return subscriptionListeners.onError(new Error('Invalid EOS ElementsHeaders'));
    }

    if (statusCode === 204) {
      return subscriptionListeners.onEnd(null);
    }

    return subscriptionListeners.onError(new ErrorResponse(statusCode, headers, body, subID));
  }

  private onPongMessage (message: Message) {
    const [ receviedPongID ] = message;

    if (this.lastSentPingID !== receviedPongID) {
      // Close with protocol error status code
      this.socket.close(4000, `Didn't recived pong in with proper ID`);
    }

    clearTimeout(this.pongTimeout);
    delete this.pongTimeout;
    this.lastSentPingID = null;
  }
  
  private onPingMessage (message: Message) {
    const [ receviedPingID ] = message;

    this.sendMessage(
      this.getMessage(
        PongMessageType,
        receviedPingID
      )
    );
  }

}
