import { SubscribeStrategy } from './subscribe-strategy';
import { ElementsHeaders } from './network';
import { BaseSubscription } from './base-subscription';
import { Logger } from './logger';

import HttpTransport from './transport/http';

export let createH2TransportStrategy: (
    transport: (headers: ElementsHeaders) => HttpTransport, 
    logger: Logger 
) => SubscribeStrategy = (
    transport,
    logger
) => {

    let strategy: SubscribeStrategy = (
        listeners,
        headers
        ) => {
            return new BaseSubscription(
                transport(headers),
                logger, 
                listeners.onOpen, 
                listeners.onError,
                listeners.onEvent, 
                listeners.onEnd
            );
    }
    return strategy;
};
