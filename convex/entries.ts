import { v } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { isConsecutiveDay, utcDateString } from "./dateUtils";

async function applyCompletion(
  ctx: MutationCtx,
  habit: Doc<"habits">,
  args: {
    userId: string;
    note: string;
    mood?: string;
    source: "manual" | "email";
    emailSubject?: string;
    completedAt: number;
  },
): Promise<{ entryId: Id<"entries">; currentStreak: number }> {
  const today = utcDateString(args.completedAt);

  let currentStreak = habit.currentStreak;
  if (habit.lastCompletedDate === today) {
    // Already logged today; keep the streak as-is.
  } else if (
    habit.lastCompletedDate &&
    isConsecutiveDay(habit.lastCompletedDate, today)
  ) {
    currentStreak += 1;
  } else {
    currentStreak = 1;
  }
  const longestStreak = Math.max(habit.longestStreak, currentStreak);

  await ctx.db.patch(habit._id, {
    currentStreak,
    longestStreak,
    lastCompletedDate: today,
  });

  const entryId = await ctx.db.insert("entries", {
    habitId: habit._id,
    userId: args.userId,
    completedAt: args.completedAt,
    note: args.note,
    mood: args.mood,
    source: args.source,
    emailSubject: args.emailSubject,
  });
  return { entryId, currentStreak };
}

/** Manually mark a habit done today (the quick "Log today" button). */
export const logManual = mutation({
  args: {
    habitId: v.id("habits"),
    userId: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const habit = await ctx.db.get(args.habitId);
    if (!habit || habit.userId !== args.userId) {
      throw new Error("Habit not found.");
    }
    return await applyCompletion(ctx, habit, {
      userId: args.userId,
      note: args.note?.trim() || "Marked done.",
      source: "manual",
      completedAt: Date.now(),
    });
  },
});

/** Record a completion parsed from an inbound AgentMail email. */
export const recordFromEmail = internalMutation({
  args: {
    habitId: v.id("habits"),
    note: v.string(),
    mood: v.optional(v.string()),
    emailSubject: v.string(),
  },
  handler: async (ctx, args) => {
    const habit = await ctx.db.get(args.habitId);
    if (!habit) {
      throw new Error("Habit not found.");
    }
    return await applyCompletion(ctx, habit, {
      userId: habit.userId,
      note: args.note || "Logged via email.",
      mood: args.mood,
      source: "email",
      emailSubject: args.emailSubject,
      completedAt: Date.now(),
    });
  },
});

/** Live feed of recent entries for one habit, newest first. */
export const listForHabit = query({
  args: { habitId: v.id("habits") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("entries")
      .withIndex("by_habit", (q) => q.eq("habitId", args.habitId))
      .order("desc")
      .take(50);
  },
});
