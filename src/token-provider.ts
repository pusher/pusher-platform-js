export interface TokenProvider {
    provideToken(): Promise<string>;
}

export class SimpleTokenProvider implements TokenProvider {
    constructor(public jwt: string) { }
    provideToken(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            resolve(this.jwt);
        });
    }
}

export function base64UrlDecode(encoded: string): string {
    return atob(encoded.replace(/\-/g, '+').replace(/_/g, '/'));
}

export class AuthServerTokenProvider implements TokenProvider {
    private accessToken: string = null;
    constructor(private authServerUrl: string, private credentials?: string) { }
    provideToken(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (this.accessToken != null && Date.now() < JSON.parse(base64UrlDecode(this.accessToken.split(".")[1]))["exp"] * 1000) {
                resolve(this.accessToken);
            } else {
                let xhr: XMLHttpRequest = new XMLHttpRequest();
                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4) {
                        if (200 <= xhr.status && xhr.status < 300) {
                            this.accessToken = JSON.parse(xhr.responseText)["access_token"];
                            resolve(this.accessToken);
                        } else {
                            reject(new Error("Unexpected status code in response from auth server: " + xhr.status));
                        }
                    }
                };
                xhr.open("POST", this.authServerUrl, true);
                xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                xhr.send(
                    "grant_type=client_credentials" +
                    (this.credentials ? "&credentials=" + encodeURIComponent(this.credentials) : "")
                );
            }
        });
    }
}