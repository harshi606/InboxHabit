import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";

/** The current user's settings (just their email, for now), or null. */
export const get = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

/** Set (or update) the email address this user logs habits from. */
export const setEmail = mutation({
  args: { userId: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { email });
    } else {
      await ctx.db.insert("userSettings", { userId: args.userId, email });
    }
  },
});

/** Look up which user an inbound email belongs to, by sender address. */
export const userIdForEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("userSettings")
      .withIndex("by_email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .first();
    return row?.userId ?? null;
  },
});
