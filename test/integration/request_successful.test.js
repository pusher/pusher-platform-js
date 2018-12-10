const {
  default: PusherPlatform,
} = require('../../dist/web/pusher-platform.js');

const { INSTANCE_HOST } = require('./config');

describe('Instance Requests - Successful', () => {
  let instance;

  beforeAll(() => {
    instance = new PusherPlatform.Instance({
      locator: 'v1:api-ceres:1',
      serviceName: 'platform_sdk_tester',
      serviceVersion: 'v1',
      host: INSTANCE_HOST,
    });
  });

  it('makes a successful GET request', done => {
    instance
      .request({
        method: 'GET',
        path: 'get_ok',
      })
      .then(res => {
        done();
      });
  });

  it('makes a successful POST request', done => {
    instance
      .request({
        method: 'POST',
        path: 'post_ok',
      })
      .then(res => {
        done();
      });
  });

  it('makes a successful POST request with JSON body', done => {
    instance
      .request({
        method: 'post',
        path: 'post_ok_echo',
        json: {
          test: '123',
        },
      })
      .then(res => {
        expect(JSON.parse(res).test).toEqual('123');
        done();
      });
  });

  it('makes a successful PUT request', done => {
    instance
      .request({
        method: 'PUT',
        path: 'put_ok',
      })
      .then(res => {
        done();
      });
  });

  it('makes a successful DELETE request', done => {
    instance
      .request({
        method: 'DELETE',
        path: 'delete_ok',
      })
      .then(res => {
        done();
      });
  });
});
