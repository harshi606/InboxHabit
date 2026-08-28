# Hackathon log

- **Project:** InboxHabit
- **Event:** Convex All Gas Hackathon
- **What it does:** Real-time habit tracker run by email: log progress by
  emailing the app's shared AI inbox (streak updates live), and get a daily
  digest emailed back for the habits still to do.
- **Live app:** not deployed
- **Repo:** https://github.com/harshi606/InboxHabit
- **Frontend:** Convex static hosting
- **Convex deployment:** https://adventurous-swordfish-799.convex.cloud (dev)
- **Components:** none
- **Convex features:** schema, indexes, queries, mutations, actions, realtime
  queries, crons / scheduled functions
- **Auth:** none
- **AI models:** openai/gpt-oss-120b via Groq (default, overridable via
  `GROQ_MODEL`)
- **Started:** 2026-08-27T21:27:21Z
- **Last updated:** 2026-08-28T21:48:00Z

## Log

### 2026-08-27 - 9aa849d
Set up the project for the hackathon: registered the Convex MCP server,
installed the hackathon build-log skill, and created this log. No product
code yet.

### 2026-08-28 - 33098c6
Built the InboxHabit app end to end. Convex schema for habits and entries
with streak tracking (`convex/schema.ts`). Habit creation optionally crawls
an inspiration URL with Firecrawl, summarizes it into tips with OpenAI, and
provisions a per-habit AgentMail inbox (`convex/habits.ts`,
`convex/lib/firecrawl.ts`, `convex/lib/openai.ts`, `convex/lib/agentmail.ts`).
An HTTP webhook parses inbound AgentMail emails with OpenAI, logs
completions, and sends a confirmation reply (`convex/http.ts`). Live React
dashboard shows streaks, tips, the habit's inbox address, and a real-time
activity feed (`src/App.tsx`, `src/components/HabitCard.tsx`,
`src/components/NewHabitForm.tsx`). Not yet linked to a live Convex
deployment.

### 2026-08-28 - 0b2882b
Linked the project to its first live Convex deployment
(`adventurous-swordfish-799`, dev) and pushed the schema and all functions;
the four table indexes and the `/agentmail/webhook` HTTP action are live.
Committed the generated `convex/_generated/` client. Fixed a build break:
`convex/_generated/api.d.ts` pulls the backend modules (which read
`process.env`) into the frontend's type graph, so `npm run build` failed
with "Cannot find name 'process'" until `"node"` was added to
`tsconfig.app.json` types. Set the real page `<title>` in `index.html`.
Verified against the deployment: creating a habit and logging a completion
advance `currentStreak` and append to the live activity feed. API keys
(OpenAI, Firecrawl, AgentMail) not yet set, so tip generation and inbox
provisioning still fall back to their warnings.

