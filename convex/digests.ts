import type { Doc } from "./_generated/dataModel";
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { utcDateString } from "./dateUtils";
import { generateEncouragement } from "./lib/llm";
import { sendEmail } from "./lib/agentmail";

interface DueGroup {
  email: string;
  habits: Doc<"habits">[];
}

/**
 * Every account with an email together with the habits they have NOT completed
 * yet today. Accounts with nothing due are omitted. Small scale, so a full scan
 * in a once-a-day job is fine.
 */
export const due = internalQuery({
  args: {},
  handler: async (ctx): Promise<DueGroup[]> => {
    const today = utcDateString(Date.now());
    const groups: DueGroup[] = [];
    for (const user of await ctx.db.query("users").collect()) {
      if (!user.email) continue;
      const habits = await ctx.db
        .query("habits")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      const dueHabits = habits.filter((h) => h.lastCompletedDate !== today);
      if (dueHabits.length > 0) {
        groups.push({ email: user.email, habits: dueHabits });
      }
    }
    return groups;
  },
});

function buildBody(habits: Doc<"habits">[], encouragement: string): string {
  const lines = [encouragement, ""];
  for (const habit of habits) {
    const streak =
      habit.currentStreak > 0
        ? `${habit.currentStreak}-day streak — keep it alive`
        : "no streak yet — today's a good day to start";
    lines.push(`▸ ${habit.name} (${streak})`);
    if (habit.tips) lines.push(habit.tips);
    lines.push("");
  }
  lines.push("Reply to this email to log any of these as done.");
  return lines.join("\n");
}

/**
 * Send each account one digest of their still-to-do habits for the day, with
 * tips and an LLM-written encouragement note. Idempotent enough to re-run.
 */
export const sendDaily = internalAction({
  args: {},
  handler: async (ctx): Promise<{ sent: number }> => {
    const groups: DueGroup[] = await ctx.runQuery(internal.digests.due, {});
    for (const group of groups) {
      let encouragement = "A small step today keeps the momentum going.";
      try {
        encouragement = await generateEncouragement(
          group.habits.map((h) => ({
            name: h.name,
            currentStreak: h.currentStreak,
          })),
        );
      } catch (err) {
        console.error("digest encouragement generation failed", err);
      }
      await sendEmail(
        group.email,
        "Your habits for today 🌱",
        buildBody(group.habits, encouragement),
      );
    }
    return { sent: groups.length };
  },
});
