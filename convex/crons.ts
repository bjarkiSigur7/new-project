import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Nightly seat sync from Microsoft Graph, then invoices 30 minutes later so
// the morning dashboard compares same-night data on both sides.
crons.daily(
  "sync all tenants",
  { hourUTC: 3, minuteUTC: 0 },
  internal.sync.syncAllTenants,
  {}
);

crons.daily(
  "sync accounting connections",
  { hourUTC: 3, minuteUTC: 30 },
  internal.qbo.syncAllConnections,
  {}
);

// Digest check runs daily; each workspace only matches 3 days before its
// billing day, and the email log guarantees at most one send per month.
crons.daily(
  "pre-billing digests",
  { hourUTC: 9, minuteUTC: 0 },
  internal.digest.sendDigests,
  {}
);

export default crons;
