# pusher-platform.js

This is the official Pusher Platform client library for web browsers. Use it to build SDKs for services running on Pusher Platform / Elements infrastructure.

## Issues, Bugs, and Feature Requests

Feel free to create an issue on Github if you find anything wrong. Please use the existing template. 
If you wish to contribute, please make a pull request. 
To summon help you can also ping @pusher/sigsdk or @zmarkan.

## Installation

We assume you use yarn/npm in your development workflow. You can grab it from the npm/yarn repository:

```bash
yarn add 'pusher-platform'
```

The latest working version will always be published there. 

If you like to live dangerously, you can check in the Releases tab on Github for the latest release, or clone a local version and refer to it using a relative path. 

## Usage and Features

### Importing

We assume you use Webpack or something similar:

Currently there are two ways to import it - either import the whole thing:

```javascript
import PusherPlatform from `pusher-platform`;

let instance = new PusherPlatfrm.Instance(...);
```

Or import individual components:
Currently you can access:
- Instance
- BaseClient
- Subscription
- ResumableSubscription

```javascript
import { Instance, ... } from `pusher-platform`;

let instance = new Instance(...);
```

### Instance

This is the main entry point - represents a single instance of a service running on the Elements infrastructure.
Initialise with an `InstanceOptions` object that MUST contain at least the `instanceId`, `serviceName`, and `serviceVersion`.

InstanceOptions: 
```typescript
    serviceName: string; //Mandatory
    instanceId: string; // Mandatory
    serviceVersion: string //Mandatory

    host?: string; // Use in debugging, overrides the cluster setting that is the part of `instanceId` 
    encrypted?: boolean; // Defaults to true

    client?: BaseClient; // You can provide custom implementation - this will probably be deprecated in the future
    logger?: Logger; // You can provide custom implementation. Defaults to ConsoleLogger(2) - logging anything non-verbose (level debug and above)
```

It has 3 methods of interest:

- `request(options: RequestOptions): CancelablePromise<any>`

For regular HTTP requests. Relays to BaseClient.

RequestOptions:
```typescript
export interface RequestOptions {
  method: string;
  path: string;
  tokenProvider?: TokenProvider; 
  jwt?: string;
  headers?: ElementsHeaders;
  body?: any;
  retryStrategy?: RetryStrategy;
}
```

- `subscribeNonResuming(options: SubscribeOptions)`

A subscription to events. Creates a SUBSCRIBE call using baseclient. Returns `Subscription`

- `subscribeResuming(options: ResumableSubscribeOptions)`

Like a subscription, but allows you to specify a `initialEventId` that will return you all items from this ID. Example - Feeds. Returns `Subscription`

### BaseClient

This makes all the requests and executes them. They are [standard XHR objects](https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest). 
It also creates XHRs that are used to create instances of `Subscription`.

### Subscription

SubscribeOptions:
```typescript
export interface SubscribeOptions {
    path: string;
    tokenProvider?: TokenProvider;
    jwt?: string;
    lastEventId?: string;
    onOpen?: () => void;
    onEvent?: (event: Event) => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
    logger: Logger;
}
```

There are standard callbacks for different subscription events `onOpen`, `onEvent`, `onEnd`, and `onError`. 

Use `unsubscribe(err?: Error)` to close this subscription. It will either callback `onEnd` or `onError` depending on whether or not the `Error` object is passed to it as argument.


### Subscription adn Resumable Subscription

Options:

```typescript
export interface SubscribeOptions {
    path: string,
    headers?: ElementsHeaders,
    listeners: SubscriptionListeners,
    retryStrategyOptions?: RetryStrategyOptions,
    tokenProvider?: TokenProvider
}

export interface ResumableSubscribeOptions extends SubscribeOptions {
    initialEventId?: string
}
```

Listeners:

```typescript
export interface SubscriptionListeners {
    onOpen?: (headers: ElementsHeaders) => void; //Triggered once per subscription
    onSubscribe?: () => void; //Triggered each time a subscription is established
    onRetrying?:() => void; //Triggered each time we are retrying to connect
    onEvent?: (event: SubscriptionEvent) => void; //Triggered for each event
    onError?: (error: any) => void; //Triggered once. Ends session
    onEnd?: (error: any) => void; //Triggered once.
}
```

Token Provider:

```typescript
export interface TokenProvider {
    fetchToken(tokenParams?: any): PCancelable<string>;
    clearToken(token?: string);
}
```

- `tokenParams` can be anything, and is optional. Some services might require it.
- `clearToken` allows you to "forget" an expired token in the current token provider

Retry Strategy:

```typescript 
export interface RetryStrategyOptions {
    initialTimeoutMillis?:  number, //Defaults to 1000
    maxTimeoutMillis?: number, //Defaults to 5000
    limit?: number, //Defaults to -1 (unlimited). Set to 0 to disable retrying.
    increaseTimeout?: (currentTimeout: number) => number; //Defaults to currentTimeout*2 or maxTimeoutMillis
}
```

### Logger

It logs things. 
Interface:

```typescript
export interface Logger {
    verbose(message: string, error?: Error);
    debug(message: string, error?: Error);
    info(message: string, error?: Error);
    warn(message: string, error?: Error);
    error(message: string, error?: Error);
}
```

You can pass it to the `Instance` object at startup. The default implementation is the `ConsoleLogger`. You initiate it with a threshold for the log level (defaults to `LogLevel.DEBUG`). It will log everything at or above this log level.

The default log levels are:

```typescript
export enum LogLevel {
     VERBOSE = 1,
     DEBUG = 2,
     INFO = 3,
     WARNING = 4,
     ERROR = 5
}
```

### TokenProvider

__DEPRECATED__ This will probably change.

## Building

```bash
yarn install
yarn build  # creates target/pusher-platform.js and target/index.d.ts
```

This will create `target/pusher-platform.js` as the main library and `target/index.d.ts` as the typings file.

### Testing

We have 2 types of tests - unit and integration.

`yarn test-jest` for unit tests

Integration testing is trickier as it requires a testing service to be running. Currently it runs locally on your machine but this will eventually be deployed behind the Elements bridge.

The repository for it is here: https://github.com/pusher/platform-lib-tester, and it requires a working Go installation.
Then hopefully just run from the main directory of that test library:

```bash
glide install
./scripts/build
./scripts/run
```

Then run tests (from this dir): `yarn test-integration`.
This will run tests and watch the `src/` and `test/` dirs to rebuild every time a file is changed. Good for development.

Once we have some sort of CI setup we'll be able to run just `yarn test` to get everything going and run just once.

## License

pusher-platform-js is released under the MIT license. See LICENSE for details.
