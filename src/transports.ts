import { SubscribeStrategy } from './subscribe-strategy';
import { ElementsHeaders } from './network';
import { BaseSubscription } from './base-subscription';
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
        headers,
        subID
        ) => {
            return new BaseSubscription(
                path,
                transport,
                headers,
                logger, 
                listeners.onOpen, 
                listeners.onError,
                listeners.onEvent, 
                listeners.onEnd,
                subID
            );
    };

    return strategy;
};
