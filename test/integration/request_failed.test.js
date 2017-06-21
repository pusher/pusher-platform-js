const {default: PusherPlatform } = require('../../target/pusher-platform.js');

//these just test GET - everything else should just work.
describe('App requests - failing', () => {

    let app;

    beforeAll(() => {
        app = new PusherPlatform.App({
            serviceId: "1",
            cluster: "localhost:10443"
        });
    })

    it('fails on 400 error', (done) => {
        app.request({
            method: "GET",
            path: "services/platform_lib_tester/v1/get_400"
        }).then((res) => {
            fail('Expecting error');
        }).catch(error => {
            expect(error.statusCode).toBe(400);
            done();
        });
    });

    it('fails on 403 error', (done) => {
        app.request({
            method: "GET",
            path: "services/platform_lib_tester/v1/get_403"
        }).then((res) => {
            fail('Expecting error');
        }).catch(error => {
            expect(error.statusCode).toBe(403);
            done();
        });
    });

    it('fails on 404 error', (done) => {
        app.request({
            method: "GET",
            path: "services/platform_lib_tester/v1/get_404"
        }).then((res) => {
            fail('Expecting error');
        }).catch(error => {
            expect(error.statusCode).toBe(404);
            done();
        });
    });

    it('fails on 500 error', (done) => {
        app.request({
            method: "GET",
            path: "services/platform_lib_tester/v1/get_500"
        }).then((res) => {
            fail('Expecting error');
        }).catch(error => {
            expect(error.statusCode).toBe(500);
            done();
        });
    });

    it('fails on 503 error', (done) => {
        app.request({
            method: "GET",
            path: "services/platform_lib_tester/v1/get_503"
        }).then((res) => {
            fail('Expecting error');
        }).catch(error => {
            expect(error.statusCode).toBe(503);
            done();
        });
    });
});