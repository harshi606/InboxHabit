# Hackathon log

- **Project:** InboxHabit
- **Event:** Convex All Gas Hackathon
- **What it does:** Real-time habit tracker: log progress by emailing a
  habit's dedicated AI inbox, and watch the streak update live.
- **Live app:** not deployed
- **Repo:** https://github.com/harshi606/InboxHabit
- **Frontend:** Convex static hosting
- **Convex deployment:** https://adventurous-swordfish-799.convex.cloud (dev)
- **Components:** none
- **Convex features:** schema, indexes, queries, mutations, actions, HTTP
  actions, realtime queries
- **Auth:** none
- **AI models:** gpt-4o-mini (default, overridable via `OPENAI_MODEL`)
- **Started:** 2026-08-27T21:27:21Z
- **Last updated:** 2026-08-28T20:09:31Z

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
