import { Logger } from './logger';
import { TokenProvider } from './token-provider';
import { SubscribeStrategy } from './subscribe-strategy';
export declare let createTokenProvidingStrategy: (tokenProvider: TokenProvider, nextSubscribeStrategy: SubscribeStrategy, logger: Logger) => SubscribeStrategy;
