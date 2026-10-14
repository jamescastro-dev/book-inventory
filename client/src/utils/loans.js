import { authFetch } from "./authFetch.js";
import { readApiError } from "./uploads.js";

async function send(url, options, fallback) {
  let res;
  try {
    res = await authFetch(url, options);
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }
  if (!res.ok) throw new Error(await readApiError(res, fallback));
  return res.json();
}

// Borrow one copy for the signed-in user. Resolves to the new loan; rejects with a readable Error
// (e.g. "All copies of this book are on loan.").
export function borrowBook(apiUrl, bookId) {
  return send(`${apiUrl}/books/${bookId}/borrow/`, { method: "POST" }, "Couldn't borrow the book. Please try again.");
}

export function returnLoan(apiUrl, loanId) {
  return send(`${apiUrl}/loans/${loanId}/return/`, { method: "POST" }, "Couldn't return the book. Please try again.");
}

// One page of loans: { count, page, total_pages, results }. scope "mine" or "all" (librarians);
// status "active", "overdue", "returned" or "all". A small pageSize is handy when only `count` matters.
export function fetchLoans(apiUrl, { scope = "mine", status = "active", page = 1, pageSize } = {}) {
  const params = new URLSearchParams({ scope, status });
  if (page > 1) params.set("page", String(page));
  if (pageSize) params.set("page_size", String(pageSize));
  return send(`${apiUrl}/loans/?${params}`, {}, "Couldn't load the loans. Please try again.");
}

const DAY = 24 * 60 * 60 * 1000;

// "Due today", "Due tomorrow", "Due in 5 days", "1 day overdue", "3 days overdue". Counts calendar
// days in the viewer's time zone, so a book due at 9 am tomorrow is "due tomorrow" all day today.
export function dueLabel(dueAt, now = new Date()) {
  const due = new Date(dueAt);
  if (due < now && !sameDay(due, now)) {
    const days = calendarDaysBetween(due, now);
    return `${days} ${days === 1 ? "day" : "days"} overdue`;
  }
  if (due < now) return "Overdue today";
  const days = calendarDaysBetween(now, due);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

// How urgent a loan is: "overdue", "soon" (due within 2 calendar days) or "ok"
export function dueTone(dueAt, now = new Date()) {
  const due = new Date(dueAt);
  if (due < now) return "overdue";
  return calendarDaysBetween(now, due) <= 2 ? "soon" : "ok";
}

// How far through its loan period a loan is, from 0 (just borrowed) to 1 (due now or later)
export function loanProgress(borrowedAt, dueAt, now = new Date()) {
  const start = new Date(borrowedAt).getTime();
  const end = new Date(dueAt).getTime();
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
}

function sameDay(a, b) {
  return calendarDaysBetween(a, b) === 0;
}

function calendarDaysBetween(earlier, later) {
  const start = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  const end = new Date(later.getFullYear(), later.getMonth(), later.getDate());
  return Math.round((end - start) / DAY);
}

// "28 Oct" style date for "due back on …" messages
export function shortDate(value) {
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
