// QuickBooks Online: OAuth connect + recurring-invoice ingestion.
// The whole OAuth flow lives on Convex HTTP routes so tokens never touch the
// Next.js server. Xero follows the same table shape as a fast-follow.

import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { query } from "./_generated/server";
import { randomToken, requireWorkspace } from "./lib/access";

const QBO_SCOPES = "com.intuit.quickbooks.accounting";

function qboApiBase(): string {
  return process.env.QBO_ENV === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

function requireQboEnv() {
  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "QuickBooks isn't configured on this deployment (QBO_CLIENT_ID / QBO_CLIENT_SECRET)."
    );
  }
  return { clientId, clientSecret };
}

export const getConnection = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;
    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", user._id))
      .first();
    if (!workspace) return null;
    const connection = await ctx.db
      .query("accountingConnections")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .first();
    if (!connection) return null;
    // Never ship tokens to the browser.
    return {
      _id: connection._id,
      provider: connection.provider,
      companyName: connection.companyName ?? null,
      status: connection.status,
      statusDetail: connection.statusDetail ?? null,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt ?? null,
    };
  },
});

/** Start the OAuth dance: returns the Intuit authorize URL to redirect to. */
export const getConnectUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const { workspace } = await requireWorkspace(ctx);
    const clientId = process.env.QBO_CLIENT_ID;
    if (!clientId) {
      throw new Error(
        "QuickBooks isn't configured on this deployment (QBO_CLIENT_ID)."
      );
    }
    const state = randomToken();
    await ctx.db.insert("oauthStates", {
      state,
      workspaceId: workspace._id,
      provider: "qbo",
      createdAt: Date.now(),
    });
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      scope: QBO_SCOPES,
      redirect_uri: `${process.env.CONVEX_SITE_URL}/qbo/callback`,
      state,
    });
    return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
  },
});

export const disconnect = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { workspace } = await requireWorkspace(ctx);
    const connection = await ctx.db
      .query("accountingConnections")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .first();
    if (!connection) return null;
    const lines = await ctx.db
      .query("invoiceLines")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();
    for (const line of lines) await ctx.db.delete(line._id);
    await ctx.db.delete(connection._id);
    return null;
  },
});

export const requestSync = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const connection = await ctx.runQuery(internal.qbo.getMyConnectionInternal, {});
    if (!connection) throw new Error("QuickBooks isn't connected yet.");
    await ctx.scheduler.runAfter(0, internal.qbo.syncConnection, {
      connectionId: connection._id,
    });
    return null;
  },
});

// ---- OAuth code exchange (called from the /qbo/callback HTTP route) ----

export const exchangeCode = internalAction({
  args: {
    code: v.string(),
    realmId: v.string(),
    workspaceId: v.id("workspaces"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { clientId, clientSecret } = requireQboEnv();
    const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: args.code,
        redirect_uri: `${process.env.CONVEX_SITE_URL}/qbo/callback`,
      }),
    });
    if (!res.ok) {
      throw new Error(`QuickBooks token exchange failed (${res.status})`);
    }
    const tokens = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      x_refresh_token_expires_in?: number;
    };

    const connectionId = await ctx.runMutation(internal.qbo.upsertConnection, {
      workspaceId: args.workspaceId,
      realmId: args.realmId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
      refreshTokenExpiresAt: tokens.x_refresh_token_expires_in
        ? Date.now() + tokens.x_refresh_token_expires_in * 1000
        : undefined,
    });

    // Company name is cosmetic; failure shouldn't break connect.
    try {
      const info = await qboGet(
        tokens.access_token,
        args.realmId,
        `/v3/company/${args.realmId}/companyinfo/${args.realmId}`
      );
      const name = (info as { CompanyInfo?: { CompanyName?: string } })
        .CompanyInfo?.CompanyName;
      if (name) {
        await ctx.runMutation(internal.qbo.setCompanyName, {
          connectionId,
          companyName: name,
        });
      }
    } catch {
      // ignore
    }

    await ctx.scheduler.runAfter(0, internal.qbo.syncConnection, { connectionId });
    return null;
  },
});

