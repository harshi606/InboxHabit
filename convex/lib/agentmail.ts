// AgentMail (https://agentmail.to) gives each habit its own AI-managed email
// inbox. Users log progress by emailing that inbox; AgentMail delivers new
// messages to our webhook (see convex/http.ts).
//
// NOTE: this targets AgentMail's v0 REST API from training-data knowledge.
// This sandbox could not reach agentmail.to to double-check the current
// docs — verify field names against https://docs.agentmail.to if inbox
// creation or sending fails once a real API key is set.

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

export interface CreatedInbox {
  inboxId: string;
  address: string;
}

/**
 * Create a dedicated inbox for a habit. Returns null (rather than throwing)
 * if inbox creation fails, so a habit can still be created without email
 * logging as a fallback.
 */
export async function createInbox(habitName: string): Promise<CreatedInbox | null> {
  // AgentMail rejects display names containing punctuation like ":" with a
  // validation_error, so strip everything except letters, numbers, spaces and
  // hyphens before sending.
  const displayName = `InboxHabit ${habitName}`
    .replace(/[^\p{L}\p{N} -]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);

  try {
    const response = await fetch(`${AGENTMAIL_BASE_URL}/inboxes`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ display_name: displayName }),
    });

    if (!response.ok) {
      console.error(`AgentMail create inbox failed (${response.status})`);
      return null;
    }

    const data = await response.json();
    const inboxId = data?.inbox_id ?? data?.id;
    const address = data?.address ?? data?.email;
    if (typeof inboxId !== "string" || typeof address !== "string") {
      console.error("AgentMail create inbox response missing inbox_id/address");
      return null;
    }
    return { inboxId, address };
  } catch (err) {
    console.error("AgentMail create inbox threw", err);
    return null;
  }
}

/** Send a plain-text reply from a habit's inbox. Best-effort; never throws. */
export async function sendReply(
  inboxId: string,
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  try {
    const response = await fetch(
      `${AGENTMAIL_BASE_URL}/inboxes/${encodeURIComponent(inboxId)}/messages/send`,
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
