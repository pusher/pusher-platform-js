import { Logger } from './logger';
import { SubscribeStrategy } from './subscribe-strategy';
import { SubscriptionTransport } from './subscription';
export declare let createTransportStrategy: (path: string, transport: SubscriptionTransport, logger: Logger) => SubscribeStrategy;
