import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { scrapeToMarkdown } from "./lib/firecrawl";
import { generateGenericTips, summarizeTips } from "./lib/llm";

/** Live list of the signed-in user's habits, newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

/** One user's habits, for the inbound-email poller and the daily digest. */
export const forUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const insert = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    tips: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("habits", {
      ...args,
      currentStreak: 0,
      longestStreak: 0,
      createdAt: Date.now(),
    });
  },
});

/**
 * Create a habit for the signed-in user:
 *  1. (optional) Firecrawl-scrape a source URL for inspiration.
 *  2. An LLM (Groq) turns that (or the habit name alone) into a few short tips.
 * Tips are best-effort: a failure there doesn't block habit creation. Logging
 * by email works through the app's one shared inbox (see convex/inbound.ts).
 */
export const create = action({
  args: {
    name: v.string(),
    description: v.string(),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ habitId: string; warnings: string[] }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in.");

    const warnings: string[] = [];
    let tips = "";
    try {
      if (args.sourceUrl) {
        const markdown = await scrapeToMarkdown(args.sourceUrl);
        tips = markdown
          ? await summarizeTips(args.name, markdown)
          : await generateGenericTips(args.name);
        if (!markdown) {
          warnings.push("Could not crawl the source URL; used generic tips instead.");
        }
      } else {
        tips = await generateGenericTips(args.name);
      }
    } catch (err) {
      warnings.push(`Tips generation failed: ${(err as Error).message}`);
    }

    const habitId = await ctx.runMutation(internal.habits.insert, {
      userId,
      name: args.name,
      description: args.description,
      tips,
    });

    return { habitId, warnings };
  },
});
