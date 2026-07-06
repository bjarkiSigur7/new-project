// Demo fixtures pin timestamps to UTC midnight. Format them in UTC so the
// server render and every visitor's browser agree on the date (no hydration
// mismatch, no off-by-one-day dates in negative-offset timezones).
export function utcDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
