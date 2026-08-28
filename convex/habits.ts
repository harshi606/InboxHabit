import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { scrapeToMarkdown } from "./lib/firecrawl";
import { createInbox } from "./lib/agentmail";
import { generateGenericTips, summarizeTips } from "./lib/openai";

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

export const getByInboxAddress = internalQuery({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("habits")
      .withIndex("by_inboxAddress", (q) => q.eq("inboxAddress", args.address))
      .unique();
  },
});

export const insert = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    description: v.string(),
    tips: v.string(),
    inboxAddress: v.optional(v.string()),
    inboxId: v.optional(v.string()),
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
 * Create a habit end-to-end:
 *  1. (optional) Firecrawl-scrape a source URL for inspiration.
 *  2. OpenAI turns that (or the habit name alone) into a few short tips.
 *  3. AgentMail provisions a dedicated inbox so the habit can be logged by email.
 * Each external call is best-effort: a failure in one doesn't block the others.
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

    let inboxAddress: string | undefined;
    let inboxId: string | undefined;
    try {
      const inbox = await createInbox(args.name);
      if (inbox) {
        inboxAddress = inbox.address;
        inboxId = inbox.inboxId;
      } else {
        warnings.push("Could not create an email inbox for this habit.");
      }
    } catch (err) {
      warnings.push(`Inbox creation failed: ${(err as Error).message}`);
    }

    const habitId = await ctx.runMutation(internal.habits.insert, {
      userId: args.userId,
      name: args.name,
      description: args.description,
      tips,
      inboxAddress,
      inboxId,
    });

    return { habitId, warnings };
  },
});
