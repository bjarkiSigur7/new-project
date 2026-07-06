import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireTenant, requireWorkspace } from "./lib/access";
import { skuName } from "../lib/m365";

/** Dice coefficient on character bigrams — good enough for name matching. */
function similarity(a: string, b: string): number {
  const bigrams = (s: string) => {
    const clean = s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const grams = new Map<string, number>();
    for (let i = 0; i < clean.length - 1; i++) {
      const g = clean.slice(i, i + 2);
      if (g.includes(" ")) continue;
      grams.set(g, (grams.get(g) ?? 0) + 1);
    }
    return grams;
  };
  const ga = bigrams(a);
  const gb = bigrams(b);
  let overlap = 0;
  let total = 0;
  for (const [, n] of ga) total += n;
  for (const [, n] of gb) total += n;
  for (const [g, n] of ga) overlap += Math.min(n, gb.get(g) ?? 0);
  return total === 0 ? 0 : (2 * overlap) / total;
}

/** Keyword hints mapping SKU names to invoice line descriptions. */
function lineMatchScore(skuPartNumber: string, lineText: string): number {
  const name = skuName(skuPartNumber).toLowerCase();
  const text = lineText.toLowerCase();
  let score = similarity(name, text);
  // Distinctive tokens carry more signal than the shared "microsoft 365".
  const tokens: Record<string, string[]> = {
    SPB: ["premium"],
    O365_BUSINESS_PREMIUM: ["standard"],
    O365_BUSINESS_ESSENTIALS: ["basic", "essentials"],
    EXCHANGESTANDARD: ["exchange", "mailbox"],
    EXCHANGEENTERPRISE: ["exchange", "plan 2"],
    MCOEV: ["phone", "voip", "calling"],
    Microsoft_365_Copilot: ["copilot"],
    AAD_PREMIUM: ["entra", "azure ad", "p1"],
    AAD_PREMIUM_P2: ["entra", "p2"],
    ENTERPRISEPACK: ["e3"],
    ENTERPRISEPREMIUM: ["e5"],
    SPE_E3: ["e3"],
    SPE_E5: ["e5"],
    ATP_ENTERPRISE: ["defender"],
    INTUNE_A: ["intune"],
  };
  for (const token of tokens[skuPartNumber] ?? []) {
    if (text.includes(token)) score += 0.35;
  }
  return score;
}

/**
 * Everything the mapping screen needs in one query: tenants with their SKUs,
 * accounting customers with their lines, current mappings, and suggestions.
 */
export const getMappingData = query({
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

    const tenants = await ctx.db
      .query("msTenants")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();
    const lines = await ctx.db
      .query("invoiceLines")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();
    const clientMappings = await ctx.db
      .query("clientMappings")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();
    const skuMappings = await ctx.db
      .query("skuMappings")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();

    // Distinct customers from invoice lines.
    const customersById = new Map<string, { customerId: string; customerName: string; lineCount: number }>();
    for (const line of lines) {
      const existing = customersById.get(line.customerId);
      if (existing) existing.lineCount++;
      else
        customersById.set(line.customerId, {
          customerId: line.customerId,
          customerName: line.customerName,
          lineCount: 1,
        });
    }
    const customers = [...customersById.values()].sort((a, b) =>
      a.customerName.localeCompare(b.customerName)
    );

    const mappingByTenant = new Map(clientMappings.map((m) => [m.tenantDocId, m]));
    const skuMappingsByTenant = new Map<string, typeof skuMappings>();
    for (const m of skuMappings) {
      const list = skuMappingsByTenant.get(m.tenantDocId) ?? [];
      list.push(m);
      skuMappingsByTenant.set(m.tenantDocId, list);
    }

    const tenantRows = await Promise.all(
      tenants
        .filter((t) => t.status !== "disabled")
        .map(async (tenant) => {
          const snapshot = await ctx.db
            .query("seatSnapshots")
            .withIndex("by_tenant_captured", (q) => q.eq("tenantDocId", tenant._id))
            .order("desc")
            .first();
          const mapping = mappingByTenant.get(tenant._id);

          // Customer suggestion: best name match above a floor.
          let suggestedCustomer: { customerId: string; customerName: string; score: number } | null = null;
          if (!mapping) {
            for (const customer of customers) {
              const score = similarity(tenant.displayName, customer.customerName);
              if (score > 0.45 && score > (suggestedCustomer?.score ?? 0)) {
                suggestedCustomer = { ...customer, score };
              }
            }
          }

          const customerLines = mapping
            ? lines.filter((l) => l.customerId === mapping.customerId)
            : [];
          const tenantSkuMappings = skuMappingsByTenant.get(tenant._id) ?? [];
          const mappingBySku = new Map(tenantSkuMappings.map((m) => [m.skuId, m]));

          const skus = (snapshot?.skus ?? []).map((sku) => {
            const skuMapping = mappingBySku.get(sku.skuId);
            // Line suggestion within the mapped customer's lines.
            let suggestedLineKey: string | null = null;
            if (!skuMapping?.lineKey && customerLines.length > 0) {
              let best = 0.5;
              for (const line of customerLines) {
                const text = `${line.itemName ?? ""} ${line.description ?? ""}`;
                const score = lineMatchScore(sku.skuPartNumber, text);
                if (score > best) {
                  best = score;
                  suggestedLineKey = line.key;
                }
              }
            }
            return {
              skuId: sku.skuId,
              skuPartNumber: sku.skuPartNumber,
              skuName: skuName(sku.skuPartNumber),
              seatsOwned: sku.prepaidEnabled,
              seatsAssigned: sku.consumedUnits,
              mapping: skuMapping
                ? {
                    lineKey: skuMapping.lineKey ?? null,
                    monthlyPricePerSeat: skuMapping.monthlyPricePerSeat ?? null,
                    ignore: skuMapping.ignore,
                  }
                : null,
              suggestedLineKey,
            };
          });

          return {
            tenantDocId: tenant._id,
            displayName: tenant.displayName,
            status: tenant.status,
            customerId: mapping?.customerId ?? null,
            customerName: mapping?.customerName ?? null,
            suggestedCustomer,
            skus,
            lines: customerLines.map((l) => ({
              key: l.key,
              itemName: l.itemName ?? null,
              description: l.description ?? null,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              intervalMonths: l.intervalMonths,
              templateName: l.templateName ?? null,
              source: l.source,
            })),
          };
        })
    );

    return { tenants: tenantRows, customers };
  },
});

