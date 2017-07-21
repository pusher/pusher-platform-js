const {default: PusherPlatform } = require('../../target/pusher-platform.js');

//these just test GET - everything else should just work.
describe('Instance requests - failing', () => {

    let instance;

    beforeAll(() => {
        instance = new PusherPlatform.Instance({
            instanceId: "v1:api-ceres:1",
            serviceName: "platform_lib_tester",
            serviceVersion: "v1",
            host: "localhost:10443"
        });
    })

    it('fails on 400 error', (done) => {
        instance.request({
            method: "GET",
            path: "get_400"
        }).then((res) => {
            fail('Expecting error');
        }).catch(error => {
            expect(error.statusCode).toBe(400);
            done();
        });
    });

    it('fails on 403 error', (done) => {
        instance.request({
            method: "GET",
            path: "get_403"
        }).then((res) => {
            fail('Expecting error');
        }).catch(error => {
            expect(error.statusCode).toBe(403);
            done();
        });
    });

    it('fails on 404 error', (done) => {
        instance.request({
            method: "GET",
            path: "get_404"
        }).then((res) => {
            fail('Expecting error');
        }).catch(error => {
            expect(error.statusCode).toBe(404);
            done();
        });
    });

    it('fails on 500 error', (done) => {
        instance.request({
            method: "GET",
            path: "get_500"
        }).then((res) => {
            fail('Expecting error');
        }).catch(error => {
            expect(error.statusCode).toBe(500);
            done();
        });
    });

    it('fails on 503 error', (done) => {
        instance.request({
            method: "GET",
            path: "get_503"
        }).then((res) => {
            fail('Expecting error');
        }).catch(error => {
            expect(error.statusCode).toBe(503);
            done();
        });
    });
});