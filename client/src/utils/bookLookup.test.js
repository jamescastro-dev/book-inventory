import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { fetchCoverFile, isbnFromText, lookupIsbn } from "./bookLookup.js";
import { MAX_COVER_BYTES } from "./uploads.js";

// The helpers use the browser's fetch, localStorage and window, so give them small stand-ins
const realFetch = globalThis.fetch;
let calls;
let reply; // what the stand-in fetch answers with: a Response, or an Error to throw

function setGlobal(name, value) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

beforeEach(() => {
  calls = [];
  reply = new Response("{}");
  setGlobal("window", new EventTarget());
  setGlobal("localStorage", { getItem: () => "my-token" });
  setGlobal("fetch", async (url, options) => {
    calls.push({ url, options });
    if (reply instanceof Error) throw reply;
    return reply;
  });
});

afterEach(() => {
  delete globalThis.window;
  delete globalThis.localStorage;
  setGlobal("fetch", realFetch);
});

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const image = (bytes, type = "image/jpeg") => new Response(new Blob([new Uint8Array(bytes)], { type }));

describe("lookupIsbn", () => {
  it("asks the API with the signed-in token and returns the book", async () => {
    const book = { isbn: "9780547928227", title: "The Hobbit" };
    reply = json(book);

    assert.deepEqual(await lookupIsbn("http://api.test/api", "9780547928227"), book);
    assert.equal(calls[0].url, "http://api.test/api/books/lookup/?isbn=9780547928227");
    assert.equal(calls[0].options.headers.Authorization, "Bearer my-token");
  });

  it("encodes what was typed", async () => {
    reply = json({});
    await lookupIsbn("http://api.test/api", "978 0&x");
    assert.equal(calls[0].url, "http://api.test/api/books/lookup/?isbn=978+0%26x");
  });

  it("rejects with the API's own message", async () => {
    for (const [status, detail] of [
      [400, "Enter a valid 10 or 13 digit ISBN."],
      [404, "No book found for that ISBN."],
      [502, "Book lookup is unavailable right now."],
    ]) {
      reply = json({ detail }, status);
      await assert.rejects(lookupIsbn("http://api.test/api", "1"), { message: detail });
    }
  });

  it("rejects with a plain message when the server can't be reached or answers with a page", async () => {
    reply = new Error("network down");
    await assert.rejects(lookupIsbn("http://api.test/api", "1"), { message: /reach the server/ });

    reply = new Response("<html>Bad gateway</html>", { status: 504 });
    await assert.rejects(lookupIsbn("http://api.test/api", "1"), { message: "The lookup failed. Please try again." });
  });
});

describe("fetchCoverFile", () => {
  it("returns the cover as a File named after the ISBN", async () => {
    reply = image(2048);
    const file = await fetchCoverFile("https://covers.test/a.jpg", "9780547928227");

    assert.ok(file instanceof File);
    assert.equal(file.name, "cover-9780547928227.jpg");
    assert.equal(file.type, "image/jpeg");
    assert.equal(file.size, 2048);
    assert.equal(calls[0].url, "https://covers.test/a.jpg");
  });

  it("keeps a PNG a PNG", async () => {
    reply = image(10, "image/png");
    assert.equal((await fetchCoverFile("https://covers.test/a.png", "1")).name, "cover-1.png");
  });

  it("gives up quietly when the cover can't be used", async () => {
    reply = image(10, "text/html");
    assert.equal(await fetchCoverFile("https://covers.test/a", "1"), null, "not an image");

    reply = image(MAX_COVER_BYTES + 1);
    assert.equal(await fetchCoverFile("https://covers.test/a", "1"), null, "over the size limit");

    reply = new Response("", { status: 404 });
    assert.equal(await fetchCoverFile("https://covers.test/a", "1"), null, "not found");

    reply = new Error("blocked by CORS");
    assert.equal(await fetchCoverFile("https://covers.test/a", "1"), null, "network error");
  });

  it("accepts a cover of exactly the size limit", async () => {
    reply = image(MAX_COVER_BYTES);
    assert.equal((await fetchCoverFile("https://covers.test/a", "1")).size, MAX_COVER_BYTES);
  });
});

describe("isbnFromText", () => {
  it("accepts ISBN-13 and ISBN-10 with hyphens, spaces or an ISBN label", () => {
    assert.equal(isbnFromText("978-0-547-92822-7"), "9780547928227");
    assert.equal(isbnFromText(" 978 0547 928227 "), "9780547928227");
    assert.equal(isbnFromText("054792822x"), "054792822X");
    assert.equal(isbnFromText("ISBN-13: 9780547928227"), "9780547928227");
  });

  it("rejects a wrong check digit, other numbers and other text", () => {
    assert.equal(isbnFromText("9780547928228"), null);
    assert.equal(isbnFromText("0547928221"), null);
    assert.equal(isbnFromText("9790547928227"), null); // 979 needs its own valid check digit
    assert.equal(isbnFromText("12345"), null);
    assert.equal(isbnFromText("The Hobbit"), null);
    assert.equal(isbnFromText(undefined), null);
  });
});
