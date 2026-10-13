import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { authFetch, SESSION_EXPIRED_EVENT } from "./authFetch.js";

// authFetch uses the browser's fetch, localStorage and window, so give it small stand-ins
const realFetch = globalThis.fetch;
let token;
let calls;
let status;
let expiredEvents;

function setGlobal(name, value) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

beforeEach(() => {
  token = null;
  calls = [];
  status = 200;
  expiredEvents = 0;
  const fakeWindow = new EventTarget();
  fakeWindow.addEventListener(SESSION_EXPIRED_EVENT, () => { expiredEvents += 1; });
  setGlobal("window", fakeWindow);
  setGlobal("localStorage", { getItem: (key) => (key === "access_token" ? token : null) });
  setGlobal("fetch", async (url, options) => { calls.push({ url, options }); return { status }; });
});

afterEach(() => {
  delete globalThis.window;
  delete globalThis.localStorage;
  setGlobal("fetch", realFetch);
});

describe("authFetch", () => {
  it("sends the stored token and keeps the caller's options", async () => {
    token = "abc.def.ghi";
    await authFetch("/api/books/1/", { method: "PUT", body: "data", headers: { "X-Test": "1" } });

    const { url, options } = calls[0];
    assert.equal(url, "/api/books/1/");
    assert.equal(options.method, "PUT");
    assert.equal(options.body, "data");
    assert.deepEqual(options.headers, { "X-Test": "1", Authorization: "Bearer abc.def.ghi" });
  });

  it("sends no Authorization header when nobody is signed in", async () => {
    await authFetch("/api/books/create/", { method: "POST" });
    assert.deepEqual(calls[0].options.headers, {});
  });

  it("announces an expired session when a stored token gets a 401", async () => {
    token = "expired";
    status = 401;
    const res = await authFetch("/api/books/1/", { method: "DELETE" });

    assert.equal(res.status, 401);
    assert.equal(expiredEvents, 1);
  });

  it("does not announce anything for a 401 without a token", async () => {
    status = 401;
    await authFetch("/api/auth/me/");
    assert.equal(expiredEvents, 0);
  });

  it("does not treat other errors as an expired session", async () => {
    token = "valid";
    for (status of [400, 403, 404, 500]) await authFetch("/api/books/1/", { method: "PUT" });
    assert.equal(expiredEvents, 0);
  });
});
