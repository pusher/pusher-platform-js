import jwt = require('jwt-simple');
import { Authorizer } from "./pusher-platform";

interface SecretAuthorizerOptions {
  appId: string;
  issuerKey: string;
  secretKey: string;
  userId: string;
}

function base64UrlEncode(decoded: string): string {
  return btoa(decoded).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(encoded: string): string {
  return atob(encoded.replace(/\-/g, '+').replace(/_/g, '/'));
}

export class SecretAuthorizer implements Authorizer {
  constructor(public options: SecretAuthorizerOptions) { }
  authorize() : Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let currentTimeUnixSecs = Math.floor(Date.now() / 1000);
      let payload = {
        "iat": currentTimeUnixSecs,
        "exp": currentTimeUnixSecs + (60 * 60 * 24),
        "iss": "keys/" + this.options.issuerKey,
        "app": this.options.appId,
        "sub": this.options.userId
      };
      resolve(jwt.encode(payload, this.options.secretKey));
    });
  }
}
