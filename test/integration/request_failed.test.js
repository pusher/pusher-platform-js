const {
  default: PusherPlatform,
} = require('../../dist/web/pusher-platform.js');

const { INSTANCE_HOST } = require('./config');

// these just test GET - everything else should just work.
describe('Instance requests - failing', () => {
  let instance;
  let instanceWithTokenProvider;

  beforeAll(() => {
    instance = new PusherPlatform.Instance({
      locator: 'v1:api-ceres:1',
      serviceName: 'platform_sdk_tester',
      serviceVersion: 'v1',
      host: INSTANCE_HOST,
    });

    class DummyTokenProvider {
      fetchToken(tokenParams) {
        return Promise.resolve('blahblaharandomtoken');
      }

      clearToken(token) {}
    }

    instanceWithTokenProvider = new PusherPlatform.Instance({
      locator: 'v1:api-ceres:1',
      serviceName: 'platform_sdk_tester',
      serviceVersion: 'v1',
      host: INSTANCE_HOST,
      tokenProvider: new DummyTokenProvider(),
    });
  });

  describe('with no token provider', () => {
    it('fails on 400 error', done => {
      instance
        .request({
          method: 'GET',
          path: 'get_400',
        })
        .then(res => {
          fail('Expecting error');
        })
        .catch(error => {
          expect(error.statusCode).toBe(400);
          done();
        });
    });

    it('fails on 403 error', done => {
      instance
        .request({
          method: 'GET',
          path: 'get_403',
        })
        .then(res => {
          fail('Expecting error');
        })
        .catch(error => {
          expect(error.statusCode).toBe(403);
          done();
        });
    });

    it('fails on 404 error', done => {
      instance
        .request({
          method: 'GET',
          path: 'get_404',
        })
        .then(res => {
          fail('Expecting error');
        })
        .catch(error => {
          expect(error.statusCode).toBe(404);
          done();
        });
    });

    it('fails on 500 error', done => {
      instance
        .request({
          method: 'GET',
          path: 'get_500',
        })
        .then(res => {
          fail('Expecting error');
        })
        .catch(error => {
          expect(error.statusCode).toBe(500);
          done();
        });
    });

    it('fails on 503 error', done => {
      instance
        .request({
          method: 'GET',
          path: 'get_503',
        })
        .then(res => {
          fail('Expecting error');
        })
        .catch(error => {
          expect(error.statusCode).toBe(503);
          done();
        });
    });
  });

  describe('with a token provider', () => {
    it('fails on 400 error', done => {
      instanceWithTokenProvider
        .request({
          method: 'GET',
          path: 'get_400',
        })
        .then(res => {
          fail('Expecting error');
        })
        .catch(error => {
          expect(error.statusCode).toBe(400);
          done();
        });
    });

    it('fails on 403 error', done => {
      instanceWithTokenProvider
        .request({
          method: 'GET',
          path: 'get_403',
        })
        .then(res => {
          fail('Expecting error');
        })
        .catch(error => {
          expect(error.statusCode).toBe(403);
          done();
        });
    });

    it('fails on 404 error', done => {
      instanceWithTokenProvider
        .request({
          method: 'GET',
          path: 'get_404',
        })
        .then(res => {
          fail('Expecting error');
        })
        .catch(error => {
          expect(error.statusCode).toBe(404);
          done();
        });
    });

    it('fails on 500 error', done => {
      instanceWithTokenProvider
        .request({
          method: 'GET',
          path: 'get_500',
        })
        .then(res => {
          fail('Expecting error');
        })
        .catch(error => {
          expect(error.statusCode).toBe(500);
          done();
        });
    });

    it('fails on 503 error', done => {
      instanceWithTokenProvider
        .request({
          method: 'GET',
          path: 'get_503',
        })
        .then(res => {
          fail('Expecting error');
        })
        .catch(error => {
          expect(error.statusCode).toBe(503);
          done();
        });
    });
  });
});
