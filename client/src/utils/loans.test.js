import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { borrowBook, dueLabel, dueTone, fetchLoans, loanProgress, returnLoan } from "./loans.js";

describe("dueLabel", () => {
  const now = new Date(2026, 9, 14, 15, 0); // 14 Oct, 3 pm local time
  const at = (day, hour = 9) => new Date(2026, 9, day, hour, 0).toISOString();

  it("counts days ahead in calendar days", () => {
    assert.equal(dueLabel(at(14, 20), now), "Due today");
    assert.equal(dueLabel(at(15, 1), now), "Due tomorrow"); // only 10 hours away, but tomorrow
    assert.equal(dueLabel(at(28), now), "Due in 14 days");
  });

  it("says how late a book is", () => {
    assert.equal(dueLabel(at(14, 9), now), "Overdue today");
    assert.equal(dueLabel(at(13, 23), now), "1 day overdue");
    assert.equal(dueLabel(at(10), now), "4 days overdue");
  });
});

describe("dueTone", () => {
  const now = new Date(2026, 9, 14, 15, 0);
  const at = (day, hour = 9) => new Date(2026, 9, day, hour, 0).toISOString();

  it("is overdue once the due time has passed, even on the same day", () => {
    assert.equal(dueTone(at(14, 9), now), "overdue");
    assert.equal(dueTone(at(1), now), "overdue");
  });

  it("is soon within two calendar days, and ok after that", () => {
    assert.equal(dueTone(at(14, 20), now), "soon");
    assert.equal(dueTone(at(16, 23), now), "soon");
    assert.equal(dueTone(at(17, 1), now), "ok");
  });
});

describe("loanProgress", () => {
  const borrowed = new Date(2026, 9, 1).toISOString();
  const due = new Date(2026, 9, 15).toISOString();

  it("runs from 0 when borrowed to 1 when due", () => {
    assert.equal(loanProgress(borrowed, due, new Date(2026, 9, 1)), 0);
    assert.equal(loanProgress(borrowed, due, new Date(2026, 9, 8)), 0.5);
    assert.equal(loanProgress(borrowed, due, new Date(2026, 9, 15)), 1);
  });

  it("stays within 0 and 1", () => {
    assert.equal(loanProgress(borrowed, due, new Date(2026, 8, 1)), 0);
    assert.equal(loanProgress(borrowed, due, new Date(2026, 10, 1)), 1);
    assert.equal(loanProgress(due, borrowed, new Date(2026, 9, 8)), 1);
  });
});

// The API helpers use the browser's fetch, localStorage and window; give them stand-ins
const realFetch = globalThis.fetch;
let calls;
let reply;

function setGlobal(name, value) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

describe("loan requests", () => {
  beforeEach(() => {
    calls = [];
    setGlobal("window", new EventTarget());
    setGlobal("localStorage", { getItem: () => "tok" });
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

  it("borrows and returns with POSTs carrying the token", async () => {
    reply = new Response(JSON.stringify({ id: 7 }), { status: 201 });
    assert.deepEqual(await borrowBook("http://api.test/api", 3), { id: 7 });
    reply = new Response(JSON.stringify({ id: 7, returned_at: "x" }));
    await returnLoan("http://api.test/api", 7);

    assert.deepEqual(calls.map((c) => [c.url, c.options.method]), [
      ["http://api.test/api/books/3/borrow/", "POST"],
      ["http://api.test/api/loans/7/return/", "POST"],
    ]);
    assert.equal(calls[0].options.headers.Authorization, "Bearer tok");
  });

  it("passes on the API's reason when a rule says no", async () => {
    reply = new Response(JSON.stringify({ detail: "All copies of this book are on loan." }), { status: 409 });
    await assert.rejects(borrowBook("http://api.test/api", 3), { message: "All copies of this book are on loan." });
  });

  it("asks for the right page of loans", async () => {
    reply = new Response(JSON.stringify({ results: [] }));
    await fetchLoans("http://api.test/api");
    reply = new Response(JSON.stringify({ results: [] }));
    await fetchLoans("http://api.test/api", { scope: "all", status: "overdue", page: 2 });
    reply = new Response(JSON.stringify({ results: [] }));
    await fetchLoans("http://api.test/api", { scope: "all", status: "overdue", pageSize: 1 });

    assert.deepEqual(calls.map((c) => c.url), [
      "http://api.test/api/loans/?scope=mine&status=active",
      "http://api.test/api/loans/?scope=all&status=overdue&page=2",
      "http://api.test/api/loans/?scope=all&status=overdue&page_size=1",
    ]);
  });

  it("explains a network failure", async () => {
    reply = new Error("offline");
    await assert.rejects(fetchLoans("http://api.test/api"), { message: /reach the server/ });
  });
});
