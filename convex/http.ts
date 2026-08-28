import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { extractHabitUpdate, generateConfirmationReply } from "./lib/llm";
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

/**
 * Receives inbound-email events from AgentMail. Configure this URL
 * (https://<your-deployment>.convex.site/agentmail/webhook) as the webhook
 * for each habit's inbox in the AgentMail dashboard, event "message.received".
 *
 * The exact payload shape is read defensively (several possible field names)
 * since this sandbox could not reach agentmail.to to confirm the current
 * schema — check console logs if a real email doesn't get picked up, and
 * adjust the field lookups below to match what AgentMail actually sends.
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
    const toAddress = firstString(
      message.to,
      Array.isArray(message.to) ? message.to[0] : undefined,
      message.recipient,
      payload.inbox?.address,
      payload.address,
    );
    const fromAddress = firstString(
      message.from,
      Array.isArray(message.from) ? message.from[0] : undefined,
      message.sender,
    );
    const subject = firstString(message.subject) ?? "(no subject)";
    const rawText = firstString(message.text, message.body_text, message.snippet);
    const rawHtml = firstString(message.html, message.body_html);
    const body = rawText ?? (rawHtml ? stripHtml(rawHtml) : "");

    if (!toAddress) {
      console.error("AgentMail webhook: could not determine recipient inbox address", payload);
      return new Response("Missing recipient address", { status: 400 });
    }

    const habit = await ctx.runQuery(internal.habits.getByInboxAddress, {
      address: toAddress,
    });
    if (!habit) {
      console.error(`AgentMail webhook: no habit for inbox ${toAddress}`);
      return new Response("Unknown inbox", { status: 404 });
    }

    const extraction = await extractHabitUpdate(
      habit.name,
      habit.description,
      subject,
      body,
    );

    if (!extraction.completed) {
      return new Response("OK (not logged: not a completion)", { status: 200 });
    }

    await ctx.runMutation(internal.entries.recordFromEmail, {
      habitId: habit._id,
      note: extraction.note,
      mood: extraction.mood,
      emailSubject: subject,
    });

    if (habit.inboxId && fromAddress) {
      const reply = await generateConfirmationReply(
        habit.name,
        habit.currentStreak + 1,
        extraction.note,
      ).catch(() => `Logged! Keep it up.`);
      await sendReply(habit.inboxId, fromAddress, `Re: ${subject}`, reply);
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
