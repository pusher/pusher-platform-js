const { default: PusherPlatform} = require('../../target/pusher-platform.js');

describe('Instance Requests - Successful', () => {

    let instance;

    beforeAll(() => {
        instance = new PusherPlatform.Instance({
            instance: "v1:api-ceres:1",
            serviceName: "platform_lib_tester",
            serviceVersion: "v1",
            host: "localhost:10443"
        });
    })

    it('makes a successful GET request', (done) => {
        instance.request({
            method: "GET",
            path: "get_ok"
        }).then((res) => {
            done();
        });
    });

   it('makes a successful POST request', (done) => {
        instance.request({
            method: "POST",
            path: "post_ok"
        }).then((res) => {
            done();
        });
    });


    it('makes a successful POST request with body', (done) => {
        instance.request({
            method: "post",
            path: "post_ok",
            body: {
                test: "123"
            }
        }).then( res => {
            expect(JSON.parse(res).test).toEqual("123");
            done();
        });
    });


    it('makes a successful PUT request', (done) => {
        instance.request({
            method: "PUT",
            path: "put_ok"
        }).then((res) => {
            done();
        });
    });

    it('makes a successful DELETE request', (done) => {
        instance.request({
            method: "DELETE",
            path: "delete_ok"
        }).then((res) => {
            done();
        });
        
    });

});