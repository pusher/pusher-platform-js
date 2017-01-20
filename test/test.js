const PusherPlatform = require("../target/pusher-platform.js");

function assertEquals(a, b, e) {
  if (a !== b) {
    throw Error(a + " !== " + b + " (" + e + ")");
  }
};

function assertNotEquals(a, b, e) {
  if (a === b) {
    throw Error(a + " === " + b + " (" + e + ")");
  }
};

function randomInt(upperBound) {
  return Math.floor(Math.random() * upperBound);
}

function runTest(responseText, expectedEvents, expectedError) {
  var createdXMLHttpRequest = null;
  var opened = false;
  var sent = false;
  var aborted = false;

  var MockXMLHttpRequest = function(){
    this.headers = {};

    assertEquals(createdXMLHttpRequest, null, "should only create XMLHttpRequest once");
    createdXMLHttpRequest = this;

    this.readyState = 0;
    if (this.onreadystatechange) { this.onreadystatechange(); }
  };
  MockXMLHttpRequest.prototype.open = function(method, url, asyncOpt) {
    assertEquals(opened, false);
    opened = true;

    assertEquals(method, "SUBSCRIBE", "should open SUBSCRIBE request");
    assertEquals(url, "https://somecluster:12345/apps/3/example/sub");
    assertEquals(asyncOpt, true, "synchronous requests are bad mkay");

    this.readyState = 1;
    if (this.onreadystatechange) { this.onreadystatechange(); }
  };
  MockXMLHttpRequest.prototype.setRequestHeader = function(headerKey, headerVal) {
    this.headers[headerKey] = headerVal;
  };

  MockXMLHttpRequest.prototype.send = function () {
    assertEquals(opened, true, "should only call req.send() once");

    assertEquals(sent, false);
    sent = true;

    assertNotEquals(this.onreadystatechange, null, "Library should set an onreadystatechange handler");

    this.readyState = 2;
    this.status = 200;
    this.onreadystatechange();

    // Now fire off mock responses
    // TODO randomize this better
    // TODO make this async ..? i.e. do each call in a nextTick/requestAnimationFrame
    for (var i = 0; i < responseText.length; i += randomInt(50)) {
      this.readyState = 3;
      this.responseText = responseText.slice(0, i);
      this.onreadystatechange();
    }

    this.readyState = 4;
    this.responseText = responseText;
    this.onreadystatechange();
  };
  MockXMLHttpRequest.prototype.abort = function () {
    aborted = true;
  };

  var baseClient = new PusherPlatform.BaseClient({
    cluster: "somecluster:12345",
    encrypted: true,
    XMLHttpRequest: MockXMLHttpRequest
  });

  var app = new PusherPlatform.App({
    encrypted: true,
    cluster: "somecluster:12345",
    appId: "3",
    client: baseClient
  });

  var events = [];

  var calledOnOpen = false;
  var calledOnEvent = false;
  var calledOnEnd = false;
  var calledOnError = false;

  var subscription = app.subscribe({
    path: "example/sub",
    jwt: "foo",
    onOpen: function() {
      // Called after we've created the XHR, called open(), called send(), received headers, and got back a 200 response

      assertEquals(calledOnEnd, false, "should not call end before open");
      assertEquals(calledOnEvent, false, "should not call event before open");
      assertEquals(calledOnError, false, "should not call error before open");
      calledOnOpen = true;

      const expectedHeaders = {
        // "content-type": "application/json",  // there's no request body, so no content-type
        "authorization": "JWT foo"
      };

      assertEquals(JSON.stringify(createdXMLHttpRequest.headers), JSON.stringify(expectedHeaders), "should send json request with auth token");

    },
    onEvent: function(ev) {
      assertEquals(calledOnOpen, true, "should call open before event");
      assertEquals(calledOnEnd, false, "should not call event after end");
      assertEquals(calledOnError, false, "should not call event after error");
      calledOnEvent = true;

      events.push(ev);
    },
    onEnd: function() {
      assertEquals(calledOnOpen, true, "should call open before end");
      assertEquals(calledOnEnd, false, "should not call end twice");
      assertEquals(calledOnError, false, "should not call end after error");
      calledOnEnd = true;

      assertEquals(aborted, false, "Library should not have aborted the XHR");

      assertEquals(JSON.stringify(events), JSON.stringify(expectedEvents), "should have received these events");

      if (expectedError) {
        assertEquals(true, false, "Expected onError but got onEnd"); // FIXME
      }
    },
    onError: function(err) {
      // console.log("onError", err);

      assertEquals(calledOnEnd, false, "should not call error after end");
      assertEquals(calledOnError, false, "should not call error twice");
      calledOnError = true;

      assertEquals(aborted, false, "Library should not have aborted the XHR");

      assertEquals(JSON.stringify(events), JSON.stringify(expectedEvents), "should have received these events");

      if (expectedError) {
        assertEquals(err.message, expectedError.message, "Expected onError to be called with this");
      }
    }
  });
}

