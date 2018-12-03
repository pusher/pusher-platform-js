import { ElementsHeaders } from '../network';
import { Subscription, SubscriptionListeners, SubscriptionTransport } from '../subscription';
export declare enum WSReadyState {
    Connecting = 0,
    Open = 1,
    Closing = 2,
    Closed = 3,
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
    constructor(host: string);
    subscribe(path: string, listeners: SubscriptionListeners, headers: ElementsHeaders): Subscription;
    unsubscribe(subID: number): void;
    private connect();
    private close(error?);
    private tryReconnectIfNeeded();
    private subscribePending(path, listeners, headers, subID?);
    private getMessage(messageType, id, path?, headers?);
    private sendMessage(message);
    private subscription(subID);
    private receiveMessage(event);
    private validateMessage(message);
    private onOpenMessage(message, subID, subscriptionListeners);
    private onEventMessage(eventMessage, subscriptionListeners);
    private onEOSMessage(eosMessage, subID, subscriptionListeners);
    private onCloseMessage(closeMessage);
    private onPongMessage(message);
    private onPingMessage(message);
}
