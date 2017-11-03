import { SubscribeStrategy } from './subscribe-strategy';
import { ElementsHeaders } from './network';
import { Logger } from './logger';
import { SubscriptionTransport } from './subscription';

export let createTransportStrategy: (
    path: string,
    transport: SubscriptionTransport,
    logger: Logger
) => SubscribeStrategy = (
    path,
    transport,
    logger
) => {
    let strategy: SubscribeStrategy = (
        listeners,
        headers
        ) => (
            transport.subscribe(
                path,
                listeners,
                headers
            )
        );

    return strategy;
};