### 2026-08-28 - 87b5665
Wired the three integrations against the live deployment. Firecrawl scraping
works. AgentMail needed an organization-scoped key (an inbox-scoped one
can't create inboxes); with it, `habits.create` now provisions a real
per-habit inbox. Fixed `convex/lib/agentmail.ts`: AgentMail rejects a
`display_name` containing ":", so `InboxHabit: <name>` always 400'd — the
name is now built from letters, numbers, spaces and hyphens only.
Registered an organization-wide AgentMail webhook (event `message.received`)
pointing at `https://adventurous-swordfish-799.convex.site/agentmail/webhook`;
a simulated inbound payload confirmed the handler parses the recipient,
looks up the habit, and reaches the OpenAI extraction step. OpenAI is the
remaining blocker: both keys provided have an exhausted credit balance, so
tips, inbound-email parsing, and confirmation replies error at the API and
fall back to their warnings/500s until the account is funded. The webhook
endpoint currently runs unauthenticated (`AGENTMAIL_WEBHOOK_SECRET` unset);
AgentMail signs with Svix, which the shared-secret check in `http.ts`
doesn't yet verify.

### 2026-08-28 - 8e26f2b
Switched the LLM provider from OpenAI to Groq, whose free API key needs no
billing (both OpenAI keys available for this project had an exhausted
credit balance). `convex/lib/openai.ts` became `convex/lib/llm.ts` and now
calls Groq's OpenAI-compatible chat-completions endpoint
(`openai/gpt-oss-120b`, key `GROQ_API_KEY`, model overridable via
`GROQ_MODEL`); the request/response shape and the four exported helpers
(`summarizeTips`, `generateGenericTips`, `extractHabitUpdate`,
`generateConfirmationReply`) are unchanged, so `habits.ts` and `http.ts`
only needed their import path updated. README and this log updated to match.

With all keys set, the app is verified working end to end against the live
deployment:

- **Create habit** — Firecrawl scrapes the inspiration URL, Groq turns it
  into tips grounded in that page, AgentMail provisions a per-habit inbox.
- **Log today** (manual) — streak and the live activity feed update.
- **Log by email** — a `message.received` webhook from AgentMail is parsed
  by Groq into completed/note/mood, the completion is recorded (streak
  advances, feed shows `source: email` with the mood and subject), and a
  Groq-written confirmation reply is sent back from the habit's inbox.

Known limitations: AgentMail free tier caps at 3 inboxes; the webhook
endpoint is unauthenticated (`AGENTMAIL_WEBHOOK_SECRET` unset, and the
shared-secret check in `http.ts` doesn't implement AgentMail's Svix
signatures); the frontend is not yet published.

### 2026-08-28 - e90cd37
Replaced per-habit AgentMail inboxes with a single shared app inbox
(`AGENTMAIL_INBOX_ADDRESS`), because the free tier caps at 3 inboxes. New
`userSettings` table (`convex/userSettings.ts`) stores each anonymous user's
email; `convex/settings.ts` exposes the shared inbox address to the
frontend; a new `EmailSetup` component (`src/components/EmailSetup.tsx`)
lets the user register their address. The inbound webhook
(`convex/http.ts`) now resolves the sender address to a user, then asks the
LLM (`matchHabitUpdate` in `convex/lib/llm.ts`, replacing
`extractHabitUpdate`) which of that user's habits the email is about.
`convex/lib/agentmail.ts` lost `createInbox`; `sendReply` now sends from the
shared inbox. `habits` schema dropped `inboxAddress` / `inboxId` and the
`by_inboxAddress` index. Added `convex/admin.ts` (`wipe` internal mutation)
to reset a dev deployment.

Verified end to end: user registers `ppvh2018@gmail.com`, creates "Morning
run" and "Read 20 pages"; an email "went for a 2 mile run this morning"
from that address logs *Morning run* only (streak -> 1, mood "energized"),
a confirmation reply is sent from `inboxhabit@agentmail.to`, and both an
unknown sender and an unrelated email from the registered address are
accepted with 200 and no log.

### 2026-08-28 - 340f9cc
Added a proactive daily reminder digest. A Convex cron (`convex/crons.ts`,
13:00 UTC) runs `internal.digests.sendDaily` (`convex/digests.ts`): for
every registered user it collects the habits not yet completed that day
and, if any, emails one digest — an LLM-written encouragement line
(`generateEncouragement` in `convex/lib/llm.ts`), then each habit with its
streak and tips, and a "reply to log" footer. `convex/lib/agentmail.ts`'s
send helper was renamed `sendReply` -> `sendEmail` and is now shared by the
digest and the inbound confirmation. First Convex component-free scheduled
job in the app. Verified by running `digests:sendDaily` directly: a due
habit produced a "Your habits for today 🌱" email to the registered
address; users with everything done get nothing.

### 2026-08-28 - abdaf52
Replaced the inbound webhook with polling. AgentMail's `message.received`
webhook fired for one test email and silently never fired for the next, so
`convex/http.ts` (and the AgentMail webhook registration) were removed. A
new 1-minute cron runs `internal.inbound.poll` (`convex/inbound.ts`):
`listInboxMessages` fetches the last 20 messages from the shared inbox, and
each non-sent one goes through `handleMessage` — `claim` (insert into the
new `processedEmails` table, false if already there) gates the work, then
the same sender->user + LLM->habit routing, record, and confirmation reply.
`extractEmail` moved from `http.ts` into `inbound.ts`. Verified live: the
cron picked up a real Gmail message ("Did gym for 1 hour"), matched the
*gym* habit, logged an `email` entry, and replied "Re: habit update" —
within a minute, no webhook involved. HTTP actions dropped from the Convex
feature list.

### 2026-08-28 - 96a3fef
Confirmation replies now report the real post-log streak (`applyCompletion`
returns it) instead of `currentStreak + 1`, which over-counted a same-day
re-log (`41eb08f`). Then a full dashboard redesign (`src/index.css` +
components): warm-paper / rich-dark theme tokens, Inter, gradient header;
habit cards get a flame streak pill that heats up (cold/warm/hot), a
done-today state, a best/logged meta row, and tips as a real list; activity
feed gets source badges, mood chips and tabular times; the email-setup card
gets a grey/green status dot. Fluid container, responsive under 560px.
