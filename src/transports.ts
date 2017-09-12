import { SubscribeStrategy } from './subscription';

export let createH2TransportStrategy: () => SubscribeStrategy = () => {

    let strategy: SubscribeStrategy = (onOpen, onRetrying, onError, onEvent, onEnd, headers, baseSubscriptionConstructor) => {
        return baseSubscriptionConstructor(onOpen, onError, onEvent, onEnd, headers);
    }
    return strategy;
};