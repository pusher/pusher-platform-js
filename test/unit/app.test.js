const PusherPlatform = require('../../target/pusher-platform.js').default;

describe('Instance', () => {

    test('empty', () => {
        //No tests yet :(
    }) ;

    it('Throws an error if `serviceId` is missing', () => {

      expect(
        () => new PusherPlatform.Instance({})
      ).toThrow(new Error('Expected `serviceId` property in Instance options'));
    })
});
