import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { scrapeToMarkdown } from "./lib/firecrawl";
import { generateGenericTips, summarizeTips } from "./lib/llm";

/** Live list of a user's habits, newest first. */
export const listForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const habits = await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    return habits;
  },
});

/** Same list, for the inbound-email poller to match against. */
export const forUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const insert = internalMutation({
  args: {
    userId: v.string(),
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
 * Create a habit:
 *  1. (optional) Firecrawl-scrape a source URL for inspiration.
 *  2. An LLM (Groq) turns that (or the habit name alone) into a few short tips.
 * Tips are best-effort: a failure there doesn't block habit creation. Logging
 * by email works through the app's one shared inbox (see convex/inbound.ts),
 * so no per-habit inbox is provisioned.
 */
export const create = action({
  args: {
    userId: v.string(),
    name: v.string(),
    description: v.string(),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ habitId: string; warnings: string[] }> => {
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
      userId: args.userId,
      name: args.name,
      description: args.description,
      tips,
    });

    return { habitId, warnings };
  },
});
