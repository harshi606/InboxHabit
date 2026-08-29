import { v } from "convex/values";
import { internalQuery, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** The signed-in user's profile (id + email), or null when signed out. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    return user && { _id: user._id, email: user.email ?? null };
  },
});

/** Find a user by email address — used to route inbound mail to its owner. */
export const byEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .unique();
  },
});
