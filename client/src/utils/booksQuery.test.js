import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildBooksQuery, SORT_OPTIONS } from "./booksQuery.js";

describe("buildBooksQuery", () => {
  it("leaves out everything that is at its default", () => {
    assert.equal(buildBooksQuery(), "");
    assert.equal(buildBooksQuery({ search: "", genre: "", sort: "", page: 1 }), "");
  });

  it("includes only what was chosen", () => {
    assert.equal(buildBooksQuery({ genre: "Fantasy" }), "genre=Fantasy");
    assert.equal(buildBooksQuery({ sort: "-title", page: 3 }), "ordering=-title&page=3");
  });

  it("asks for books on the shelf only when that box is ticked", () => {
    assert.equal(buildBooksQuery({ availableOnly: true }), "available=true");
    assert.equal(buildBooksQuery({ availableOnly: false }), "");
  });

  it("trims the search and ignores a blank one", () => {
    assert.equal(buildBooksQuery({ search: "  the hobbit " }), "search=the+hobbit");
    assert.equal(buildBooksQuery({ search: "   " }), "");
  });

  it("encodes characters that would break the URL", () => {
    assert.equal(buildBooksQuery({ search: "R&D #1", genre: "Sci-Fi/Fantasy" }), "search=R%26D+%231&genre=Sci-Fi%2FFantasy");
  });
});

describe("SORT_OPTIONS", () => {
  it("only offers orderings the API accepts", () => {
    // The API's allowed fields live in server/book_inventory/api/views.py (ordering_fields)
    const views = readFileSync(new URL("../../../server/book_inventory/api/views.py", import.meta.url), "utf8");
    const listed = views.match(/ordering_fields\s*=\s*\[([^\]]*)\]/)[1].match(/"([^"]+)"/g).map((s) => s.slice(1, -1));
    assert.ok(listed.length > 0, "could not read ordering_fields from views.py");

    for (const { value } of SORT_OPTIONS.filter((o) => o.value)) {
      assert.ok(listed.includes(value.replace(/^-/, "")), `${value} is not an ordering the API accepts`);
    }
  });

  it("starts with the API's own order, which is the default", () => {
    assert.equal(SORT_OPTIONS[0].value, "");
  });
});
