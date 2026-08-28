import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { matchHabitUpdate, generateConfirmationReply } from "./lib/llm";
import { sendReply } from "./lib/agentmail";

const http = httpRouter();

function firstString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return undefined;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Pull the bare address out of a "Display Name <addr@x.com>" string. */
function extractEmail(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const angle = value.match(/<([^>]+)>/);
  const candidate = (angle ? angle[1] : value).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : undefined;
}

/**
 * Receives inbound-email events from AgentMail for the app's shared inbox.
 * Configure this URL as an organization webhook in AgentMail, event
 * "message.received".
 *
 * Routing: the sender address identifies the user (they register it in the
 * dashboard), then an LLM matches the email to one of that user's habits.
 *
 * The payload shape is read defensively (several possible field names) since
 * it was written without live access to AgentMail's docs — check console logs
 * if a real email isn't picked up and adjust the field lookups below.
 */
http.route({
  path: "/agentmail/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.AGENTMAIL_WEBHOOK_SECRET;
    if (secret) {
      const provided =
        request.headers.get("x-webhook-secret") ??
        new URL(request.url).searchParams.get("secret");
      if (provided !== secret) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return new Response("Invalid JSON", { status: 400 });
    }

    const message = payload.message ?? payload;
    const fromAddress = extractEmail(
      firstString(
        message.from,
        Array.isArray(message.from) ? message.from[0] : undefined,
        message.sender,
      ),
    );
    const subject = firstString(message.subject) ?? "(no subject)";
    const rawText = firstString(message.text, message.body_text, message.snippet);
    const rawHtml = firstString(message.html, message.body_html);
    const body = rawText ?? (rawHtml ? stripHtml(rawHtml) : "");

    if (!fromAddress) {
      console.error("AgentMail webhook: could not determine sender address", payload);
      return new Response("Missing sender address", { status: 400 });
    }

    const userId = await ctx.runQuery(internal.userSettings.userIdForEmail, {
      email: fromAddress,
    });
    if (!userId) {
      console.error(`AgentMail webhook: no registered user for sender ${fromAddress}`);
      return new Response("OK (unknown sender)", { status: 200 });
    }

    const habits = await ctx.runQuery(internal.habits.forUser, { userId });
    if (habits.length === 0) {
      return new Response("OK (sender has no habits)", { status: 200 });
    }

    const match = await matchHabitUpdate(
      habits.map((h) => ({ id: h._id, name: h.name, description: h.description })),
      subject,
      body,
    );

    const habit = match.completed
      ? habits.find((h) => h._id === match.habitId)
      : undefined;
    if (!habit) {
      return new Response("OK (not logged: no matching completion)", { status: 200 });
    }

    await ctx.runMutation(internal.entries.recordFromEmail, {
      habitId: habit._id,
      note: match.note,
      mood: match.mood,
      emailSubject: subject,
    });

    const reply = await generateConfirmationReply(
      habit.name,
      habit.currentStreak + 1,
      match.note,
    ).catch(() => `Logged! Keep it up.`);
    await sendReply(fromAddress, `Re: ${subject}`, reply);

    return new Response("OK", { status: 200 });
  }),
});

export default http;
