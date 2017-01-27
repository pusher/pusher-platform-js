# pusher-platform.js

This is the official Pusher Platform client library for web browsers.

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

We have a 4 steps quick start guide available in [our documentation](https://github.com/pusher/feeds-api/wiki/Getting-Started-%5BJavascript%5D) (and in our dashboard).


## Walk-through

Let's walk through the "hello world" of Pusher Platform: an event log. If you just want to see the end product, it's [deployed here](https://pusher.github.io/pusher-platform-js/example.html) for you to play around with, and [the source is here](https://github.com/pusher/pusher-platform-js/blob/master/example.html).

To initialize the library, we write:

```js
var app = new PusherPlatform.App({ appId: "yourAppId" // Get this from your dashboard });
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


## Building

```bash
npm install
npm run build  # creates target/pusher-platform.js
npm run test
```
