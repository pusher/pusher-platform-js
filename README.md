# pusher-platform.js

This is the official Pusher Platform client library for web browsers. Use it to build SDKs for services running on Pusher Platform / Elements infrastructure.

## Installation

We assume you use yarn/npm in your development workflow. 
It's currently not published on the npm repository so the way to include is by pointing to this repository:  

Package.json:

```javascript
"dependencies": {
    ...
    "pusher-platform-js": "git+ssh://git@github.com:pusher/pusher-platform-js.git"
    ...
}
```

You can also specify a particular commit, branch or release tag by appending `#commit-ish` to the end. See https://docs.npmjs.com/files/package.json#git-urls-as-dependencies for a more detailed explanation.

## Features

### Service

This is the main entry point - represents a single provisioned Elements service.

Initialise with `serviceId` (required) and `cluster` (optional).

It has 3 methods of interest:

- `request(options: RequestOptions)`

For regular HTTP requests.

- `subscribe(options: SubscribeOptions)`

A subscription to events. 

- `resumableSubscribe(options: ResumableSubscribeOptions)`

Like a subscription, but allows you to specify a `lastEventId` that will return you all items from this ID. Example - Feeds.

## Building

```bash
yarn install
yarn build  # creates target/pusher-platform.js
yarn test
```
