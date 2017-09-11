import { SubscribeStrategy } from './subscription';

export let createH2TransportStrategy: () => SubscribeStrategy = () => {
    let strategy: SubscribeStrategy = (onOpen, onError, onEvent, onEnd, headers, baseSubscriptionConstructor) => {
        return baseSubscriptionConstructor(headers, onOpen, onError, onEvent, onEnd);
    }
    return strategy;
};