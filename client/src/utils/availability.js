import { dueLabel } from "./loans.js";

// What to show about a book's availability: a short `label` for a badge, a longer `detail`, and a
// `tone` that picks the badge colour (success, accent, danger or muted). `myLoan` is the viewer's
// active loan of this book, if they have one.
export function availability(book, myLoan, now = new Date()) {
  if (myLoan) {
    return myLoan.is_overdue
      ? { tone: "danger", label: "Overdue", detail: dueLabel(myLoan.due_at, now) }
      : { tone: "accent", label: "Borrowed by you", detail: dueLabel(myLoan.due_at, now) };
  }
  if (book.available_copies > 0) {
    return { tone: "success", label: "Available", detail: `${book.available_copies} of ${book.copies} on the shelf` };
  }
  return {
    tone: "muted",
    label: "Checked out",
    detail: book.copies === 1 ? "The only copy is on loan" : `All ${book.copies} copies are on loan`,
  };
}
