const { default: PusherPlatform} = require('../../target/pusher-platform.js');

describe('Instance Requests - Successful', () => {

    let instance;

    beforeAll(() => {
        instance = new PusherPlatform.Instance({
            serviceId: "1",
            cluster: "localhost:10443"
        });
    })

    it('makes a successful GET request', (done) => {
        instance.request({
            method: "GET",
            path: "services/platform_lib_tester/v1/get_ok"
        }).then((res) => {
            done();
        });
    });

   it('makes a successful POST request', (done) => {
        instance.request({
            method: "POST",
            path: "services/platform_lib_tester/v1/post_ok"
        }).then((res) => {
            done();
        });
    });


    it('makes a successful POST request with body', (done) => {
        instance.request({
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
        instance.request({
            method: "PUT",
            path: "services/platform_lib_tester/v1/put_ok"
        }).then((res) => {
            done();
        });
    });

    it('makes a successful DELETE request', (done) => {
        instance.request({
            method: "DELETE",
            path: "services/platform_lib_tester/v1/delete_ok"
        }).then((res) => {
            done();
        });
        
    });

});