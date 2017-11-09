import { Logger } from './logger';
import { SubscribeStrategy } from './subscribe-strategy';
import { TokenProvider } from './token-provider';
export declare let createTokenProvidingStrategy: (tokenProvider: TokenProvider, nextSubscribeStrategy: SubscribeStrategy, logger: Logger) => SubscribeStrategy;
