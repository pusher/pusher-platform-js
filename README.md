# pusher-platform.js

This is the official Pusher Platform client library for web browsers. Use it to build SDKs for services running on Pusher Platform / Elements infrastructure.

## Issues, Bugs, and Feature Requests

Feel free to create an issue on GitHub if you find anything wrong. Please use the existing template.
If you wish to contribute, please make a pull request.
To summon help you can also ping @pusher/sigsdk or @zmarkan.

## Installation

We assume you use yarn/npm in your development workflow. You can grab it from the yarn/npm repository:

```bash
yarn add '@pusher/platform'
```

The latest working version will always be published there.

If you like to live dangerously, you can check in the Releases tab on Github for the latest release, or clone a local version and refer to it using a relative path.

## Importing

We assume you use Webpack or something similar:

Currently there are two ways to import it - either import the whole thing:

#### Browser

```javascript
import PusherPlatform from '@pusher/platform';

let instance = new PusherPlatform.Instance(...);
```

#### React Native

```javascript
import PusherPlatform from '@pusher/platform/react-native';

let instance = new PusherPlatform.Instance(...);
```


Or import individual components. Currently you can access:

- Instance
- BaseClient
- Subscription


#### Browser

```javascript
import { Instance, ... } from '@pusher/platform';

let instance = new Instance(...);
```

#### React Native

```javascript
import { Instance, ... } from '@pusher/platform/react-native';

let instance = new Instance(...);
```

## Usage and Features

### Instance

This is the main entry point - represents a single instance of a service running on the Elements infrastructure.
Initialise with an `InstanceOptions` object that MUST contain at least the `locator`, `serviceName`, and `serviceVersion`.

InstanceOptions:
```typescript
  serviceName: string; //Mandatory
  locator: string; // Mandatory
  serviceVersion: string //Mandatory

  host?: string; // Use in debugging, overrides the cluster setting that is the part of `locator`
  encrypted?: boolean; // Defaults to true

  client?: BaseClient; // You can provide custom implementation - this will probably be deprecated in the future
  logger?: Logger; // You can provide custom implementation. Defaults to ConsoleLogger(2) - logging anything non-verbose (level debug and above)
```

It has 3 methods of interest:

- `request(options: RequestOptions): Promise<any>`

For regular HTTP requests. Relays to BaseClient.

RequestOptions:

```typescript
export interface RequestOptions {
  method: string;
  path: string;
  jwt?: string;
  headers?: ElementsHeaders;
  body?: any;
  logger?: Logger;
  tokenProvider?: TokenProvider;
}

request(options: RequestOptions, tokenParams?: any): Promise
```

- `subscribeNonResuming(options: SubscribeOptions)`

A subscription to events. Creates a SUBSCRIBE call using the base client. Returns `Subscription`

- `subscribeResuming(options: ResumableSubscribeOptions)`

Like a subscription, but allows you to specify a `initialEventId` that will return you all items from this ID. Example - Feeds. Returns `Subscription`.

### BaseClient

This makes all the requests and executes them. They are [standard XHR objects](https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest).

It also creates XHRs that are used to create instances of `Subscription`.

### Subscription

SubscribeOptions:
```typescript
export interface SubscribeOptions {
  path: string;
  headers?: ElementsHeaders;
  listeners: SubscriptionListeners;
  retryStrategyOptions?: RetryStrategyOptions;
  tokenProvider?: TokenProvider;
}

export interface SubscriptionListeners {
  onOpen?: (headers: ElementsHeaders) => void;
  onSubscribe?: () => void;
  onRetrying?:() => void;
  onEvent?: (event: SubscriptionEvent) => void;
  onError?: (error: any) => void;
  onEnd?: (error: any) => void;
}

```

There are standard callbacks for different subscription events `onOpen`, `onEvent`, `onEnd`, and `onError`. There are also helper callbacks `onRetrying` and `onSubscribe` that can be used to inform developers when a subscription has been lost or re-established.

Use `unsubscribe()` to close this subscription.


### Subscription and Resumable Subscription

Options:

```typescript
export interface SubscribeOptions {
  path: string;
  headers?: ElementsHeaders;
  listeners: SubscriptionListeners;
  retryStrategyOptions?: RetryStrategyOptions;
  tokenProvider?: TokenProvider;
}

export interface ResumableSubscribeOptions extends SubscribeOptions {
  initialEventId?: string;
}
```

Listeners:

```typescript
export interface SubscriptionListeners {
  onOpen?: (headers: ElementsHeaders) => void; // Triggered once per subscription
  onSubscribe?: () => void; // Triggered each time a subscription is established
  onRetrying?:() => void; // Triggered each time we are retrying to connect
  onEvent?: (event: SubscriptionEvent) => void; // Triggered for each event
  onError?: (error: any) => void; // Triggered once. Ends session
  onEnd?: (error: any) => void; // Triggered once.
}
```

Token Provider:

```typescript
export interface TokenProvider {
  fetchToken(tokenParams?: any): Promise<string>;
  clearToken(token?: string): void;
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
  verbose(message: string, error?: Error): void;
  debug(message: string, error?: Error): void;
  info(message: string, error?: Error): void;
  warn(message: string, error?: Error): void;
  error(message: string, error?: Error): void;
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

This is up to the service implementer to implement.

```typescript
export interface TokenProvider {
  fetchToken(tokenParams?: any): Promise<string>;
  clearToken(token?: string): void;
}
```

## Building

```bash
yarn install
yarn build  # builds both web and react-native versions in dist/
```

This will create `dist/web/pusher-platform.js` as the main library.

## Testing

We have 2 types of tests - unit and integration.

`yarn test-jest` for unit tests

Integration testing is trickier as it requires a testing service to be running. Currently it runs locally on your machine but this will eventually be deployed behind the Elements bridge.

The repository for it is [here](https://github.com/pusher/platform-sdk-tester), and it requires a working Go installation.
Then hopefully just run from the main directory of that test library:

```bash
dep ensure
./script/build
./target/server
```

Then run tests (from this dir): `yarn test-integration`.

This will run tests and watch the `src/` and `test/` dirs to rebuild every time a file is changed. Good for development.

Once we have some sort of CI setup we'll be able to run just `yarn test` to get everything going and run just once.

## Formatting and linting

Prettier and TSLint are used to keep the code formatted and linted nicely.

To format your code using Prettier, run:

```
yarn format
```

To lint your code using TSLint, run:

```
yarn lint
```

Please ensure that your code is formatted and linted before merging it into master.

## License

pusher-platform-js is released under the MIT license. See LICENSE for details.
