# pusher-platform.js

This is the official Pusher Platform client library for web browsers. Use it to build SDKs for services running on Pusher Platform / Elements infrastructure.

## Installation

We assume you use yarn/npm in your development workflow. 
It's currently not published on the npm repository so the way to include is by pointing to this repository:  

Package.json:

```javascript
"dependencies": {
    ...
    "pusher-platform": "git+ssh://git@github.com:pusher/pusher-platform-js.git"
    ...
}
```

You can also specify a particular commit, branch or release tag by appending `#commit-ish` to the end. See https://docs.npmjs.com/files/package.json#git-urls-as-dependencies for a more detailed explanation.

## Usage and Features

Use Webpack.

Import it with:

```JavaScript
import PusherPlatform from `pusher-platform`
```

Then you can access all exported classes by calling referencing them from it: `PusherPlatform.App`.

__Note - this will likely change in the future. __

### App

This is the main entry point - represents a single Elements app.

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
