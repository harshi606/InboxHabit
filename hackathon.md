# Hackathon log

- **Project:** InboxHabit
- **Event:** Convex All Gas Hackathon
- **What it does:** Real-time habit tracker: log progress by emailing a
  habit's dedicated AI inbox, and watch the streak update live.
- **Live app:** not deployed
- **Repo:** https://github.com/harshi606/InboxHabit
- **Frontend:** Convex static hosting
- **Convex deployment:** not deployed
- **Components:** none
- **Convex features:** schema, indexes, queries, mutations, actions, HTTP
  actions, realtime queries
- **Auth:** none
- **AI models:** gpt-4o-mini (default, overridable via `OPENAI_MODEL`)
- **Started:** 2026-08-27T21:27:21Z
- **Last updated:** 2026-08-28T18:43:42Z

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
