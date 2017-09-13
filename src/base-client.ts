import { createRetryingStrategy } from './retrying-subscription';
import { createResumingStrategy } from './resuming-subscription';
import { TokenProvider } from './token-provider';
import { RetryStrategyOptions } from './retry-strategy';
import { RequestOptions, NetworkResponse, executeNetworkRequest } from './request';
import { Logger } from './logger';
import { Subscription, SubscriptionListeners, SubscriptionConstructor, replaceMissingListenersWithNoOps } from './subscription';
import { BaseSubscription } from './base-subscription';
import { createTokenProvidingStrategy } from './token-providing-subscription';
import { createH2TransportStrategy } from './transports';
import { ElementsHeaders, responseToHeadersObject } from './network';


export interface BaseClientOptions {
    host: string;
    encrypted?: boolean;
    logger?: Logger;
}

export class BaseClient {
    private baseURL: string;
    private XMLHttpRequest: any;
    private logger: Logger;
    constructor(private options: BaseClientOptions) {
        let host = options.host.replace(/\/$/, '');
        this.baseURL = `${options.encrypted !== false ? "https" : "http"}://${host}`;
        this.logger = options.logger;
    }

    private xhrConstructor: (path: string) => (headers: ElementsHeaders) => XMLHttpRequest = (path) => {
        
        return (headers) => {
            const requestOptions: RequestOptions = {
                method: "SUBSCRIBE",
                path: path,
                headers: headers
            }
    
            return this.createXHR(this.baseURL, requestOptions);
        }
    }

    //TODO: add retrying
    public request<T>(options: RequestOptions): NetworkResponse<T>{
        return executeNetworkRequest<T>(
            () => this.createXHR(this.baseURL, options),
            options
        );
    }
    
    public subscribeResuming(
        path: string, 
        headers: ElementsHeaders, 
        listeners: SubscriptionListeners, 
        retryStrategyOptions: RetryStrategyOptions, 
        initialEventId: string,            
        tokenProvider: TokenProvider,
    ): Subscription {
        let requestFactory = this.xhrConstructor(path);
        let listenersOrNoOps = replaceMissingListenersWithNoOps(listeners);
        // let subscriptionConstructor: SubscriptionConstructor = ( // move this guy to the H2Transport Strategy
        //     onOpen,
        //     onError,
        //     onEvent,
        //     onEnd,
        //     headers
        // ) => new BaseSubscription(
        //     xhrFactory(headers), 
        //     this.logger, 
        //     onOpen, 
        //     onError, 
        //     onEvent,
        //     onEnd
        // );

        let subscriptionStrategy = createResumingStrategy(
            retryStrategyOptions,
            initialEventId,
            createTokenProvidingStrategy(
                tokenProvider, 
                createH2TransportStrategy(requestFactory, this.logger), 
                this.logger),
            this.logger
        );

        let opened = false;
        return subscriptionStrategy(
            headers => {
                if(!opened){
                    opened = true;
                    listenersOrNoOps.onOpen(headers);
                }
                listenersOrNoOps.onSubscribe();
            },
            listenersOrNoOps.onRetrying,
            listenersOrNoOps.onError,
            listenersOrNoOps.onEvent,
            listenersOrNoOps.onEnd,
            headers
            // subscriptionConstructor
        );
    }
    public subscribeNonResuming(
        path: string, 
        headers: ElementsHeaders, 
        listeners: SubscriptionListeners, 
        retryStrategyOptions: RetryStrategyOptions, 
        tokenProvider: TokenProvider
    ){
        let xhrFactory = this.xhrConstructor(path);
        
        let listenersOrNoOps = replaceMissingListenersWithNoOps(listeners);
    
        let subscriptionConstructor: SubscriptionConstructor = (
            onOpen,
            onError,
            onEvent,
            onEnd,
            headers,             
        ) => new BaseSubscription(
            xhrFactory(headers), 
            this.logger, 
            onOpen, 
            onError, 
            onEvent,
            onEnd
        );
        let subscriptionStrategy = createRetryingStrategy(
            retryStrategyOptions,
            createTokenProvidingStrategy(
                tokenProvider, 
                createH2TransportStrategy(xhrFactory, this.logger), 
                this.logger),
            this.logger
        );
        let opened = false;
        return subscriptionStrategy(
            headers => {
                if(!opened){
                    opened = true;
                    listenersOrNoOps.onOpen(headers);
                }
            },
            listenersOrNoOps.onRetrying,
            listenersOrNoOps.onError,
            listenersOrNoOps.onEvent,
            listenersOrNoOps.onEnd,
            headers
        );
    }

    private createXHR(baseURL: string, options: RequestOptions): XMLHttpRequest {
        
        let XMLHttpRequest: any = (<any>window).XMLHttpRequest;
        let xhr = new XMLHttpRequest();
        let path = options.path.replace(/^\/+/, "");
        let endpoint = `${baseURL}/${path}`;
        xhr.open(options.method.toUpperCase(), endpoint, true);
        if (options.body) {
            xhr.setRequestHeader("content-type", "application/json");
        }
        if (options.jwt) {
            xhr.setRequestHeader("authorization", `Bearer ${options.jwt}`);
        }
        for (let key in options.headers) {
            xhr.setRequestHeader(key, options.headers[key]);
        }
        return xhr;
    }
}