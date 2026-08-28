// AgentMail (https://agentmail.to) hosts one shared inbox for the whole app.
// Users log progress by emailing that inbox from the address they registered;
// AgentMail delivers new messages to our webhook (see convex/http.ts), which
// figures out the user (by sender) and the habit (by an LLM match).
//
// NOTE: this targets AgentMail's v0 REST API. Verify field names against
// https://docs.agentmail.to if sending fails once a real API key is set.

const AGENTMAIL_BASE_URL = "https://api.agentmail.to/v0";

function requireApiKey(): string {
  const key = process.env.AGENTMAIL_API_KEY;
  if (!key) {
    throw new Error(
      "AGENTMAIL_API_KEY is not set. Run `npx convex env set AGENTMAIL_API_KEY <your-key>`.",
    );
  }
  return key;
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${requireApiKey()}`,
  };
}

/**
 * Send a plain-text reply from the shared inbox. Best-effort; never throws.
 * The inbox is identified by the AGENTMAIL_INBOX_ADDRESS env var (an AgentMail
 * inbox id is its own address).
 */
export async function sendReply(
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  const inbox = process.env.AGENTMAIL_INBOX_ADDRESS;
  if (!inbox) {
    console.error("AGENTMAIL_INBOX_ADDRESS is not set; cannot send reply");
    return;
  }
  try {
    const response = await fetch(
      `${AGENTMAIL_BASE_URL}/inboxes/${encodeURIComponent(inbox)}/messages/send`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ to: [to], subject, text }),
      },
    );
    if (!response.ok) {
      console.error(`AgentMail send failed (${response.status})`);
    }
  } catch (err) {
    console.error("AgentMail send threw", err);
  }
}
