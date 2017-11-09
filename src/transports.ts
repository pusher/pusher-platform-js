import { Logger } from './logger';
import { ElementsHeaders } from './network';
import { SubscribeStrategy } from './subscribe-strategy';
import { SubscriptionTransport } from './subscription';

export let createTransportStrategy: (
  path: string,
  transport: SubscriptionTransport,
  logger: Logger,
) => SubscribeStrategy = (path, transport, logger) => {
  return (listeners, headers) => transport.subscribe(path, listeners, headers);
};
