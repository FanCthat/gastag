@AGENTS.md

# Working with Paul — read this every session

Paul is NOT technical. He does not know how to use git, the command line, Supabase, or Vercel beyond basic navigation. Every session, follow these rules:

1. **Do everything you are technically able to do yourself.** Do not hand Paul technical steps you could perform. Push branches, run deployments, trigger jobs — do them yourself.
2. **The ONE thing Paul must do manually is run SQL in Supabase**, because you cannot access his Supabase directly. When SQL is needed: give him the exact SQL to copy and paste, tell him precisely where to paste it (Supabase → SQL Editor), and tell him what result to expect. Nothing else should be handed to him as a manual technical task.
3. **When Paul must do anything in a tool (Supabase, Vercel), spell it out step by step** assuming zero technical knowledge — where to click, what to type, what he'll see. Never assume he knows how.
4. **Always tell Paul explicitly whether he is working in Preview or Production**, and give the full URL so he can confirm where he is.
5. **When you find a bug or anomaly, do not gloss over it and move on.** Find the root cause, check how widespread it is, and tell Paul whether it affects other records or customers — before continuing. Never reassure him something is "just one record" until you've actually verified that.
6. **Nothing goes to Production until Paul has tested it on Preview and signed off.** Production deploys only via merge to main — never direct promotion in the Vercel dashboard.

---

# CLAUDE.md — Papps Venture Engine

## What this repo is
Multi-tenant QR-service engine (Next.js / Prisma / Supabase / Vercel, auto-deploy on git push).
One engine, many verticals: GasTag (live build), Taglinks, future verticals per config.
The engine is the product. Verticals are configurations, never forks.

## Authoritative documents (read before structural work)
- @docs/ENGINE_SPEC.md — the genome. All verticals instantiate from it. If a task
  conflicts with the spec, STOP and say so; propose a spec amendment rather than
  silently diverging. Spec changes are made by versioned amendment with date + reason.
- @docs/COMMERCIAL.md — current pricing, deal terms, live decisions with dates.
  Treat anything pricing-related found elsewhere (old code, old docs, chat memory)
  as stale; this file wins.

## PRODUCTION SAFETY — overrides everything below
GasTag is LIVE with real paying clients. Their reminders, reorder flow, and
dashboard must never degrade. Therefore:
- Never modify or delete rows belonging to a live vendor (isDemo=false) or their
  clients, registrations, or scheduled messages. If a task seems to require it,
  stop and ask.
- Schema changes are ADDITIVE ONLY (new tables, new nullable columns). Anything
  that alters or drops existing columns/tables: draft the SQL, explain the risk,
  and wait — Paul runs it manually after a Supabase backup. Never run destructive
  SQL yourself. Schema changes go via schema.prisma + the Supabase SQL editor
  only — never prisma migrate (dev or deploy). The Vercel build runs only
  `prisma generate`, which has no database contact.
- Do not modify the existing reminder cron logic while building new features.
  New scheduled jobs get their own functions; shared code paths that the live
  reminder flow touches require an explicit warning before editing.
- EMAIL GUARD: all new email-sending code must check environment and vendor
  status. In development/preview, every outgoing email is redirected to Paul's
  own inbox regardless of addressee. Prospecting/outreach mail sends ONLY from
  the dedicated outreach domain and service key — never from the production
  GasTag sender. A test email reaching a real client is a sev-1 failure.
- All new work happens on a branch and is verified on a Vercel preview
  deployment before merging to the production branch.
- Before starting any multi-step build, state in one line which live code paths
  the work will touch. "None" is the expected answer for prospecting work.

## Hard rules
- All outgoing email must use `sendEmail()` from `lib/email.ts`. No direct
  `emails.send()` calls anywhere else in the codebase. `sendEmail()` is the
  single choke point for the environment guard (`GUARD_EMAIL`), subject
  prefixing, and Resend integration. Adding a new email send anywhere else
  is a sev-1 violation of the production-safety rules above.
- Never fork engine code for a vertical. If a vertical needs something the config
  can't express, flag it — the fix goes in the engine for all verticals or not at all.
- Every table is tenant-scoped (vendorId or resolves to one). No cross-tenant reads.
- Directory/area features are PULL-ONLY. Never build any feature that pushes or
  broadcasts to clients, or exposes client contact data to providers. The only
  outbound comms are vertical reminders the client explicitly registered for.
- isDemo/isActive gates are commercial controls: activation happens only via the
  admin Activate action (post-payment). Never auto-activate. Activation wipes demo
  tags and demo client data; vendor profile carries over.
- Outreach/prospecting code: opt-outs are honoured portfolio-wide and permanently;
  replies are never auto-answered — draft for Paul, flag, stop.
- Migrations: propose the SQL, explain the risk, wait for Paul to run it in the
  Supabase SQL editor. Never use prisma migrate (dev or deploy) — the workflow
  is schema.prisma edit → SQL drafted here → Paul runs it → prisma generate
  regenerates the client.

## Working style
- Make minimal changes; do not refactor unrelated code.
- One logical change per commit, descriptive messages.
- When unsure between two approaches, present both with trade-offs and let Paul choose.
- After code changes: run the type check and existing tests before declaring done.
- Prefer boring, maintainable solutions — this is a solo-operated portfolio;
  every clever abstraction is future support load for one person.
- UI copy: South African English, plain and warm, no jargon. Currency is ZAR ("R").
- Emails: every template must work on a cheap Android phone; demo emails always
  carry the demo banner per spec §1.4.

## Context about the operator
Paul is the sole operator and is non-full-time-technical: explain what you did and
why in plain language after each work block, and keep the "what to test manually"
list short and concrete. His hours are reserved for sales calls and payment
conversations — anything that adds recurring manual work to his week must be
flagged as such before building it.
