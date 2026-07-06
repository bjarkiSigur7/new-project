// Shared formatting helpers — keep money/date rendering identical everywhere.

export function money(n: number, opts?: { cents?: boolean }): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts?.cents === false ? 0 : 2,
    maximumFractionDigits: opts?.cents === false ? 0 : 2,
  });
}

export function moneyPerMonth(n: number): string {
  return `${money(n)}/mo`;
}

export function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return shortDate(ts);
}

export function daysUntilLabel(daysLeft: number | null): string {
  if (daysLeft === null) return "—";
  if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
  if (daysLeft === 0) return "today";
  return `in ${daysLeft}d`;
}
