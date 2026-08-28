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
 * Send a plain-text email from the shared inbox. Best-effort; never throws.
 * The inbox is identified by the AGENTMAIL_INBOX_ADDRESS env var (an AgentMail
 * inbox id is its own address). Used both for reply confirmations and for the
 * daily reminder digest.
 */
export interface InboxMessage {
  messageId: string;
  from: string;
  subject: string;
  /** Short plain-text preview of the body — enough to match a habit. */
  preview: string;
  sent: boolean;
}

/** Recent messages in the shared inbox, newest first. Best-effort; [] on error. */
export async function listInboxMessages(limit = 20): Promise<InboxMessage[]> {
  const inbox = process.env.AGENTMAIL_INBOX_ADDRESS;
  if (!inbox) {
    console.error("AGENTMAIL_INBOX_ADDRESS is not set; cannot poll inbox");
    return [];
  }
  try {
    const response = await fetch(
      `${AGENTMAIL_BASE_URL}/inboxes/${encodeURIComponent(inbox)}/messages?limit=${limit}`,
      { headers: authHeaders() },
    );
    if (!response.ok) {
      console.error(`AgentMail list messages failed (${response.status})`);
      return [];
    }
    const data = await response.json();
    const messages = Array.isArray(data?.messages) ? data.messages : [];
    return messages
      .map((m: Record<string, unknown>) => ({
        messageId: String(m.message_id ?? m.smtp_id ?? ""),
        from: typeof m.from === "string" ? m.from : "",
        subject: typeof m.subject === "string" ? m.subject : "(no subject)",
        preview: typeof m.preview === "string" ? m.preview : "",
        sent: Array.isArray(m.labels) && m.labels.includes("sent"),
      }))
      .filter((m: InboxMessage) => m.messageId.length > 0);
  } catch (err) {
    console.error("AgentMail list messages threw", err);
    return [];
  }
}

export async function sendEmail(
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
