import { SubscribeStrategy } from './subscribe-strategy';
import { Logger } from './logger';
import { SubscriptionTransport } from './subscription';
export declare let createTransportStrategy: (path: string, transport: SubscriptionTransport, logger: Logger) => SubscribeStrategy;
