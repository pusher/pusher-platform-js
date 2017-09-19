import { SubscribeStrategy } from './subscribe-strategy';
import { ElementsHeaders } from './network';
import { BaseSubscription } from './base-subscription';
import { Logger } from './logger';

export let createH2TransportStrategy: (
    requestFactory: (headers: ElementsHeaders) => XMLHttpRequest, 
    logger: Logger 
) => SubscribeStrategy = (
    requestFactory,
    logger
) => {

    let strategy: SubscribeStrategy = (
        listeners,
        headers
        ) => {
            return new BaseSubscription(
                requestFactory(headers), 
                logger, 
                listeners.onOpen, 
                listeners.onError,
                listeners.onEvent, 
                listeners.onEnd
            );
    }
    return strategy;
};