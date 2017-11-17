import { Logger } from './logger';
import { SubscribeStrategy } from './subscribe-strategy';
import { TokenProvider } from './token-provider';
export declare let createTokenProvidingStrategy: (nextSubscribeStrategy: SubscribeStrategy, logger: Logger, tokenProvider?: TokenProvider) => SubscribeStrategy;
