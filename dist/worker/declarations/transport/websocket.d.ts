import { Logger } from '../logger';
import { ElementsHeaders } from '../network';
import { Subscription, SubscriptionListeners, SubscriptionTransport } from '../subscription';
export declare enum WSReadyState {
    Connecting = 0,
    Open = 1,
    Closing = 2,
    Closed = 3
}
export default class WebSocketTransport implements SubscriptionTransport {
    private baseURL;
    private webSocketPath;
    private socket;
    private forcedClose;
    private closedError;
    private lastSubscriptionID;
    private subscriptions;
    private pendingSubscriptions;
    private lastMessageReceivedTimestamp;
    private pingInterval;
    private pongTimeout;
    private lastSentPingID;
    private logger;
    constructor(host: string, logger: Logger);
    subscribe(path: string, listeners: SubscriptionListeners, headers: ElementsHeaders): Subscription;
    unsubscribe(subID: number): void;
    private connect;
    private close;
    private tryReconnectIfNeeded;
    private subscribePending;
    private getMessage;
    private sendMessage;
    private subscription;
    private receiveMessage;
    private validateMessage;
    private onOpenMessage;
    private onEventMessage;
    private onEOSMessage;
    private onCloseMessage;
    private onPongMessage;
    private onPingMessage;
}
