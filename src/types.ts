export type Headers = {
  [key : string]: string;
}

export interface Event {
  eventId : string;
  headers: Headers;
  body: any;
}

export interface RequestOptions {
  method : string;
  path : string;
  jwt? : string;
  headers? : Headers;
  body ?: any;
}

export interface SubscribeOptions {
  path : string;
  jwt? : string;
  headers? : Headers;
  onOpen : () => void;
  onEvent : (event: Event) => void;
  onEnd : () => void;
  onError : (error: Error) => void;
}
