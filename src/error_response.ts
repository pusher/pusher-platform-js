import {Headers} from "./types";

function responseHeadersObj(headerStr : string) : Headers {
  var headers : Headers = {};
  if (!headerStr) {
    return headers;
  }

  var headerPairs = headerStr.split('\u000d\u000a');
  for (var i = 0; i < headerPairs.length; i++) {
    var headerPair = headerPairs[i];
    var index = headerPair.indexOf('\u003a\u0020');
    if (index > 0) {
      var key = headerPair.substring(0, index);
      var val = headerPair.substring(index + 2);
      headers[key] = val;
    }
  }

  return headers;
}

export default class ErrorResponse {
  public statusCode: number;
  public headers: Headers;
  public info: any;

  constructor(xhr : XMLHttpRequest) {
    this.statusCode = xhr.status;
    this.headers = responseHeadersObj(xhr.getAllResponseHeaders());
    this.info = xhr.responseText;
  }
}
