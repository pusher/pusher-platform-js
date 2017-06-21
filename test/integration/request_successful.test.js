const { default: PusherPlatform} = require('../../target/pusher-platform.js');

describe('App Requests - Successful', () => {

    let app;

    beforeAll(() => {
        app = new PusherPlatform.App({
            serviceId: "1",
            cluster: "localhost:10443"
        });
    })

    it('makes a successful GET request', (done) => {
        app.request({
            method: "GET",
            path: "services/platform_lib_tester/v1/get_ok"
        }).then((res) => {
            done();
        });
    });

   it('makes a successful POST request', (done) => {
        app.request({
            method: "POST",
            path: "services/platform_lib_tester/v1/post_ok"
        }).then((res) => {
            done();
        });
    });


    it('makes a successful POST request with body', (done) => {
        app.request({
            method: "post",
            path: "services/platform_lib_tester/v1/post_ok",
            body: {
                test: "123"
            }
        }).then( res => {
            expect(JSON.parse(res).test).toEqual("123");
            done();
        });
    });


    it('makes a successful PUT request', (done) => {
        app.request({
            method: "PUT",
            path: "services/platform_lib_tester/v1/put_ok"
        }).then((res) => {
            done();
        });
    });

    it('makes a successful DELETE request', (done) => {
        app.request({
            method: "DELETE",
            path: "services/platform_lib_tester/v1/delete_ok"
        }).then((res) => {
            done();
        });
        
    });

});