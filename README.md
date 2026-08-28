# InboxHabit

A real-time habit tracker you run by email. The app has one shared
AI-managed inbox (via [AgentMail](https://agentmail.to)); email it from the
address you registered and an LLM (via [Groq](https://groq.com)) works out
which of your habits you're reporting on, whether you completed it, and
updates your streak live. Once a day it emails you back a digest of the
habits you haven't done yet, with their tips and a line of encouragement.
Creating a habit can optionally crawl an inspiration URL with
[Firecrawl](https://firecrawl.dev) and turn it into a few short tips via the
same LLM.

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

Then set the API keys it needs (never commit these):

```bash
npx convex env set GROQ_API_KEY gsk_...              # free at console.groq.com
npx convex env set FIRECRAWL_API_KEY fc-...
npx convex env set AGENTMAIL_API_KEY am_us_...       # organization-scoped key
```

Create one AgentMail inbox for the app (dashboard or API) and record its
address so the backend can send replies from it:

```bash
npx convex env set AGENTMAIL_INBOX_ADDRESS you-picked-this@agentmail.to
```

Then run both the frontend and backend dev servers together:

```bash
npm run dev
```

## Wiring up the AgentMail webhook

Once `npx convex dev` has printed your deployment's HTTP Actions URL
(`https://<deployment>.convex.site`), add an **organization webhook** in
AgentMail (event `message.received`) pointing at:

```
https://<deployment>.convex.site/agentmail/webhook
```

The webhook identifies the user by the sender address (registered in the
dashboard) and asks the LLM which habit the email is about. `convex/http.ts`
parses the payload defensively (several possible field names) — check the
Convex function logs if a real email doesn't get picked up and adjust the
field lookups there.

## Project layout

```
convex/
  schema.ts           habits, entries, userSettings tables
  habits.ts            create habit (Firecrawl + LLM), list
  entries.ts           log a completion, streak calculation, live feed
  userSettings.ts      register/look up a user's email address
  settings.ts          expose the shared inbox address to the frontend
  http.ts              AgentMail inbound-webhook handler (sender -> user, LLM -> habit)
  crons.ts             schedule the daily digest
  digests.ts           build + send each user's daily reminder digest
  admin.ts             internal wipe helper for resetting a dev deployment
  lib/
    llm.ts             tips, habit-match-from-email, encouragement, replies
    firecrawl.ts        scrape a URL to markdown
    agentmail.ts        send an email from the shared inbox
src/
  App.tsx, components/  dashboard UI (EmailSetup, NewHabitForm, HabitCard)
  lib/userId.ts         anonymous local user id
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