async function qboGet(
  accessToken: string,
  realmId: string,
  path: string
): Promise<unknown> {
  const res = await fetch(`${qboApiBase()}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(
      `QBO GET ${path} failed (${res.status}): ${text.slice(0, 300)}`
    );
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return await res.json();
}

async function qboQuery(
  accessToken: string,
  realmId: string,
  soql: string
): Promise<unknown> {
  return await qboGet(
    accessToken,
    realmId,
    `/v3/company/${realmId}/query?query=${encodeURIComponent(soql)}&minorversion=75`
  );
}

type QboLine = {
  Id?: string;
  Description?: string;
  Amount?: number;
  DetailType?: string;
  SalesItemLineDetail?: {
    ItemRef?: { value?: string; name?: string };
    Qty?: number;
    UnitPrice?: number;
  };
};

type QboInvoiceish = {
  Id?: string;
  CustomerRef?: { value?: string; name?: string };
  Line?: QboLine[];
  RecurringInfo?: {
    Name?: string;
    ScheduleInfo?: { IntervalType?: string; NumInterval?: number };
  };
};

function intervalToMonths(intervalType?: string, numInterval?: number): number {
  const n = numInterval && numInterval > 0 ? numInterval : 1;
  switch (intervalType) {
    case "Yearly":
      return 12 * n;
    case "Monthly":
      return n;
    case "Weekly":
      return Math.max(1, Math.round(n / 4));
    case "Daily":
      return 1;
    default:
      return 1;
  }
}

function extractLines(
  doc: QboInvoiceish,
  keyPrefix: string,
  source: "recurring" | "invoice",
  intervalMonths: number,
  templateName?: string
) {
  const customerId = doc.CustomerRef?.value;
  const customerName = doc.CustomerRef?.name ?? "Unknown customer";
  if (!customerId || !doc.Line) return [];
  return doc.Line.filter(
    (l) => l.DetailType === "SalesItemLineDetail" && l.SalesItemLineDetail
  ).map((l, idx) => {
    const detail = l.SalesItemLineDetail!;
    const quantity = detail.Qty ?? 1;
    const amount = l.Amount ?? 0;
    const unitPrice = detail.UnitPrice ?? (quantity > 0 ? amount / quantity : 0);
    return {
      key: `${keyPrefix}:${l.Id ?? idx}`,
      source,
      customerId,
      customerName,
      itemName: detail.ItemRef?.name,
      description: l.Description,
      quantity,
      unitPrice,
      amount,
      intervalMonths,
      templateName,
    };
  });
}

export const syncConnection = internalAction({
  args: { connectionId: v.id("accountingConnections") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(internal.qbo.getConnectionInternal, {
      connectionId: args.connectionId,
    });
    if (!connection) return null;

    try {
      let accessToken = connection.accessToken;
      // Refresh when the access token is expired or about to be.
      if (connection.accessTokenExpiresAt < Date.now() + 5 * 60 * 1000) {
        const { clientId, clientSecret } = requireQboEnv();
        const res = await fetch(
          "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Accept: "application/json",
              Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
            },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: connection.refreshToken,
            }),
          }
        );
        if (!res.ok) {
          throw new Error(
            `Token refresh failed (${res.status}) — reconnect QuickBooks.`
          );
        }
        const tokens = (await res.json()) as {
          access_token: string;
          refresh_token: string;
          expires_in: number;
          x_refresh_token_expires_in?: number;
        };
        accessToken = tokens.access_token;
        await ctx.runMutation(internal.qbo.updateTokens, {
          connectionId: connection._id,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          accessTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
          refreshTokenExpiresAt: tokens.x_refresh_token_expires_in
            ? Date.now() + tokens.x_refresh_token_expires_in * 1000
            : undefined,
        });
      }

      // Primary source: recurring transaction templates.
      const recurring = (await qboQuery(
        accessToken,
        connection.realmId,
        "select * from RecurringTransaction maxresults 1000"
      )) as {
        QueryResponse?: { RecurringTransaction?: Array<Record<string, QboInvoiceish>> };
      };

      const lines: ReturnType<typeof extractLines> = [];
      for (const wrapper of recurring.QueryResponse?.RecurringTransaction ?? []) {
        // Each wrapper holds one txn type key, e.g. { Invoice: {...} }.
        const invoice = wrapper.Invoice ?? wrapper.SalesReceipt;
        if (!invoice) continue;
        const info = invoice.RecurringInfo;
        lines.push(
          ...extractLines(
            invoice,
            `rt-${invoice.Id ?? info?.Name ?? "x"}`,
            "recurring",
            intervalToMonths(
              info?.ScheduleInfo?.IntervalType,
              info?.ScheduleInfo?.NumInterval
            ),
            info?.Name
          )
        );
      }

      // Fallback: recent invoices, for shops that re-issue instead of recurring.
      if (lines.length === 0) {
        const since = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        const invoices = (await qboQuery(
          accessToken,
          connection.realmId,
          `select * from Invoice where TxnDate >= '${since}' orderby TxnDate desc maxresults 300`
        )) as { QueryResponse?: { Invoice?: QboInvoiceish[] } };
        const seenCustomers = new Set<string>();
        for (const invoice of invoices.QueryResponse?.Invoice ?? []) {
          const customer = invoice.CustomerRef?.value;
          // Latest invoice per customer approximates their recurring bill.
          if (!customer || seenCustomers.has(customer)) continue;
          seenCustomers.add(customer);
          lines.push(...extractLines(invoice, `inv-${invoice.Id}`, "invoice", 1));
        }
      }

      await ctx.runMutation(internal.qbo.storeLines, {
        connectionId: connection._id,
        workspaceId: connection.workspaceId,
        lines,
      });
    } catch (error) {
      await ctx.runMutation(internal.qbo.markError, {
        connectionId: connection._id,
        detail:
          error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
      });
    }
    return null;
  },
});

export const syncAllConnections = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const connections = await ctx.runQuery(
      internal.qbo.listConnectionsInternal,
      {}
    );
    for (let i = 0; i < connections.length; i++) {
      await ctx.scheduler.runAfter(i * 3000, internal.qbo.syncConnection, {
        connectionId: connections[i]._id,
      });
    }
    return null;
  },
});

// ---- internal queries/mutations ----

export const getConnectionInternal = internalQuery({
  args: { connectionId: v.id("accountingConnections") },
  handler: async (ctx, args) => await ctx.db.get(args.connectionId),
});

export const getMyConnectionInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const { workspace } = await requireWorkspace(ctx);
    return await ctx.db
      .query("accountingConnections")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .first();
  },
});

export const listConnectionsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("accountingConnections").collect();
    return all
      .filter((c) => c.status !== "error" || c.lastSyncAt)
      .map((c) => ({ _id: c._id }));
  },
});

export const upsertConnection = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    realmId: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    accessTokenExpiresAt: v.number(),
    refreshTokenExpiresAt: v.optional(v.number()),
  },
  returns: v.id("accountingConnections"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("accountingConnections")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        realmId: args.realmId,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        accessTokenExpiresAt: args.accessTokenExpiresAt,
        refreshTokenExpiresAt: args.refreshTokenExpiresAt,
        status: "connected",
        statusDetail: undefined,
      });
      return existing._id;
    }
    return await ctx.db.insert("accountingConnections", {
      workspaceId: args.workspaceId,
      provider: "qbo",
      realmId: args.realmId,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      accessTokenExpiresAt: args.accessTokenExpiresAt,
      refreshTokenExpiresAt: args.refreshTokenExpiresAt,
      status: "connected",
      connectedAt: Date.now(),
    });
  },
});

export const updateTokens = internalMutation({
  args: {
    connectionId: v.id("accountingConnections"),
    accessToken: v.string(),
    refreshToken: v.string(),
    accessTokenExpiresAt: v.number(),
    refreshTokenExpiresAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { connectionId, ...patch } = args;
    await ctx.db.patch(connectionId, { ...patch, status: "connected" });
    return null;
  },
});

export const setCompanyName = internalMutation({
  args: {
    connectionId: v.id("accountingConnections"),
    companyName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, { companyName: args.companyName });
    return null;
  },
});

export const storeLines = internalMutation({
  args: {
    connectionId: v.id("accountingConnections"),
    workspaceId: v.id("workspaces"),
    lines: v.array(
      v.object({
        key: v.string(),
        source: v.union(v.literal("recurring"), v.literal("invoice")),
        customerId: v.string(),
        customerName: v.string(),
        itemName: v.optional(v.string()),
        description: v.optional(v.string()),
        quantity: v.number(),
        unitPrice: v.number(),
        amount: v.number(),
        intervalMonths: v.number(),
        templateName: v.optional(v.string()),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("invoiceLines")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const row of existing) await ctx.db.delete(row._id);
    for (const line of args.lines) {
      await ctx.db.insert("invoiceLines", {
        workspaceId: args.workspaceId,
        connectionId: args.connectionId,
        syncedAt: now,
        ...line,
      });
    }
    await ctx.db.patch(args.connectionId, {
      lastSyncAt: now,
      status: "connected",
      statusDetail: undefined,
    });
    return null;
  },
});

export const markError = internalMutation({
  args: {
    connectionId: v.id("accountingConnections"),
    detail: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      status: "error",
      statusDetail: args.detail,
    });
    return null;
  },
});
