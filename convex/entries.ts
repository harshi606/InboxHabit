import { v } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { isConsecutiveDay, utcDateString } from "./dateUtils";

async function applyCompletion(
  ctx: MutationCtx,
  habit: Doc<"habits">,
  args: {
    userId: Id<"users">;
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
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in.");
    const habit = await ctx.db.get(args.habitId);
    if (!habit || habit.userId !== userId) {
      throw new Error("Habit not found.");
    }
    return await applyCompletion(ctx, habit, {
      userId,
      note: args.note?.trim() || "Marked done.",
      source: "manual",
      completedAt: Date.now(),
    });
  },
});

/** Record a completion parsed from an inbound email. */
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

/** Live feed of recent entries for one of the signed-in user's habits. */
export const listForHabit = query({
  args: { habitId: v.id("habits") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const habit = await ctx.db.get(args.habitId);
    if (!habit || habit.userId !== userId) return [];
    return await ctx.db
      .query("entries")
      .withIndex("by_habit", (q) => q.eq("habitId", args.habitId))
      .order("desc")
      .take(50);
  },
});

/** UTC-midnight ms of the Monday that starts the week containing `ms`. */
function mondayOf(ms: number): number {
  const d = new Date(ms);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday … 6 = Sunday
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow);
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEKS_SHOWN = 8;

/**
 * The last 8 weeks of activity across all of the user's habits: for each week,
 * a 7-slot array of how many completions landed on that day (Mon → Sun).
 * Oldest week first.
 */
export const weeklyGrid = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { weeks: [] as WeekSummary[] };

    const thisMonday = mondayOf(Date.now());
    const firstMonday = thisMonday - (WEEKS_SHOWN - 1) * WEEK_MS;

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const weeks: WeekSummary[] = [];
    for (let i = 0; i < WEEKS_SHOWN; i++) {
      const start = firstMonday + i * WEEK_MS;
      weeks.push({
        weekStart: utcDateString(start),
        days: [0, 0, 0, 0, 0, 0, 0],
        total: 0,
      });
    }

    for (const entry of entries) {
      if (entry.completedAt < firstMonday) continue;
      const weekIndex = Math.floor((entry.completedAt - firstMonday) / WEEK_MS);
      if (weekIndex < 0 || weekIndex >= WEEKS_SHOWN) continue;
      const dow = (new Date(entry.completedAt).getUTCDay() + 6) % 7;
      weeks[weekIndex].days[dow] += 1;
      weeks[weekIndex].total += 1;
    }

    return { weeks };
  },
});

interface WeekSummary {
  weekStart: string;
  days: number[];
  total: number;
}
