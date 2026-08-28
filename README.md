# InboxHabit

A real-time habit tracker you can update by email. Every habit gets its own
AI-managed inbox (via [AgentMail](https://agentmail.to)) — email it to log
progress, and [OpenAI](https://openai.com) reads the email, decides whether
you completed the habit, and updates your streak live. Creating a habit can
optionally crawl an inspiration URL with [Firecrawl](https://firecrawl.dev)
and turn it into a few short tips via OpenAI.

Built for the Convex All Gas Hackathon on [Convex](https://convex.dev).

## Stack

- **Frontend:** Vite + React 19 + TypeScript, live-updating via Convex
  React hooks (no polling — data pushes to the browser).
- **Backend:** Convex (`convex/`) — schema, queries/mutations/actions, and
  an HTTP endpoint that receives AgentMail's inbound-email webhook.
- **Auth:** none. Each browser gets a random id in `localStorage` that
  scopes its own habits — good enough for a hackathon demo, not for
  production.

## One-time setup

This repo's `convex/` code is fully written, but it isn't linked to a real
Convex deployment yet — that has to happen from a machine that can reach
convex.dev (this can't be done from every environment; see note below).

```bash
npm install
npx convex dev
```

The first run will prompt you to log in (opens a browser) and create a
Convex project. It writes `CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL` into
`.env.local` (gitignored) and generates `convex/_generated/`. Leave it
running, or stop it with Ctrl+C once it says the deployment is ready.

Then set the three API keys it needs (never commit these):

```bash
npx convex env set OPENAI_API_KEY sk-...
npx convex env set FIRECRAWL_API_KEY fc-...
npx convex env set AGENTMAIL_API_KEY am-...
```

Then run both the frontend and backend dev servers together:

```bash
npm run dev
```

## Wiring up the AgentMail webhook

Once `npx convex dev` has printed your deployment's HTTP Actions URL
(`https://<deployment>.convex.site`), configure AgentMail (per-inbox or
account-wide, depending on their current dashboard) to POST inbound-message
events to:

```
https://<deployment>.convex.site/agentmail/webhook
```

`convex/http.ts` parses that payload defensively (several possible field
names) since it was written without being able to browse AgentMail's live
docs — check the Convex function logs if a real email doesn't get picked up
and adjust the field lookups there to match what's actually sent.

## Project layout

```
convex/
  schema.ts          habits + entries tables
  habits.ts           create habit (Firecrawl + OpenAI + AgentMail), list
  entries.ts           log a completion, streak calculation, live feed
  http.ts              AgentMail inbound-webhook handler
  lib/
    openai.ts           chat completion helpers (tips, email parsing, replies)
    firecrawl.ts         scrape a URL to markdown
    agentmail.ts         create an inbox, send a reply
src/
  App.tsx, components/  dashboard UI
  lib/userId.ts          anonymous local user id
```

## Deploying the frontend

The hackathon submission uses Convex's static hosting component
(`Frontend: Convex static hosting` in `hackathon.md`):

```bash
npm install @convex-dev/static-hosting
npx @convex-dev/static-hosting setup
```

Follow the setup command's printed instructions, then `npx convex deploy`
to publish. The live URL will look like `https://<deployment>.convex.site`.