export const setClientMapping = mutation({
  args: {
    tenantDocId: v.id("msTenants"),
    customerId: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { workspace, tenant } = await requireTenant(ctx, args.tenantDocId);
    const existing = await ctx.db
      .query("clientMappings")
      .withIndex("by_tenant", (q) => q.eq("tenantDocId", tenant._id))
      .first();

    if (args.customerId === null) {
      if (existing) await ctx.db.delete(existing._id);
      return null;
    }

    // Resolve the display name from the synced lines.
    const line = await ctx.db
      .query("invoiceLines")
      .withIndex("by_workspace_customer", (q) =>
        q.eq("workspaceId", workspace._id).eq("customerId", args.customerId as string)
      )
      .first();
    const customerName = line?.customerName ?? args.customerId;

    if (existing) {
      await ctx.db.patch(existing._id, {
        customerId: args.customerId,
        customerName,
        confirmed: true,
        suggestedBy: "user",
      });
    } else {
      await ctx.db.insert("clientMappings", {
        workspaceId: workspace._id,
        tenantDocId: tenant._id,
        customerId: args.customerId,
        customerName,
        confirmed: true,
        suggestedBy: "user",
      });
    }
    return null;
  },
});

export const setSkuMapping = mutation({
  args: {
    tenantDocId: v.id("msTenants"),
    skuId: v.string(),
    lineKey: v.optional(v.union(v.string(), v.null())),
    monthlyPricePerSeat: v.optional(v.union(v.number(), v.null())),
    ignore: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { workspace, tenant } = await requireTenant(ctx, args.tenantDocId);
    const existing = await ctx.db
      .query("skuMappings")
      .withIndex("by_tenant", (q) => q.eq("tenantDocId", tenant._id))
      .collect();
    const current = existing.find((m) => m.skuId === args.skuId);

    const patch = {
      lineKey:
        args.lineKey === undefined
          ? current?.lineKey
          : args.lineKey === null
            ? undefined
            : args.lineKey,
      monthlyPricePerSeat:
        args.monthlyPricePerSeat === undefined
          ? current?.monthlyPricePerSeat
          : args.monthlyPricePerSeat === null
            ? undefined
            : args.monthlyPricePerSeat,
      ignore: args.ignore ?? current?.ignore ?? false,
      confirmed: true,
      updatedAt: Date.now(),
    };

    if (current) {
      await ctx.db.replace(current._id, {
        workspaceId: workspace._id,
        tenantDocId: tenant._id,
        skuId: args.skuId,
        ...patch,
      });
    } else {
      await ctx.db.insert("skuMappings", {
        workspaceId: workspace._id,
        tenantDocId: tenant._id,
        skuId: args.skuId,
        ...patch,
      });
    }
    return null;
  },
});

/** Accept every suggestion in one click — the fast path after first sync. */
export const acceptAllSuggestions = mutation({
  args: {
    clientPairs: v.array(
      v.object({ tenantDocId: v.id("msTenants"), customerId: v.string() })
    ),
    skuPairs: v.array(
      v.object({
        tenantDocId: v.id("msTenants"),
        skuId: v.string(),
        lineKey: v.string(),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { workspace } = await requireWorkspace(ctx);

    for (const pair of args.clientPairs) {
      const tenant = await ctx.db.get(pair.tenantDocId);
      if (!tenant || tenant.workspaceId !== workspace._id) continue;
      const existing = await ctx.db
        .query("clientMappings")
        .withIndex("by_tenant", (q) => q.eq("tenantDocId", pair.tenantDocId))
        .first();
      if (existing) continue;
      const line = await ctx.db
        .query("invoiceLines")
        .withIndex("by_workspace_customer", (q) =>
          q.eq("workspaceId", workspace._id).eq("customerId", pair.customerId)
        )
        .first();
      await ctx.db.insert("clientMappings", {
        workspaceId: workspace._id,
        tenantDocId: pair.tenantDocId,
        customerId: pair.customerId,
        customerName: line?.customerName ?? pair.customerId,
        confirmed: true,
        suggestedBy: "auto",
      });
    }

    for (const pair of args.skuPairs) {
      const tenant = await ctx.db.get(pair.tenantDocId);
      if (!tenant || tenant.workspaceId !== workspace._id) continue;
      const existing = await ctx.db
        .query("skuMappings")
        .withIndex("by_tenant", (q) => q.eq("tenantDocId", pair.tenantDocId))
        .collect();
      if (existing.some((m) => m.skuId === pair.skuId)) continue;
      await ctx.db.insert("skuMappings", {
        workspaceId: workspace._id,
        tenantDocId: pair.tenantDocId,
        skuId: pair.skuId,
        lineKey: pair.lineKey,
        ignore: false,
        confirmed: true,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});
