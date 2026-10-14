import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { availability } from "./availability.js";

describe("availability", () => {
  const now = new Date(2026, 9, 14, 15, 0);
  const book = (available_copies, copies) => ({ available_copies, copies });

  it("counts the copies on the shelf", () => {
    assert.deepEqual(availability(book(2, 3), undefined, now), { tone: "success", label: "Available", detail: "2 of 3 on the shelf" });
  });

  it("says when every copy is out", () => {
    assert.deepEqual(availability(book(0, 1), undefined, now), { tone: "muted", label: "Checked out", detail: "The only copy is on loan" });
    assert.equal(availability(book(0, 2), undefined, now).detail, "All 2 copies are on loan");
  });

  it("puts the viewer's own loan first, with when it is due", () => {
    const loan = { is_overdue: false, due_at: new Date(2026, 9, 20, 9).toISOString() };
    assert.deepEqual(availability(book(0, 1), loan, now), { tone: "accent", label: "Borrowed by you", detail: "Due in 6 days" });
  });

  it("flags the viewer's overdue loan", () => {
    const loan = { is_overdue: true, due_at: new Date(2026, 9, 12, 9).toISOString() };
    assert.deepEqual(availability(book(1, 2), loan, now), { tone: "danger", label: "Overdue", detail: "2 days overdue" });
  });
});
