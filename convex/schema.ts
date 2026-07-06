import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
  }).index("by_clerk", ["clerkId"]),

  workspaces: defineTable({
    name: v.string(),
    ownerUserId: v.id("users"),
    createdAt: v.number(),
    trialEndsAt: v.number(),
    digestEnabled: v.boolean(),
    digestEmail: v.optional(v.string()),
    // Day of month (1-28) the MSP runs billing; the digest lands 3 days before.
    billingDayOfMonth: v.optional(v.number()),
  }).index("by_owner", ["ownerUserId"]),

  // A client Microsoft 365 tenant under the MSP's GDAP / multi-tenant app.
  msTenants: defineTable({
    workspaceId: v.id("workspaces"),
    tenantId: v.string(), // Entra tenant GUID
    displayName: v.string(),
    status: v.union(
      v.literal("pending_consent"),
      v.literal("connected"),
      v.literal("error"),
      v.literal("disabled")
    ),
    statusDetail: v.optional(v.string()),
    lastSyncAt: v.optional(v.number()),
    addedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_tenant", ["workspaceId", "tenantId"]),

  // One document per tenant per sync: the tenant's subscribedSkus at capturedAt.
  seatSnapshots: defineTable({
    workspaceId: v.id("workspaces"),
    tenantDocId: v.id("msTenants"),
    capturedAt: v.number(),
    skus: v.array(
      v.object({
        skuId: v.string(),
        skuPartNumber: v.string(),
        prepaidEnabled: v.number(),
        prepaidSuspended: v.number(),
        prepaidWarning: v.number(),
        consumedUnits: v.number(),
        appliesTo: v.optional(v.string()),
      })
    ),
  }).index("by_tenant_captured", ["tenantDocId", "capturedAt"]),

  // Company subscriptions (renewal dates) from Graph /directory/subscriptions.
  renewals: defineTable({
    workspaceId: v.id("workspaces"),
    tenantDocId: v.id("msTenants"),
    subscriptionId: v.string(),
    skuId: v.optional(v.string()),
    skuPartNumber: v.optional(v.string()),
    offerName: v.optional(v.string()),
    totalLicenses: v.number(),
    isTrial: v.boolean(),
    status: v.string(), // Enabled | Warning | Suspended | Deleted | LockedOut
    nextLifecycleDateTime: v.optional(v.number()),
    capturedAt: v.number(),
  })
    .index("by_tenant", ["tenantDocId"])
    .index("by_workspace_next", ["workspaceId", "nextLifecycleDateTime"]),

  accountingConnections: defineTable({
    workspaceId: v.id("workspaces"),
    provider: v.union(v.literal("qbo"), v.literal("xero")),
    realmId: v.string(),
    companyName: v.optional(v.string()),
    accessToken: v.string(),
    refreshToken: v.string(),
    accessTokenExpiresAt: v.number(),
    refreshTokenExpiresAt: v.optional(v.number()),
    status: v.union(
      v.literal("connected"),
      v.literal("expired"),
      v.literal("error")
    ),
    statusDetail: v.optional(v.string()),
    connectedAt: v.number(),
    lastSyncAt: v.optional(v.number()),
  }).index("by_workspace", ["workspaceId"]),

  // Recurring-invoice (and recent invoice) line items pulled from accounting.
  invoiceLines: defineTable({
    workspaceId: v.id("workspaces"),
    connectionId: v.id("accountingConnections"),
    key: v.string(), // `${templateOrDocId}:${lineIdx}` — stable across syncs
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
    syncedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_key", ["workspaceId", "key"])
    .index("by_workspace_customer", ["workspaceId", "customerId"]),

  // Tenant -> accounting customer.
  clientMappings: defineTable({
    workspaceId: v.id("workspaces"),
    tenantDocId: v.id("msTenants"),
    customerId: v.string(),
    customerName: v.string(),
    confirmed: v.boolean(),
    suggestedBy: v.union(v.literal("auto"), v.literal("user")),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_tenant", ["tenantDocId"]),

  // SKU (within a tenant) -> invoice line, with optional price override.
  skuMappings: defineTable({
    workspaceId: v.id("workspaces"),
    tenantDocId: v.id("msTenants"),
    skuId: v.string(),
    lineKey: v.optional(v.string()),
    monthlyPricePerSeat: v.optional(v.number()),
    ignore: v.boolean(),
    confirmed: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantDocId"])
    .index("by_workspace", ["workspaceId"]),

  // Short-lived state nonces for OAuth redirects (QBO/Xero) and MS admin consent.
  oauthStates: defineTable({
    state: v.string(),
    workspaceId: v.id("workspaces"),
    provider: v.union(
      v.literal("qbo"),
      v.literal("xero"),
      v.literal("ms_consent")
    ),
    tenantDocId: v.optional(v.id("msTenants")),
    createdAt: v.number(),
  }).index("by_state", ["state"]),

  // Lead magnet captures (repricing calculator, landing page).
  leads: defineTable({
    email: v.string(),
    source: v.string(),
    meta: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // Digest / notification log, so crons never double-send.
  emailLog: defineTable({
    workspaceId: v.id("workspaces"),
    kind: v.string(), // e.g. "digest-2026-07"
    sentAt: v.number(),
    to: v.string(),
  }).index("by_workspace_kind", ["workspaceId", "kind"]),
});
