import { Logger } from '../logger';
import {
  ElementsHeaders,
  ErrorResponse,
  NetworkError,
  ProtocolError,
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

type SubscriptionData = {
  path: string;
  listeners: SubscriptionListeners;
  headers: ElementsHeaders;
  subID?: number;
};

type WsSubscriptionsType = {
  [key: number]: SubscriptionData;
};

class WsSubscriptions {
  private subscriptions: WsSubscriptionsType;

  constructor() {
    this.subscriptions = {};
  }

  add(
    subID: number,
    path: string,
    listeners: SubscriptionListeners,
    headers: ElementsHeaders,
  ): number {
    this.subscriptions[subID] = {
      headers,
      listeners,
      path,
    };

    return subID;
  }

  has(subID: number): boolean {
    return this.subscriptions[subID] !== undefined;
  }

  isEmpty(): boolean {
    return Object.keys(this.subscriptions).length === 0;
  }

  remove(subID: number): boolean {
    return delete this.subscriptions[subID];
  }

  get(subID: number): SubscriptionData {
    return this.subscriptions[subID];
  }

  getAll(): WsSubscriptionsType {
    return this.subscriptions;
  }

  getAllAsArray(): SubscriptionData[] {
    return Object.keys(this.subscriptions).map(subID => ({
      subID: parseInt(subID, 10),
      ...this.subscriptions[parseInt(subID, 10)],
    }));
  }

  removeAll() {
    this.subscriptions = {};
  }
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
  private subscriptions: WsSubscriptions;
  private pendingSubscriptions: WsSubscriptions;
  private lastMessageReceivedTimestamp: number;
  private pingInterval: any;
  private pongTimeout: any;
  private lastSentPingID: number | null;
  private logger: Logger;

  constructor(host: string, logger: Logger) {
    this.baseURL = `wss://${host}${this.webSocketPath}`;
    this.lastSubscriptionID = 0;
    this.logger = logger;
    this.subscriptions = new WsSubscriptions();
    this.pendingSubscriptions = new WsSubscriptions();

    this.connect();
  }

  subscribe(
    path: string,
    listeners: SubscriptionListeners,
    headers: ElementsHeaders,
  ): Subscription {
    // If connection was closed, try to reconnect
    this.tryReconnectIfNeeded();

    const subID = this.lastSubscriptionID++;

    // Add subscription to pending if socket is not open
    if (this.socket.readyState !== WSReadyState.Open) {
      this.pendingSubscriptions.add(subID, path, listeners, headers);
      return new WsSubscription(this, subID);
    }

    // Add or select subscription
    this.subscriptions.add(subID, path, listeners, headers);

    this.sendMessage(
      this.getMessage(SubscribeMessageType, subID, path, headers),
    );

    return new WsSubscription(this, subID);
  }

  unsubscribe(subID: number): void {
    this.sendMessage(this.getMessage(UnsubscribeMessageType, subID));

    const subscription = this.subscriptions.get(subID);
    if (subscription.listeners.onEnd) {
      subscription.listeners.onEnd(null);
    }
    this.subscriptions.remove(subID);
  }

  private connect() {
    this.forcedClose = false;
    this.closedError = null;

    this.socket = new global.WebSocket(this.baseURL);

    this.socket.onopen = (event: any) => {
      const allPendingSubscriptions = this.pendingSubscriptions.getAllAsArray();

      // Re-subscribe old subscriptions for new connection
      allPendingSubscriptions.forEach(subscription => {
        const { subID, path, listeners, headers } = subscription;
        this.subscribePending(path, listeners, headers, subID);
      });

      this.pendingSubscriptions.removeAll();

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

          this.close(
            new NetworkError(`Pong response wasn't received within timeout`),
          );
        }, pingTimeoutMs);
      }, pingIntervalMs);
    };

    this.socket.onmessage = (event: any) => this.receiveMessage(event);
    this.socket.onerror = (event: any) => {
      this.logger.verbose('WebSocket encountered an error event', event);
    };
    this.socket.onclose = (event: any) => {
      this.logger.verbose('WebSocket encountered a close event', event);

      const allSubscriptions = this.subscriptions
        .getAllAsArray()
        .concat(this.pendingSubscriptions.getAllAsArray());

      this.subscriptions.removeAll();
      this.pendingSubscriptions.removeAll();

      allSubscriptions.forEach(sub => {
        if (sub.listeners.onError) {
          sub.listeners.onError(this.closedError);
        }
      });

      this.tryReconnectIfNeeded();
    };
  }

  private close(error?: any) {
    if (!(this.socket instanceof global.WebSocket)) {
      return;
    }

    // In Chrome there is a substantial delay between calling close on a broken
    // websocket and the onclose method firing. When we're force closing the
    // connection we can expedite the reconnect process by manually calling
    // onclose. We then need to delete the socket's handlers so that we don't
    // get extra calls from the dying socket. Calling bind here means we get
    // a copy of the onclose callback, rather than a reference to it.
    const onClose = this.socket.onclose.bind(this);

    // Set all callbacks to be noops because we don't care about them anymore.
    // We need to set the callbacks to new values because just calling delete
    // doesn't seem to actually remove the property on the socket, and so
    // the onclose callback would end up being called twice, leading to sad
    // times.
    /* tslint:disable:no-empty */
    this.socket.onclose = () => {};
    this.socket.onerror = () => {};
    this.socket.onmessage = () => {};
    this.socket.onopen = () => {};
    /* tslint:enable:no-empty */

    this.forcedClose = true;
    this.closedError = error;
    this.socket.close();

    global.clearTimeout(this.pingInterval);
    global.clearTimeout(this.pongTimeout);
    this.pongTimeout = null;
    this.pingInterval = null;
    this.lastSentPingID = null;

    onClose();
  }

  private tryReconnectIfNeeded() {
    // If we've force closed, the socket might not actually be in the Closed
    // state yet but we should create a new one anyway.
    if (this.forcedClose || this.socket.readyState === WSReadyState.Closed) {
      this.connect();
    }
  }

  private subscribePending(
    path: string,
    listeners: SubscriptionListeners,
    headers: ElementsHeaders,
    subID?: number,
  ) {
    if (subID === undefined) {
      this.logger.debug(`Subscription to path ${path} has an undefined ID`);
      return;
    }

    // Add or select subscription
    this.subscriptions.add(subID, path, listeners, headers);

    this.sendMessage(
      this.getMessage(SubscribeMessageType, subID, path, headers),
    );
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
      this.logger.warn(
        `Can't send on socket in "${
          WSReadyState[this.socket.readyState]
        }" state`,
      );
      return;
    }

    this.socket.send(JSON.stringify(message));
  }

  private subscription(subID: number) {
    return this.subscriptions.get(subID);
  }

  private receiveMessage(event: any) {
    this.lastMessageReceivedTimestamp = new Date().getTime();

    // First try to parse event to JSON message.
    let message: Message;
    try {
      message = JSON.parse(event.data);
    } catch (err) {
      this.close(
        new ProtocolError(
          `Message is not valid JSON format. Getting ${event.data}`,
        ),
      );
      return;
    }

    // Validate structure of message.
    // Close connection if not valid.
    const nonValidMessageError = this.validateMessage(message);
    if (nonValidMessageError) {
      this.close(nonValidMessageError);
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

    const subID = message.shift();
    const subscription = this.subscription(subID);

    if (!subscription) {
      this.close(
        new Error(`Received message for unknown subscription ID: ${subID}`),
      );
      return;
    }

    const { listeners } = subscription;

    // Handle subscription level messages.
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
      default:
        this.close(new ProtocolError('Received unknown type of message.'));
    }
  }

  /**
   * Check if a single subscription message is in the right format.
   * @param message The message to check.
   * @returns null or error if the message is wrong.
   */
  private validateMessage(message: Message): ProtocolError | null {
    if (!Array.isArray(message)) {
      return new ProtocolError(
        `Message is expected to be an array. Getting: ${JSON.stringify(
          message,
        )}`,
      );
    }

    if (message.length < 1) {
      return new ProtocolError(
        `Message is empty array: ${JSON.stringify(message)}`,
      );
    }

    return null;
  }

  private onOpenMessage(
    message: Message,
    subID: number,
    subscriptionListeners: SubscriptionListeners,
  ) {
    if (subscriptionListeners.onOpen) {
      subscriptionListeners.onOpen(message[1]);
    }
  }

  private onEventMessage(
    eventMessage: Message,
    subscriptionListeners: SubscriptionListeners,
  ) {
    if (eventMessage.length !== 3) {
      if (subscriptionListeners.onError) {
        subscriptionListeners.onError(
          new ProtocolError(
            'Event message has ' +
              eventMessage.length +
              ' elements (expected 4)',
          ),
        );
      }
      return;
    }

    const [eventId, headers, body] = eventMessage;
    if (typeof eventId !== 'string') {
      if (subscriptionListeners.onError) {
        subscriptionListeners.onError(
          new ProtocolError(
            `Invalid event ID in message: ${JSON.stringify(eventMessage)}`,
          ),
        );
      }
      return;
    }

    if (typeof headers !== 'object' || Array.isArray(headers)) {
      if (subscriptionListeners.onError) {
        subscriptionListeners.onError(
          new ProtocolError(
            `Invalid event headers in message: ${JSON.stringify(eventMessage)}`,
          ),
        );
      }
      return;
    }

    if (subscriptionListeners.onEvent) {
      subscriptionListeners.onEvent({ eventId, headers, body });
    }
  }

  private onEOSMessage(
    eosMessage: Message,
    subID: number,
    subscriptionListeners: SubscriptionListeners,
  ) {
    this.subscriptions.remove(subID);

    if (eosMessage.length !== 3) {
      if (subscriptionListeners.onError) {
        subscriptionListeners.onError(
          new ProtocolError(
            `EOS message has ${eosMessage.length} elements (expected 4)`,
          ),
        );
      }
      return;
    }

    const [statusCode, headers, body] = eosMessage;
    if (typeof statusCode !== 'number') {
      if (subscriptionListeners.onError) {
        subscriptionListeners.onError(
          new ProtocolError('Invalid EOS Status Code'),
        );
      }
      return;
    }

    if (typeof headers !== 'object' || Array.isArray(headers)) {
      if (subscriptionListeners.onError) {
        subscriptionListeners.onError(
          new ProtocolError('Invalid EOS ElementsHeaders'),
        );
      }
      return;
    }

    if (statusCode === 204) {
      if (subscriptionListeners.onEnd) {
        subscriptionListeners.onEnd(null);
      }
      return;
    }

    if (subscriptionListeners.onError) {
      subscriptionListeners.onError(
        new ErrorResponse(statusCode, headers, body),
      );
    }

    return;
  }

  private onCloseMessage(closeMessage: Message) {
    const [statusCode, headers, body] = closeMessage;
    if (typeof statusCode !== 'number') {
      this.close(new ProtocolError('Close message: Invalid EOS Status Code'));
      return;
    }

    if (typeof headers !== 'object' || Array.isArray(headers)) {
      this.close(
        new ProtocolError('Close message: Invalid EOS ElementsHeaders'),
      );
      return;
    }

    const errorInfo = {
      error: body.error || 'network_error',
      error_description: body.error_description || 'Network error',
    };

    this.close(new ErrorResponse(statusCode, headers, errorInfo));
  }

  private onPongMessage(message: Message) {
    const [receviedPongID] = message;

    if (this.lastSentPingID !== receviedPongID) {
      this.close(
        new ProtocolError(
          `Received pong with ID ${receviedPongID} but last sent ping ID was ${
            this.lastSentPingID
          }`,
        ),
      );
    }

    global.clearTimeout(this.pongTimeout);
    delete this.pongTimeout;
    this.lastSentPingID = null;
  }

  private onPingMessage(message: Message) {
    const [receviedPingID] = message;

    this.sendMessage(this.getMessage(PongMessageType, receviedPingID));
  }
}
