import { createRetryingStrategy } from './retrying-subscription';
import { createResumingStrategy } from './resuming-subscription';
import { TokenProvider } from './token-provider';
import { RetryStrategyOptions } from './retry-strategy';
import { RequestOptions, executeNetworkRequest } from './request';
import { Logger } from './logger';
import { Subscription, SubscriptionListeners, SubscriptionConstructor, replaceMissingListenersWithNoOps } from './subscription';
import { BaseSubscription } from './base-subscription';
import { createTokenProvidingStrategy } from './token-providing-subscription';
import { createTransportStrategy } from './transports';
import { ElementsHeaders, responseToHeadersObject } from './network';
import { subscribeStrategyListenersFromSubscriptionListeners } from './subscribe-strategy';
import WebSocketClient from './websocket-client';
import * as PCancelable from 'p-cancelable';

import WebSocketTransport from './transport/websocket';
import HttpTransport from './transport/http';

export interface BaseClientOptions {
    host: string;
    encrypted?: boolean;
    logger?: Logger;
}

export class BaseClient {
    private host: string;
    private XMLHttpRequest: any;
    private logger: Logger;
    private websocketTransport: WebSocketTransport;

    constructor(private options: BaseClientOptions) {
        this.host = options.host.replace(/\/$/, '');
        this.logger = options.logger;

        this.websocketTransport = new WebSocketTransport(this.host);
    }

    public request(options: RequestOptions, tokenProvider?: TokenProvider, tokenParams?: any): PCancelable {
        if(tokenProvider){
            return tokenProvider.fetchToken(tokenParams).then( token =>                  
                {
                    options.headers['Authorization'] = `Bearer: ${token}`
                    return executeNetworkRequest(
                        () => new HttpTransport(this.host).request(options),
                        options
                    )
                }
            ).catch( error => {
                console.log(error);
            })
        }
        else {
            return executeNetworkRequest(
                () => new HttpTransport(this.host).request(options),
                options
            );
        }
        
    }
    
    public subscribeResuming(
        path: string, 
        headers: ElementsHeaders, 
        listeners: SubscriptionListeners, 
        retryStrategyOptions: RetryStrategyOptions, 
        initialEventId: string,            
        tokenProvider: TokenProvider,
    ): Subscription {
        listeners = replaceMissingListenersWithNoOps(listeners);
        let subscribeStrategyListeners = subscribeStrategyListenersFromSubscriptionListeners(listeners);

        let subscriptionStrategy = createResumingStrategy(
            retryStrategyOptions,
            initialEventId,
            createTokenProvidingStrategy(
                tokenProvider,
                createTransportStrategy(
                    path,
                    this.websocketTransport,
                    this.logger
                ), 
                this.logger
            ),
            this.logger
        );


        let opened = false;
        return subscriptionStrategy(
            {
                onOpen: headers => {
                    if(!opened){
                        opened = true;
                        listeners.onOpen(headers);
                    }
                    listeners.onSubscribe();
                },
                onRetrying: subscribeStrategyListeners.onRetrying,
                onError: subscribeStrategyListeners.onError,
                onEvent: subscribeStrategyListeners.onEvent,
                onEnd: subscribeStrategyListeners.onEnd
            },
            headers
        );
    }
    public subscribeNonResuming(
        path: string, 
        headers: ElementsHeaders, 
        listeners: SubscriptionListeners, 
        retryStrategyOptions: RetryStrategyOptions, 
        tokenProvider: TokenProvider
    ){
        listeners = replaceMissingListenersWithNoOps(listeners);
        let subscribeStrategyListeners = subscribeStrategyListenersFromSubscriptionListeners(listeners);

        let subscriptionStrategy = createRetryingStrategy(
            retryStrategyOptions,
            createTokenProvidingStrategy(
                tokenProvider, 
                createTransportStrategy(
                    path,
                    this.websocketTransport,
                    this.logger
                ),
                this.logger
            ),
            this.logger
        );

        let opened = false;
        return subscriptionStrategy(
            {
                onOpen: headers => {
                    if(!opened){
                        opened = true;
                        listeners.onOpen(headers);
                    }
                    listeners.onSubscribe();
                },
                onRetrying: subscribeStrategyListeners.onRetrying,
                onError: subscribeStrategyListeners.onError,
                onEvent: subscribeStrategyListeners.onEvent,
                onEnd: subscribeStrategyListeners.onEnd
            },
            headers
        );
    }

}
