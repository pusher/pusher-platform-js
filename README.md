# pusher-platform.js

This is the official Pusher Platform client library for web browsers.

## Copy-paste!

```js
var app = new PusherPlatform.App({
  appId: "d41c21c3-549a-4d9d-a368-f2b058e0655b",
  authorizer: new PusherPlatform.SimpleTokenAuthorizer("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJkNDFjMjFjMy01NDlhLTRkOWQtYTM2OC1mMmIwNThlMDY1NWIiLCJpc3MiOiI4MDc4YjY5MS02ZWJjLTQ0YWEtOTUwMS1jYWIyOWVhZGMyZjUiLCJncmFudHMiOnsiL2FwcHMvZDQxYzIxYzMtNTQ5YS00ZDlkLWEzNjgtZjJiMDU4ZTA2NTViLyoqIjpbIioiXX0sImlhdCI6MTQ4NDkyMzIzMH0.rNt_9xqt8kgm0DqTGaXp7ezKYCmFxniilU86PlFooYk")
});
var notificationsFeed = app.feed("notifications");
notificationsFeed.subscribe({
  lastEventId: "0",
  onOpen: () => { console.log("Subscription opened"); },
  onItem: (item) => { console.log("received feed item", item); },
  onError: (err) => { console.error("Error subscribing to notifications:", err); }
});
notificationsFeed.append(document.getElementById("item_val").value)
  .then((response) => console.log("Success response when appending:", response))
  .catch((err) => console.error("Error:", err));
```

## Walk-through

Let's walk through the "hello world" of Pusher Platform: an event log. If you just want to see the end product, it's [deployed here](https://pusher.github.io/pusher-platform-js/example.html) for you to play around with, and [the source is here](https://github.com/pusher/pusher-platform-js/blob/master/example.html).

To initialize the library, we write:

```js
var app = new PusherPlatform.App({ appId: "TODO GET THIS FROM YOUR DASHBOARD", authorizer: /* TODO */ });
```

We need to fill in those two arguments. To get your App ID, sign in to https://dash.pusher.com/. Your App ID is a UUID which is part of the URL, like this: `https://dash.pusher.com/apps/abcdefgh-ijkl-mnop-qrst-uvwxyz012345/feeds/getting-started`. Copy-paste your App ID from the URL.

The `authorizer` is a _token source_; it gives your app "tokens" to allow it to use Pusher services. Tokens are strings. You can find one on your dashboard under "Tokens". For our `authorizer`, we'll just use a `SimpleTokenAuthorizer` which always returns this same token. Now we have:

```js
var app = new PusherPlatform.App({
  appId: "abcdefgh-ijkl-mnop-qrst-uvwxyz012345",  // from your dashboard
  authorizer: new PusherPlatform.SimpleTokenAuthorizer("j75wh53t43t...u75eyw53t") // from your dashboard
});
```

An `App` object provides access to Pusher Platform's many APIs. Our event log app will use the Feeds API. Feeds is a pub-sub service with history. Each of your feeds has a name, like `"notifications"`, `"users-jim"`, or `"order-progress-825435"`. To access a single feed, we write:

```js
var notificationsFeed = app.feed("notifications");
```

Creating the `notificationsFeed` object doesn't do anything by itself; it's just an interface to the feed. To access the items in the feed, we subscribe to it:

```js
notificationsFeed.subscribe({ onItem: (item) => { console.log("received feed item", item); } });
```

This subscriber will only receive new items when they are appended to the feed. This is done with the second Feeds API call, `append`:

```js
notificationsFeed.append("Jim added you as a friend");
```

When an item is appended to a feed, all subscribers at that time will receive it. So far, this is a standard pub-sub service. But Feeds also has history: as well as distributing the item to subscribers, Feeds also _appends_ it to the stored feed. Subscribers can access historical items when subscribing, by passing in the _event id_ of the last seen item. This "event id" is a property of each item passed to `onItem`.

```js
notificationsFeed.subscribe({
  lastEventId: "25",
  onItem: (item) => { console.log("received feed item", item); }
});
```

The historical items will come through in the subscription in exactly the same way as new items. All items will come through in the order they were appended.

The `subscribe` and `append` calls accept other callbacks. You can use these for debugging and to inform your user of important events. Here is a full example:

```js
notificationsFeed.subscribe({
  lastEventId: "0",
  onOpen: () => { console.log("Subscription opened"); },
  onItem: (item) => { console.log("received feed item", item); },
  onError: (err) => { console.error("Error subscribing to notifications:", err); }
});

notificationsFeed.append("Jim added you as a friend")
  .then((response) => console.log("Success response when appending:", response))
  .catch((err) => console.error("Error:", err));
```

## Installation

The simplest way is to use our CDN to get the bleeding-edge version:

```html
<script src="https://js.pusher.com/platform/latest/pusher-platform.js"></script>
<script src="https://js.pusher.com/platform/latest/pusher-platform.min.js"></script>
```

You can also use NPM:

```bash
npm install --save pusher-platform-js
```

## Building

```bash
npm install
npm run build  # creates target/pusher-platform.js
npm run test
```
