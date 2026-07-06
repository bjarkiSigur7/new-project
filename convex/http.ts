import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { polar } from "./billing";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();

// Polar subscription webhooks at /polar/events
polar.registerRoutes(http);

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

function redirect(to: string): Response {
  return new Response(null, { status: 302, headers: { Location: to } });
}

// Microsoft admin-consent redirect: the client's Global Admin lands here
// after approving (or declining) the TrueUp app in their tenant.
http.route({
  path: "/ms/consent-callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const state = url.searchParams.get("state") ?? "";
    const granted = url.searchParams.get("admin_consent") === "True";
    const error = url.searchParams.get("error_description");

    const stateRow = await ctx.runMutation(internal.tenants.consumeOauthState, {
      state,
      provider: "ms_consent",
    });
    if (!stateRow?.tenantDocId) {
      return redirect(`${appUrl()}/onboarding?consent=invalid`);
    }

    await ctx.runMutation(internal.tenants.markConsentResult, {
      tenantDocId: stateRow.tenantDocId,
      ok: granted,
      detail: granted ? undefined : (error ?? "Admin consent was declined"),
    });

    if (granted) {
      await ctx.scheduler.runAfter(0, internal.sync.syncTenant, {
        tenantDocId: stateRow.tenantDocId,
      });
      return redirect(`${appUrl()}/onboarding?consent=success`);
    }
    return redirect(`${appUrl()}/onboarding?consent=declined`);
  }),
});

// QuickBooks OAuth callback.
http.route({
  path: "/qbo/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const realmId = url.searchParams.get("realmId");
    const state = url.searchParams.get("state") ?? "";
    const error = url.searchParams.get("error");

    if (error || !code || !realmId) {
      return redirect(`${appUrl()}/onboarding?qbo=declined`);
    }

    const stateRow = await ctx.runMutation(internal.tenants.consumeOauthState, {
      state,
      provider: "qbo",
    });
    if (!stateRow) {
      return redirect(`${appUrl()}/onboarding?qbo=invalid`);
    }

    try {
      await ctx.runAction(internal.qbo.exchangeCode, {
        code,
        realmId,
        workspaceId: stateRow.workspaceId as Id<"workspaces">,
      });
    } catch {
      return redirect(`${appUrl()}/onboarding?qbo=error`);
    }
    return redirect(`${appUrl()}/onboarding?qbo=connected`);
  }),
});

// Clerk user-sync webhook.
http.route({
  path: "/clerk/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Missing CLERK_WEBHOOK_SECRET");
      return new Response("Server configuration error", { status: 500 });
    }

    try {
      const svixId = request.headers.get("svix-id");
      const svixTimestamp = request.headers.get("svix-timestamp");
      const svixSignature = request.headers.get("svix-signature");

      if (!svixId || !svixTimestamp || !svixSignature) {
        return new Response("Missing svix headers", { status: 400 });
      }

      const payload = await request.json();
      const body = JSON.stringify(payload);

      const wh = new Webhook(webhookSecret);
      const evt = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as WebhookEvent;

      const eventType = evt.type;

      if (eventType === "user.created" || eventType === "user.updated") {
        const { id, first_name, last_name, email_addresses, image_url, username } =
          evt.data;
        const name =
          first_name && last_name
            ? `${first_name} ${last_name}`.trim()
            : username || "Anonymous";
        const email = email_addresses?.[0]?.email_address || "";

        if (eventType === "user.created") {
          await ctx.runMutation(internal.users.internalCreateUser, {
            clerkId: id,
            name,
            email,
            imageUrl: image_url,
          });
        } else {
          await ctx.runMutation(internal.users.internalUpdateUser, {
            clerkId: id,
            name,
            email,
            imageUrl: image_url,
          });
        }
        return new Response("OK", { status: 200 });
      }

      if (eventType === "user.deleted") {
        const { id } = evt.data;
        if (!id) return new Response("User ID not found", { status: 400 });
        await ctx.runMutation(internal.users.internalDeleteUser, { clerkId: id });
        return new Response("User deletion noted", { status: 200 });
      }

      return new Response("Webhook received", { status: 200 });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response("Webhook processing failed", { status: 400 });
    }
  }),
});

export default http;