/////////////////////////////// UNIT TESTS /////////////////////////////////////

// Happy path tests :-)

// simplest success case
runTest(
  `[255, 1234, {}, "eos"]\n`,
  [],
  null
);

// single event
runTest(
  `[1, "id", {}, "body"]\n[255, 1234, {}, "eos"]\n`,
  [{ eventId: 'id', headers: {}, body: 'body' }],
  null
);

// event headers
runTest(
  `[1, "id", {"header1": "val1", "header2": "val2"}, "body"]\n[255, 1234, {}, "eos"]\n`,
  [{ eventId: 'id', headers: {"header1": "val1", "header2": "val2"}, body: 'body' }],
  null
);

// multiple events
runTest(
  `[1, "id1", {"header1": "val1", "header2": "val2"}, "body1"]\n[1, "id2", {}, "body2"]\n[255, 1234, {}, "eos"]\n`,
  [{ eventId: 'id1', headers: {"header1": "val1", "header2": "val2"}, body: 'body1' }, { eventId: 'id2', headers: {}, body: 'body2' }],
  null
);

// heartbeats
runTest(
  `[0,"64wt4ayu6wya4ta23yw4yt3423r3432Q4635W4764564AWREYS54ATWTWhyjdtjhserg4ts54ytwesytr"]\n[0,""]\n[1, "id", {"header1": "val1", "header2": "val2"}, "body"]\n[0,"y645w3tq43"]\n[255, 1234, {}, "eos"]\n`,
  [{ eventId: 'id', headers: {"header1": "val1", "header2": "val2"}, body: 'body' }],
  null
);

// Sad path tests :-(

// empty body
runTest(
  ``,
  [],
  new Error("HTTP response ended without receiving EOS message")
);

// cut off in initial message!
runTest(
  `[1, "id", {"header1": "val1", "header2": "val`,
  [],
  new Error("HTTP response ended without receiving EOS message")
);

// cut off in second message!
runTest(
  `[1, "id1", {}, "body"]\n[1, "id2", {"header1": "val1", "header2": "val`,
  [{eventId: "id1", headers: {}, body: "body"}],
  new Error("HTTP response ended without receiving EOS message")
);

// malformed event - missing body
runTest(
  `[1, "id1", {}]\n`,
  [],
  new Error("Event message has 3 elements (expected 4)")
);


///////////////////////// RANDOM PROPERTY TESTS ////////////////////////////////

function randomChar() {
  // FIXME return a greater range of characters - test encoding/Unicode support
  return String.fromCharCode("a".charCodeAt(0) + randomInt("z".charCodeAt(0) - "a".charCodeAt(0)));
}

function randomString() {
  var str = "";
  var strLen = randomInt(100);
  for (var i = 0; i < strLen; i++) {
    str += randomChar();
  }
  return str;
}

function randomHeaders() {
  var headers = {};
  var numHeaders = randomInt(10);
  for (var i = 0; i < numHeaders; i++) {
    headers[randomString()] = randomString();
  }
  return headers;
}

function randomHeartbeatMsg() {
  return [0,randomString()];
}

function randomEvent() {
  // FIXME randomize number of headers
  // FIXME what are valid header values?
  // FIXME what are valid values for body?
  return { eventId: randomString(), headers: randomHeaders(), body: randomString() };
}

function eventToMsgFormat(ev) {
  return [1, ev.eventId, ev.headers, ev.body];
}

function randomEOSMsg() {
  // FIXME the error status codes are not just random numbers!
  return [255, randomInt(10000), randomHeaders(), randomString()];
}

function randomHappyResponse() {
  var numEvents = randomInt(100);
  var expectedEvents = [];
  var msgs = [];
  for (var i = 0; i < numEvents; i++) {
    var numHeartbeats = randomInt(10);
    for (var j = 0; j < numHeartbeats; j++) {
      msgs.push(randomHeartbeatMsg());
    }
    var ev = randomEvent();
    msgs.push(eventToMsgFormat(ev));
    expectedEvents.push(ev);
  }

  msgs.push(randomEOSMsg());

  return {
    responseText: msgs.map((msg) => { return JSON.stringify(msg) + "\n"; }).join(""),
    expectedEvents: expectedEvents
  };
}

// Happy path tests :-)

for (var i = 0; i < 100; i++) {
  var test = randomHappyResponse();
  // console.log("Testing with responseText", test.responseText);
  runTest(test.responseText, test.expectedEvents, null);
}

// Sad path tests :-(
// TODO
