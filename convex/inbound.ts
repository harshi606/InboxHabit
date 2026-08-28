import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { generateConfirmationReply, matchHabitUpdate } from "./lib/llm";
import { listInboxMessages, sendEmail } from "./lib/agentmail";

/** Pull the bare address out of a "Display Name <addr@x.com>" string. */
function extractEmail(value: string): string | undefined {
  const angle = value.match(/<([^>]+)>/);
  const candidate = (angle ? angle[1] : value).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : undefined;
}

/**
 * Claim a message id for processing. Returns true only the first time — later
 * calls (or a concurrent poll) get false, so each email is handled once.
 */
export const claim = internalMutation({
  args: { messageId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("processedEmails")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .unique();
    if (existing) return false;
    await ctx.db.insert("processedEmails", { messageId: args.messageId });
    return true;
  },
});

/**
 * Handle one inbound email: sender -> user, LLM -> which habit + completed,
 * then record it and send a confirmation reply. Safe to call repeatedly for
 * the same message — `claim` gates the real work.
 */
export const handleMessage = internalAction({
  args: {
    messageId: v.string(),
    from: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const fromEmail = extractEmail(args.from);
    if (!fromEmail) return;

    const claimed = await ctx.runMutation(internal.inbound.claim, {
      messageId: args.messageId,
    });
    if (!claimed) return;

    const userId = await ctx.runQuery(internal.userSettings.userIdForEmail, {
      email: fromEmail,
    });
    if (!userId) {
      console.error(`inbound: no registered user for sender ${fromEmail}`);
      return;
    }

    const habits = await ctx.runQuery(internal.habits.forUser, { userId });
    if (habits.length === 0) return;

    const match = await matchHabitUpdate(
      habits.map((h) => ({ id: h._id, name: h.name, description: h.description })),
      args.subject,
      args.body,
    );
    const habit = match.completed
      ? habits.find((h) => h._id === match.habitId)
      : undefined;
    if (!habit) return;

    await ctx.runMutation(internal.entries.recordFromEmail, {
      habitId: habit._id,
      note: match.note,
      mood: match.mood,
      emailSubject: args.subject,
    });

    const reply = await generateConfirmationReply(
      habit.name,
      habit.currentStreak + 1,
      match.note,
    ).catch(() => `Logged! Keep it up.`);
    await sendEmail(fromEmail, `Re: ${args.subject}`, reply);
  },
});

/**
 * Poll the shared inbox for new inbound mail. Runs on a short cron interval —
 * AgentMail's webhook delivery isn't reliable on the free tier, so this is the
 * primary path.
 */
export const poll = internalAction({
  args: {},
  handler: async (ctx) => {
    const messages = await listInboxMessages(20);
    for (const message of messages) {
      if (message.sent) continue;
      try {
        await ctx.runAction(internal.inbound.handleMessage, {
          messageId: message.messageId,
          from: message.from,
          subject: message.subject,
          body: message.preview,
        });
      } catch (err) {
        console.error(`inbound: failed to handle ${message.messageId}`, err);
      }
    }
  },
});
