import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { polar } from "./example";

const http = httpRouter();

// Register Polar webhook handler at /polar/events
polar.registerRoutes(http);

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
      
      // Verify the webhook
      const evt = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as WebhookEvent;

      const eventType = evt.type;
      console.log("Webhook event type:", eventType);

      if (eventType === "user.created") {
        const { id, first_name, last_name, email_addresses, image_url, username } = evt.data;

        const name = first_name && last_name 
          ? `${first_name} ${last_name}`.trim()
          : username || 'Anonymous';
        
        const email = email_addresses?.[0]?.email_address || "";

        await ctx.runMutation(internal.users.internalCreateUser, {
          clerkId: id,
          name,
          email,
          imageUrl: image_url,
        });

        return new Response("User created", { status: 200 });
      }

      if (eventType === "user.updated") {
        const { id, first_name, last_name, email_addresses, image_url, username } = evt.data;

        const name = first_name && last_name 
          ? `${first_name} ${last_name}`.trim()
          : username || 'Anonymous';
        
        const email = email_addresses?.[0]?.email_address || "";

        await ctx.runMutation(internal.users.internalUpdateUser, {
          clerkId: id,
          name,
          email,
          imageUrl: image_url,
        });

        return new Response("User updated", { status: 200 });
      }

      if (eventType === "user.deleted") {
        const { id } = evt.data;

        if (!id) {
          return new Response("User ID not found", { status: 400 });
        }

        await ctx.runMutation(internal.users.internalDeleteUser, {
          clerkId: id,
        });

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