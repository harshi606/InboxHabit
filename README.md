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
  crons that poll the inbox and send the daily digest.
- **Auth:** email + password via [`@convex-dev/auth`](https://labs.convex.dev/auth).
  Your account email is also the address you log habits from.

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

Generate the auth signing keys (no interactive wizard needed) and set them
plus `SITE_URL`:

```bash
node -e 'import("jose").then(async({generateKeyPair,exportPKCS8,exportJWK})=>{const k=await generateKeyPair("RS256",{extractable:true});const priv=await exportPKCS8(k.privateKey);const pub=await exportJWK(k.publicKey);process.stdout.write(JSON.stringify({JWT_PRIVATE_KEY:priv.trimEnd().replace(/\n/g," "),JWKS:JSON.stringify({keys:[{use:"sig",...pub}]})}))})' > .auth-keys.json
npx convex env set "JWT_PRIVATE_KEY=$(node -e 'process.stdout.write(require("./.auth-keys.json").JWT_PRIVATE_KEY)')"
npx convex env set "JWKS=$(node -e 'process.stdout.write(require("./.auth-keys.json").JWKS)')"
npx convex env set SITE_URL http://localhost:5173
rm .auth-keys.json
```

Then run both the frontend and backend dev servers together:

```bash
npm run dev
```

## Inbound email

There's nothing to wire up. A Convex cron polls the shared inbox once a
minute (`convex/inbound.ts`), and for each new message: resolves the sender
to a registered user, asks the LLM which of their habits it's about and
whether it's done, records the completion, and sends a confirmation reply.
Each message id is stored in `processedEmails` so it's handled once.

(AgentMail also offers real-time webhooks, but delivery is unreliable on the
free tier, so polling is the primary path.)

## Project layout

```
convex/
  schema.ts           auth tables + habits, entries, processedEmails
  auth.ts             Convex Auth config (email + password)
  auth.config.ts      JWT issuer config (the #1 auth footgun — always present)
  http.ts             Convex Auth's .well-known / token routes
  users.ts            me(), byEmail() for routing inbound mail
  habits.ts           create habit (Firecrawl + LLM), list
  entries.ts           log a completion, streak calc, live feed, weekly grid
  settings.ts          expose the shared inbox address to the frontend
  inbound.ts           poll the inbox, route each email (sender -> user, LLM -> habit)
  crons.ts             schedule the inbox poll + the daily digest
  digests.ts           build + send each user's daily reminder digest
  admin.ts             internal wipe helper for resetting a dev deployment
  lib/
    llm.ts             tips, habit-match-from-email, encouragement, replies
    firecrawl.ts        scrape a URL to markdown
    agentmail.ts        send an email from the shared inbox
src/
  App.tsx              auth gate: SignIn vs Dashboard
  components/           SignIn, Dashboard, WeeklyProgress, NewHabitForm, HabitCard
  lib/palette.ts        per-habit colour
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
