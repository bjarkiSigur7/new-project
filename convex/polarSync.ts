import { action } from "./_generated/server";
import { polar } from "./billing";

export const syncProducts = action({
  args: {},
  handler: async (ctx) => {
    await polar.syncProducts(ctx);
  },
});
