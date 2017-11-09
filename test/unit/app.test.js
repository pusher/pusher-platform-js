const PusherPlatform = require('../../dist/web/pusher-platform.js').default;

describe('Instance', () => {

    test('empty', () => {
        //No tests yet :(
    }) ;

    it('Throws an error if `locator` is missing', () => {

      expect(
        () => new PusherPlatform.Instance({})
      ).toThrow(new Error('Expected `locator` property in Instance options!'));
    })
});
