# Change Log

This project adheres to [Semantic Versioning Scheme](http://semver.org)

## [v0.9.0] 2017-09-14

Refactored a lot of stuff internally, some API changes. This is a big release.
There will be an additional document describing how subscriptions are constructed, and how they work "under the hood".

### Changes

- We stopped using the term 'resumable' in favour of 'resuming'. Resumable as a passive form is used to describe a resource, on a remote server, whereas Resuming is an active form and better describes the client's behaviour.
- renamed `Instance.subscribe` to `Instance.subscribeNonResuming` 
- renamed `Instance.subscribeResumable` to `Instance.subscribeResuming`
- all subscriptions now return an object of type `Subscription`, that can be unsubscribed via `subscription.unsubscribe()`.
-  Removed the `RetryStrategy` in favour of `RetryStrategyOptions`. Any custom config can be passed in there, including limit for maximum number of retries, and the function to increment the wait time.
- Listeners are now passed to subscriptions as a single interface, containing optional callbacks:
    - `onOpen(headers)`, 
    - `onSubscribe()`, 
    - `onError(error)`, 
    - `onEvent(event)`,
    - `onEnd(error)`
- `onError` now returns `any` type, making for easier casting. 
- `TokenProvider` is now an interface. Implementers are expected to create their own. 
- `TokenProvider` returns a cancelable promise - from the `p-cancelable` library. 
- `Logger` now can't be passed to each request anymore. It is now only created as part of `Instance` creation.
- `Instance.request` now returns a `CancelablePromise` from `p-cancelable` library. It does not retry as of now.

## [v0.7.0] 2017-07-19

### Changes

- Renamed the `instance` to `instanceId` when instantiating an `Instance`. `Instance` class now has a parameter `id` that used to be `instance`. 
- Won the Internet for the most confusing changelog entries.

## [v0.6.1] 2017-07-10

### Fixes

- `ErrorResponse` `instanceof` now works correctly
- `Retry-After` header is now handled correctly.

## [v0.6.0] 2017-07-05

### Changes

- Changed the artifact name to `pusher-platform`
- Renamed `App` to `Instance`, `appId` to `instanceId`.
- Updated the tenancy to the upcoming standard: https://cluster.and.host/services/serviceName/serviceVersion/instanceId/...

_.. prehistory_
