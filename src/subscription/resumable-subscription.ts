// import { NoOpTokenProvider, TokenProvider } from '../token-provider';
// import { ErrorResponse, Headers } from '../base-client';
// import { RetryStrategy } from '../retry-strategy/retry-strategy';
// import { Logger } from '../logger';
// import {
//     BaseSubscription,
//     SubscriptionEvent,
// } from './base-subscription'

// export interface ResumableSubscribeOptions {
//     headers: Headers;
//     path: string;
//     retryStrategy?: RetryStrategy;
//     initialEventId?: string;
//     listeners: ResumableSubscriptionStateListeners;
//     logger: Logger;
//     tokenProvider?: TokenProvider;
// }

// export interface ResumableSubscriptionState {
//     unsubscribe(): void;
// }

// export interface ResumableSubscriptionStateListeners {
//     onOpen: (headers: Headers) => void;
//     onEvent: (event: SubscriptionEvent) => void;
//     onError: (error: any) => void;    
    
//     onConnected?: () => void;
//     onResuming?: () => void;
//     onEnd?: (error?: ErrorResponse) => void;
// }

// export interface ResumableSubscriptionStateTransition {
//     onTransition(state: ResumableSubscriptionState): void
// }

// export class ResumableSubscription implements ResumableSubscriptionStateTransition{

//     private state: ResumableSubscriptionState ;
//     constructor(
//         subscriptionConstructor: (headers: Headers) => Promise<BaseSubscription>,
//         retryStrategy: RetryStrategy,
//         initialEventId: string,
//         listeners: ResumableSubscriptionStateListeners,        
//     ){
//         this.state = new SubscribingResumableSubscriptionState(
//             subscriptionConstructor,
//             retryStrategy,
//             initialEventId,
//             listeners,
//             this.onTransition
//         )   
//     }

//     onTransition = function(newState: ResumableSubscriptionState){
//         this.state = newState;
//     }
    
//     unsubscribe(){
//         this.state.unsubscribe();
//     }
// }

// class SubscribingResumableSubscriptionState implements ResumableSubscriptionState {
    
//     constructor(
//         subscriptionConstructor: (headers: Headers) => Promise<BaseSubscription>,
//         retryStrategy: RetryStrategy,
//         initialEventId: string,                
//         listeners: ResumableSubscriptionStateListeners, 
//         onTransition: (newState: ResumableSubscriptionState) => void        
//     ) { 
//         retryStrategy.executeSubscription(
//             subscriptionConstructor,
//             subscription => {
//                 listeners.onOpen(subscription.getHeaders());
//                 onTransition(new OpenSubscriptionState(
//                     subscription,
//                     initialEventId,
//                     subscriptionConstructor,
//                     listeners,
//                     onTransition
//                 ));
//             },
//             error => {
//                 onTransition(new FailedSubscriptionState(error, listeners));
//             }
//         );
//     }

//     unsubscribe() {
//        //TODO:
//     }
// }

// class OpenSubscriptionState implements ResumableSubscriptionState {
//     constructor(
//         private subscription: BaseSubscription,
//         lastEventId: string,
//         subscriptionConstructor: (headers: Headers) => Promise<BaseSubscription>,
//         listeners: ResumableSubscriptionStateListeners,
//         onTransition: (newState: ResumableSubscriptionState) => void
//     ){
//         listeners.onConnected();        
//         subscription.onEvent = (event) => {
//             lastEventId = event.eventId;
//             listeners.onEvent(event);
//         };
//         subscription.onEnd = (error) => {
//             onTransition( new EndedResumableSubscriptionState(
//                 error, 
//                 listeners));
//         };
//         subscription.onError = (error) => {
//             onTransition( new ResumingResumableSubscriptionState(
//                 error,
//                 lastEventId,
//                 subscriptionConstructor,
//                 listeners,
//                 onTransition
//             ));
//         }
//     }
//     unsubscribe(){
//         this.subscription.unsubscribe();
//     }
// }

// class ResumingResumableSubscriptionState implements ResumableSubscriptionState {
//     constructor(
//         error: any,
//         lastEventId: string,
//         subscriptionConstructor: (headers: Headers) =>  Promise<BaseSubscription>,
//         listeners: ResumableSubscriptionStateListeners,
//         onTransition: (newState: ResumableSubscriptionState) => void
//     ){
//         listeners.onResuming();     
        
//         let retryStrategy: RetryStrategy;    //TODO: pass this somewhere

//         retryStrategy.executeSubscription(
//             subscriptionConstructor,
//             subscription => {
//                 listeners.onOpen(subscription.getHeaders());
//                 onTransition(new OpenSubscriptionState(
//                     subscription,
//                     lastEventId,
//                     subscriptionConstructor,
//                     listeners,
//                     onTransition
//                 ));
//             },
//             error => {
//                 onTransition(new FailedSubscriptionState(error, listeners));
//             },
//             error
//         );
//     }

//     unsubscribe() {
//         //TODO:
//     }
// }

// class FailedSubscriptionState implements ResumableSubscriptionState {
//     constructor(
//         error: any,
//         listeners: ResumableSubscriptionStateListeners
//     ){
//         listeners.onError(error);
//     }

//     unsubscribe(){ throw new Error("Tried unsubscribing in failed subscription state"); }
    
// }

// class EndedResumableSubscriptionState implements ResumableSubscriptionState {
//     constructor(
//         error: any,
//         listeners: ResumableSubscriptionStateListeners
//     ){
//         listeners.onEnd(error);
//     }
//     unsubscribe(){ throw new Error("Tried unsubscribing in ended subscription state"); }
// }
