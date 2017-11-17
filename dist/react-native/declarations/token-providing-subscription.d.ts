import { Logger } from './logger';
import { TokenProvider } from './token-provider';
import { SubscribeStrategy } from './subscribe-strategy';
export declare let createTokenProvidingStrategy: (nextSubscribeStrategy: SubscribeStrategy, logger: Logger, tokenProvider?: TokenProvider) => SubscribeStrategy;
