# Change Log

This project adheres to [Semantic Versioning Scheme](http://semver.org)

## [v0.7.0] 2017-07-19

### Changes

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