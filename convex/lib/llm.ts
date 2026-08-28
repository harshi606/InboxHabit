// LLM helpers for InboxHabit: habit tips, inbound-email parsing, and
// confirmation replies. Uses Groq's OpenAI-compatible chat-completions API
// (https://console.groq.com) so it runs on a free API key with no billing.
// Swap GROQ_API_URL / DEFAULT_MODEL and the GROQ_API_KEY env var to move to
// another OpenAI-compatible provider.

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
// A current Groq-hosted model that supports JSON-object response format.
// Run `curl https://api.groq.com/openai/v1/models` for the live catalog.
const DEFAULT_MODEL = "openai/gpt-oss-120b";

function requireApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error(
      "GROQ_API_KEY is not set. Run `npx convex env set GROQ_API_KEY <your-key>`.",
    );
  }
  return key;
}

async function chatJson(
  systemPrompt: string,
  userPrompt: string,
): Promise<Record<string, unknown>> {
  const apiKey = requireApiKey();
  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`LLM request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("LLM response did not contain message content.");
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`LLM response was not valid JSON: ${content}`);
  }
}

/** Summarize crawled article content into 3-5 short, practical habit tips. */
export async function summarizeTips(
  habitName: string,
  articleMarkdown: string,
): Promise<string> {
  const result = await chatJson(
    "You help people build habits. Given source material, extract 3-5 short, " +
      "practical, encouraging tips as a JSON object: {\"tips\": string[]}. " +
      "Each tip should be one sentence. No fluff, no generic advice not " +
      "grounded in the source material.",
    `Habit: ${habitName}\n\nSource material:\n${articleMarkdown.slice(0, 12000)}`,
  );
  const tips = Array.isArray(result.tips) ? result.tips : [];
  return tips
    .filter((t): t is string => typeof t === "string")
    .map((t) => `- ${t}`)
    .join("\n");
}

/** Generate 3-5 short generic tips for a habit with no source material. */
export async function generateGenericTips(habitName: string): Promise<string> {
  const result = await chatJson(
    "You help people build habits. Given a habit name, suggest 3-5 short, " +
      "practical, encouraging tips as a JSON object: {\"tips\": string[]}. " +
      "Each tip should be one sentence.",
    `Habit: ${habitName}`,
  );
  const tips = Array.isArray(result.tips) ? result.tips : [];
  return tips
    .filter((t): t is string => typeof t === "string")
    .map((t) => `- ${t}`)
    .join("\n");
}

export interface HabitMatch {
  /** id of the matched habit, or null if none of the user's habits clearly fit. */
  habitId: string | null;
  completed: boolean;
  note: string;
  mood?: string;
}

/**
 * Given a user's habits and an inbound email, decide which habit the email is
 * reporting progress on and whether it was completed.
 */
export async function matchHabitUpdate(
  habits: { id: string; name: string; description: string }[],
  emailSubject: string,
  emailBody: string,
): Promise<HabitMatch> {
  const list = habits
    .map((h) => `- id=${h.id} | ${h.name} — ${h.description}`)
    .join("\n");
  const result = await chatJson(
    "A user emailed their habit-tracking inbox. Using the list of their " +
      "habits, decide which single habit this email is reporting progress on " +
      "and whether they completed it. Reply as JSON: " +
      "{\"habitId\": string|null, \"completed\": boolean, \"note\": string, \"mood\": string}. " +
      "\"habitId\" must be exactly one of the ids listed, or null if none " +
      "clearly matches. \"note\" is a short (<=140 char) factual summary in " +
      "their own words. \"mood\" is one lowercase word if a mood is expressed " +
      "(e.g. \"great\", \"tired\", \"proud\"), otherwise omit it. If the email " +
      "is unrelated or ambiguous, set habitId to null and completed to false.",
    `The user's habits:\n${list}\n\n` +
      `Email subject: ${emailSubject}\nEmail body:\n${emailBody.slice(0, 4000)}`,
  );
  const habitId =
    typeof result.habitId === "string" &&
    habits.some((h) => h.id === result.habitId)
      ? result.habitId
      : null;
  return {
    habitId,
    completed: result.completed === true,
    note: typeof result.note === "string" ? result.note.slice(0, 140) : "",
    mood: typeof result.mood === "string" ? result.mood : undefined,
  };
}

/** Generate a short, warm confirmation reply for a logged habit update. */
export async function generateConfirmationReply(
  habitName: string,
  streak: number,
  note: string,
): Promise<string> {
  const result = await chatJson(
    "Write a short (<=3 sentences), warm, specific confirmation reply email " +
      "for someone who just logged a habit update. Reply as JSON: " +
      '{"reply": string}. No subject line, no sign-off, plain text body only.',
    `Habit: ${habitName}\nCurrent streak: ${streak} day(s)\nWhat they logged: ${note}`,
  );
  return typeof result.reply === "string"
    ? result.reply
    : `Logged! Streak: ${streak} day(s).`;
}
