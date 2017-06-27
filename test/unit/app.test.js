const PusherPlatform = require('../../target/pusher-platform.js').default;

describe('App', () => {

    test('empty', () => {
        //No tests yet :(
    }) ;

    it('Throws an error if `serviceId` is missing', () => {

      expect(
        () => new PusherPlatform.App({})
      ).toThrow(new Error('Expected `serviceId` property in App options'));
    })
});
