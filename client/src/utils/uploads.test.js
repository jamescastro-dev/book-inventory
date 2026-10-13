import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAX_COVER_BYTES, MAX_COVER_MB, readApiError } from "./uploads.js";

const json = (body, status = 400) => new Response(JSON.stringify(body), { status });

describe("readApiError", () => {
  it("names the field the API complained about", async () => {
    const res = json({ image: ["The file is too large (max 5 MB)."] });
    assert.equal(await readApiError(res, "fallback"), "Cover image: The file is too large (max 5 MB).");
  });

  it("joins several fields and several messages", async () => {
    const res = json({ title: ["This field is required."], release_year: ["A valid integer is required.", "Too old."] });
    assert.equal(
      await readApiError(res, "fallback"),
      "title: This field is required. | Release year: A valid integer is required. Too old.",
    );
  });

  it("shows plain messages without a field name", async () => {
    assert.equal(await readApiError(json({ detail: "Not found." }, 404), "fallback"), "Not found.");
    assert.equal(await readApiError(json({ non_field_errors: ["Nope."] }), "fallback"), "Nope.");
  });

  it("explains a 413 from a proxy that answers in HTML", async () => {
    const res = new Response("<html>Request Entity Too Large</html>", { status: 413 });
    assert.equal(await readApiError(res, "fallback"), `The upload is too large (max ${MAX_COVER_MB} MB).`);
  });

  it("falls back when there is nothing to show", async () => {
    assert.equal(await readApiError(new Response("<html>oops</html>", { status: 502 }), "fallback"), "fallback");
    assert.equal(await readApiError(json({}), "fallback"), "fallback");
  });
});

describe("cover size limit", () => {
  it("matches the server's limit", () => {
    // The server's copy lives in server/book_inventory/api/serializers.py
    const serializers = readFileSync(new URL("../../../server/book_inventory/api/serializers.py", import.meta.url), "utf8");
    const serverMb = Number(serializers.match(/^MAX_COVER_MB\s*=\s*(\d+)/m)?.[1]);

    assert.equal(MAX_COVER_MB, serverMb);
    assert.equal(MAX_COVER_BYTES, serverMb * 1024 * 1024);
  });
});
