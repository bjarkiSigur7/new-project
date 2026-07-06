// Monthly pre-billing digest: "here's what changed since your last billing
// run" — sent a few days before the workspace's billing day so corrections
// land on the next invoice, not the one after.

import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { buildWorkspaceDiff } from "./lib/moneyScreen";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export const digestDataForWorkspace = internalQuery({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || !workspace.digestEnabled || !workspace.digestEmail) {
      return null;
    }
    const diff = await buildWorkspaceDiff(ctx, args.workspaceId);
    return {
      workspaceName: workspace.name,
      email: workspace.digestEmail,
      diff,
    };
  },
});

export const listDigestCandidates = internalQuery({
  args: {},
  handler: async (ctx) => {
    const workspaces = await ctx.db.query("workspaces").collect();
    const today = new Date().getUTCDate();
    return workspaces
      .filter((w) => {
        if (!w.digestEnabled || !w.digestEmail) return false;
        // Send 3 days before the billing day (default day 1 → the 28th, which
        // always exists); clamp into 1..28 to keep the arithmetic simple.
        const billingDay = Math.min(Math.max(w.billingDayOfMonth ?? 1, 1), 28);
        const sendDay = billingDay - 3 >= 1 ? billingDay - 3 : billingDay + 25;
        return today === sendDay;
      })
      .map((w) => ({ _id: w._id }));
  },
});

export const wasSent = internalQuery({
  args: { workspaceId: v.id("workspaces"), kind: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("emailLog")
      .withIndex("by_workspace_kind", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("kind", args.kind)
      )
      .first();
    return row !== null;
  },
});

export const logSent = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    kind: v.string(),
    to: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("emailLog", { ...args, sentAt: Date.now() });
    return null;
  },
});

export const sendDigests = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return null; // Email not configured — silently skip.

    const candidates = await ctx.runQuery(internal.digest.listDigestCandidates, {});
    const month = new Date().toISOString().slice(0, 7);

    for (const candidate of candidates) {
      const kind = `digest-${month}`;
      const sent = await ctx.runQuery(internal.digest.wasSent, {
        workspaceId: candidate._id,
        kind,
      });
      if (sent) continue;

      const data = await ctx.runQuery(internal.digest.digestDataForWorkspace, {
        workspaceId: candidate._id,
      });
      if (!data) continue;

      const { diff } = data;
      const leaks = diff.clients.filter((c) => c.monthlyLeak > 0);
      const subject =
        diff.totalMonthlyLeak > 0
          ? `${money(diff.totalMonthlyLeak)}/mo unbilled ahead of your billing run`
          : "Pre-billing check: no unbilled seats found";

      const rows = leaks
        .map(
          (c) =>
            `<tr><td style="padding:6px 12px 6px 0">${c.clientName}</td><td style="padding:6px 0;text-align:right;font-family:monospace">${money(c.monthlyLeak)}/mo</td></tr>`
        )
        .join("");

      const html = `
        <div style="font-family:Georgia,serif;max-width:540px;margin:0 auto;color:#1c2420">
          <p style="letter-spacing:.12em;text-transform:uppercase;font-size:11px;color:#186549;font-family:monospace">TrueUp — pre-billing digest</p>
          <h1 style="font-size:22px">${
            diff.totalMonthlyLeak > 0
              ? `You're licensed for ${money(diff.totalMonthlyLeak)}/mo you're not billing.`
              : "All mapped clients reconcile clean this month."
          }</h1>
          ${leaks.length > 0 ? `<table style="width:100%;border-collapse:collapse;font-size:15px">${rows}</table>` : ""}
          ${
            diff.totalEstimatedUnmappedValue > 0
              ? `<p style="color:#5c6862;font-size:14px">Plus ~${money(diff.totalEstimatedUnmappedValue)}/mo in unmapped SKUs — map them to confirm.</p>`
              : ""
          }
          <p style="margin-top:24px"><a href="${process.env.APP_URL ?? "http://localhost:3000"}/dashboard" style="color:#186549">Review before your billing run →</a></p>
        </div>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? "TrueUp <digest@updates.trueupmsp.com>",
          to: data.email,
          subject,
          html,
        }),
      });
      if (res.ok) {
        await ctx.runMutation(internal.digest.logSent, {
          workspaceId: candidate._id,
          kind,
          to: data.email,
        });
      }
    }
    return null;
  },
});
