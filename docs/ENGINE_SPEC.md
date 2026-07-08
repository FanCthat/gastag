# PAPPS VENTURE ENGINE — MASTER SPECIFICATION
**Version 1.2 — July 2026** *(v1.1: pricing schema §3.1 added. v1.2: §8 Area Network Mode added — pull-only services directory layered above verticals)*
**Owner: Paul, Papps (Pty) Ltd**
**Purpose: The single document from which every QR-based vertical (GasTag, Taglinks, FOUND!T-adjacent, and all future verticals) is instantiated. Feed this spec plus a Vertical Config (§3) to Claude Code to stand up a new vertical.**

---

## 0. Operating principles (read first, apply everywhere)

1. **One engine, many skins.** A new vertical is a configuration, a landing page, and a domain — never a new codebase. All verticals run on the shared multi-tenant stack (Next.js / Prisma / Supabase / Vercel).
2. **The demo is the salesperson.** Every vertical ships with compressed-time demo mode and self-serve prospect onboarding from day one. No vertical launches without its `/demo/register` funnel.
3. **Automate everything except trust moments.** Human hours are reserved for: the follow-up call after a demo signup, the payment conversation, and relationship maintenance. Everything before and after is system.
4. **Payment gates activation.** No vendor goes live until payment is received. The Activate button is the commercial gate, always.
5. **Kill rules are written before launch.** Every vertical launches with pre-committed shutdown criteria (§6). No sentiment, no sunk cost.
6. **The prospect pipeline runs on the same nudge engine as the product.** The core competence is reminding people who forget; the sales pipeline is people who forget. Reuse the scheduler.

---

## 1. Core Product Engine (shared, vertical-agnostic)

### 1.1 Data model (Prisma, multi-tenant)

- **Vertical** — `id, slug, name, configJson` (the Vertical Config, §3). Top-level tenant dimension.
- **Vendor** — `id, verticalId, businessName, contactName, email, whatsapp, logoUrl, isDemo (default true), isActive (default false), activatedAt, createdAt`. A supplier/business customer.
- **Tag** — `id, vendorId, code (short unique), batchId, isDemo, status (unassigned | registered | retired)`. A physical QR unit (keyring, sticker, tag).
- **EndCustomer** — `id, vendorId, name, email, phone, addressText, createdAt`. The vendor's client who registers a tag.
- **Registration** — `id, tagId, endCustomerId, applianceJson / itemJson` (vertical-specific fields from config), `cycleEstimateDays, nextDueDate, status`.
- **ScheduledMessage** — `id, registrationId, sequenceStep, channel (email | whatsapp-future), scheduledFor, sentAt, templateKey, isDemo`.
- **Order** — `id, registrationId, vendorId, placedAt, detailsJson, status (new | acknowledged | fulfilled)`.
- **Prospect** — see §4 (prospecting engine shares the database).

Every table carries `vendorId` or resolves to one. Every query is tenant-scoped. Row-level security in Supabase where exposed to client-side reads.

### 1.2 Core flows

**Registration flow:** scan QR → `/r/[code]` → registration form (fields defined by Vertical Config) → create EndCustomer + Registration → compute reminder schedule from cycle estimate → enqueue ScheduledMessages → confirmation screen + email.

**Reminder sequence:** default three-step (early warning → approaching → due), offsets defined per vertical in config. Cron (Vercel cron or Supabase scheduled function) sends due messages. Each "due" message carries the transaction CTA.

**Transaction flow:** CTA in final reminder → `/order/[registrationId]` → one-tap confirm (details pre-filled) → Order created → vendor notified (email now, WhatsApp later) → cycle resets, next schedule enqueued using refined estimate.

**Prediction refinement:** actual reorder date vs predicted → adjust `cycleEstimateDays` per registration (simple exponential smoothing is sufficient at this scale).

### 1.3 Portals

- **Vendor dashboard** (`/vendor`): registrations, upcoming due list, orders inbox, basic stats. Login via magic link.
- **Admin** (`/admin`): all verticals, all vendors (demo vs live clearly separated), tag batch generation, Activate button, prospect pipeline view (§4.6), portfolio dashboard (§6).

### 1.4 Demo mode (per the GasTag build — now standard equipment)

- `isDemo` on Vendor cascades to tags, registrations, messages.
- Demo reminder sequence is user-paced: email 1 fires on registration; each demo email carries a "Receive your next demo email →" link (`/demo/next/[registrationId]`).
- Every demo email carries a banner: "🔬 DEMO — in live operation this email arrives {realOffset} before {dueEvent}."
- `/demo/register`: prospect self-onboarding. Creates demo Vendor + auto-generates 3–5 demo tags + notifies Paul. This page is the destination of ALL outreach (§4).
- **Activation** (admin, post-payment): wipes demo tags and demo client data; flips `isDemo → false, isActive → true`; sends welcome email with login; Paul then generates the real tag batch for physical production.

---

## 2. What stays human (do not automate)

1. Reply-handling on outreach. The system gets a prospect to raise a hand; a human answers.
2. The payment conversation and receipt confirmation.
3. Physical production orders (keyrings, stickers, tags) and supplier relationships.
4. Contract signature and anything with legal weight.
5. Any communication after a complaint or cancellation request.

The system may DRAFT for these moments (reply drafts, quote emails) but a human sends.

---

## 3. Vertical Config (the parameterization)

A new vertical = one JSON object + landing copy + domain. Schema:

```json
{
  "slug": "gastag",
  "name": "GasTag",
  "item": { "singular": "gas cylinder", "plural": "gas cylinders" },
  "unitNoun": "keyring",
  "vendorNoun": "supplier",
  "registrationFields": [
    {"key": "cylinderSize", "label": "Cylinder size", "type": "select", "options": ["9kg","19kg","48kg"]},
    {"key": "applianceUse", "label": "What do you use it for?", "type": "multiselect", "options": ["cooking","heating","geyser","braai"]}
  ],
  "cycle": { "mode": "estimated", "askUser": true, "defaultDays": 45, "refine": true },
  "reminders": [
    {"step": 1, "offsetDays": -42, "templateKey": "early", "demoLabel": "6 weeks before empty"},
    {"step": 2, "offsetDays": -21, "templateKey": "approaching", "demoLabel": "3 weeks before empty"},
    {"step": 3, "offsetDays": 0, "templateKey": "due", "demoLabel": "reorder day", "carriesOrderCTA": true}
  ],
  "orderFields": [],
  "pricing": { /* see §3.1 — full pricing schema, mandatory per vertical */ },
  "prospecting": { /* see §4.7 — vertical-specific prospecting parameters */ }
}
```

### 3.1 Pricing schema (mandatory — no vertical launches with pricing as "notes")

Every vertical config carries a full pricing block. The engine renders it into the demo welcome email, the activation invoice draft, and the portfolio dashboard revenue model. Nothing pricing-related is hard-coded.

```json
"pricing": {
  "currency": "ZAR",
  "hardware": {
    "model": "per-unit",
    "unitPrice": 15,
    "minimumBatch": 200,
    "billedTo": "vendor",
    "when": "on-activation",
    "notes": "physical unit (keyring/tag/sticker) production + margin; invoiced with first batch"
  },
  "service": {
    "model": "per-tag-per-year",
    "amount": 72,
    "when": "annual-in-advance",
    "billedTo": "vendor"
  },
  "collection": "manual-EFT",
  "demoIsFree": true
}
```

**Supported service models** (the engine must implement all; a vertical picks one):

| Model | Fits when | Example vertical |
|---|---|---|
| `per-tag-per-year` | Unit economics per physical tag are clear; moderate reorder frequency | GasTag, Taglinks (R72/tag/yr precedent) |
| `per-active-registration-monthly` | Tags churn or transfer; vendor should pay only for live customers | Pool chemicals |
| `flat-monthly` | Vendor values the channel more than per-unit accounting; simplest sell | Small single-branch suppliers, any vertical |
| `per-order-fee` | High reorder frequency, low transaction value — annual fees feel disproportionate | Hearing-aid batteries, coffee consumables |
| `per-tag-per-year-compliance` | Low frequency, high compliance/liability value — price against the risk, not the transaction | Fire-extinguisher recertification (the reminder IS the product; price accordingly, e.g. 2–4× the GasTag rate) |

**Pricing fit heuristic (apply when configuring a new vertical):** price the service against what the vendor loses when a customer silently defects or lapses — the retained-customer value — not against the cost of sending emails. High cost-of-lapse verticals (compliance, safety) bear premium pricing at low frequency; high-frequency low-value verticals need per-order or flat pricing to stay proportionate. If a plausible price can't be found under any model above, the vertical fails the fit test regardless of §3's four traits.

**v1 collection is manual (EFT against a drafted invoice; the Activate button remains the gate).** The schema's `collection` field exists so a gateway (Netcash/PayFast) can be slotted in later without config migration.

**Fit test before any new vertical is built** (all four must hold):
1. Predictable consumption/renewal cycle.
2. High cost or pain of running out / lapsing.
3. Supplier motivated to fund the physical QR unit.
4. Low natural engagement between purchases (the nudge adds real value).

Candidate queue (assessed, not committed): pool chemicals, water-filter cartridges, borehole servicing, fire-extinguisher recertification, hearing-aid batteries, coffee/consumables subscriptions.

---

## 4. Prospecting Engine (module — shares stack and scheduler with the product engine)

### 4.1 Data model additions

- **Prospect** — `id, verticalId, businessName, town, province, websiteUrl, mapsPlaceId, contactEmail, contactName, phone, source (maps | directory | referral | inbound), score, scoreReasons, status, optedOut (bool), createdAt`.
- **ProspectStatus enum:** `raw → qualified → contacted → replied → demo_registered → demo_active → negotiating → won → lost → opted_out`.
- **OutreachMessage** — `id, prospectId, sequenceStep, scheduledFor, sentAt, templateKey, opened (if trackable), replied`.

### 4.2 Stage 1 — List build (scripted, scheduled)

- Script: Google Places API text/nearby search per metro + radius, seeded by the vertical's `prospecting.searchTerms` (§4.7). Dedupe on placeId. Store as `raw` Prospects.
- Supplementary sources per vertical: industry association member lists, franchise directories (scraped or manually imported via CSV upload in admin).
- Budget note: Places API free tier first; thereafter ~USD 17 / 1,000 detail lookups. A national list for one vertical ≈ a few hundred rand, once-off.
- Runs on demand or monthly refresh cron.

### 4.3 Stage 2 — Enrichment & scoring (Anthropic API, batch)

- Script loops `raw` prospects: fetch website (if any), pass content + listing data to the API with the vertical's scoring rubric (`prospecting.scoringPrompt`).
- Output per prospect: `score 0–100`, `scoreReasons` (one line, human-readable — this line is reused in the outreach email), best contact email found (prefer role addresses like info@ over scraped personal addresses — POPIA posture).
- Prospects above `prospecting.scoreThreshold` move to `qualified`.
- Cost: API tokens; batch of hundreds ≈ tens of rands. Use a mid-tier model; verify current pricing at docs.claude.com before large runs.

### 4.4 Stage 3 — Outreach (automated send, human-gated replies)

- Infrastructure: dedicated outreach domain per portfolio (not per vertical) — e.g. `papps-intro.co.za`; SPF, DKIM, DMARC configured; warm-up period; volume ramp 20–30/day max.
- Sending via Resend or Postmark. Never from the production domain.
- Sequence (default, overridable in config):
  - **Touch 1:** personalised (uses `scoreReasons`), plain-text style, one CTA: the vertical's `/demo/register` link. Mandatory opt-out line.
  - **Touch 2 (+5 days, no reply):** short nudge, same CTA.
  - **Touch 3 (+7 more days, no reply):** final, softer ("if the timing's wrong, no problem — one line and I'll close the file"), then status → `lost` unless replied.
- **Hard rules:** opt-out honoured immediately and permanently (`optedOut = true`, suppressed portfolio-wide). Replies are NEVER auto-answered — they alert Paul (email + admin flag) with a drafted suggested reply for editing.
- POPIA posture: B2B legitimate-interest basis; role addresses preferred; opt-out in every message; suppression list respected across all verticals. (Not legal advice — Paul to sanity-check current guidance before first volume send.)

### 4.5 Stage 4 — Nurture (rides the product scheduler)

Trigger-based ScheduledMessages, same cron as product reminders:
- `demo_registered` but no tag scanned in 3 days → "Need a hand getting started?"
- Demo emails completed but no order placed in 4 days → "You've seen the reminders — want to see the order side?"
- Demo fully completed, no decision in 7 days → alert Paul: **this is a trust moment — phone call, not email.**

### 4.6 Pipeline view (admin)

Kanban or simple table by ProspectStatus per vertical: counts, ages, next action. The "replied" and "demo-completed-no-decision" columns are Paul's daily call list.

### 4.7 Prospecting parameters (per Vertical Config)

```json
"prospecting": {
  "searchTerms": ["gas supplier", "lpg refill", "gas cylinder exchange"],
  "geoSeed": ["Johannesburg","Pretoria","Durban","Cape Town","East Rand towns"],
  "scoringPrompt": "Score this business 0-100 as a GasTag prospect. High: delivers cylinders, mentions exchanges/refills, serves households, no visible ordering system. Low: bulk/industrial only, national chain with own app.",
  "scoreThreshold": 60,
  "outreachAngle": "your customers only call you when they've already run out",
  "sequenceOverrides": null
}
```

---

## 5. Instantiation procedure (the Claude Code run)

To launch a new vertical, open Claude Code in the engine repo and prompt:

> "Instantiate a new vertical from ENGINE_SPEC.md using the attached Vertical Config. Generate: (1) config record + migration if new fields needed, (2) registration form from registrationFields, (3) email templates for each reminder step including demo banners, (4) landing page copy from the outreachAngle, (5) prospecting scripts wired to the prospecting block. Do not fork any engine code — extend by configuration only. Flag anything the config cannot express instead of hard-coding."

Definition of done for a new vertical: `/demo/register` works end-to-end on a phone; demo emails arrive with correct banners; order flow completes; prospect list-build script runs against `searchTerms`; kill criteria (§6) recorded in the portfolio dashboard.

Target instantiation time: hours, not weeks. If a vertical needs engine changes, the change is made in the engine for all verticals or the vertical is rejected as a bad fit.

---

## 6. Portfolio governance

### 6.1 Portfolio dashboard (admin, one screen)

Per vertical: prospects contacted, demo registrations, activations (paid), MRR/ARR, support tickets or manual interventions this month, age since launch.

### 6.2 Kill rules (committed at launch, per vertical — defaults below, override in writing only BEFORE launch)

- **90 days, < 5 demo registrations** from ≥ 150 contacted prospects → pause outreach, review angle once, one revised campaign.
- **150 days, < 2 paying activations** → vertical is killed: outreach stops, landing page gets a sunset notice, existing paying vendors (if any) are honoured to term.
- **Any vertical whose human support load exceeds ~2 hours/week** without corresponding revenue → automate the load or kill the vertical. Support load is the silent portfolio killer.

### 6.3 Scale rule

A vertical earns investment (paid ads on the landing page, expanded geo, WhatsApp channel) only after **3 paying activations** — proof the funnel converts before money amplifies it.

---

## 7. Build sequence (recommended order)

1. **Extract the engine** from the current GasTag build: move vertical-specific values into the first Vertical Config (GasTag itself). GasTag becomes instance #1, not the codebase.
2. **Demo mode + activation gate** — already specified and approved in the GasTag session; build there, then generalise field names per §1.4.
3. **Prospect tables + admin pipeline view** (§4.1, §4.6).
4. **List-build script** for GasTag (§4.2) — first real national supplier list.
5. **Scoring script** (§4.3) against that list.
6. **Outreach domain + sending infra + sequence** (§4.4). Start at 20/day.
7. **Nurture triggers** (§4.5) — mostly re-pointing the existing scheduler.
8. **Portfolio dashboard + kill rules recorded** (§6).
9. Second vertical instantiation as the proof: if it takes more than a few days, the engine isn't extracted enough — fix the engine, not the vertical.

---

## 8. Area Network Mode (pull-only services directory)

An optional layer ABOVE verticals. An Area bundles providers in a demarcated geography into a single client-facing directory, reached by scanning ANY keyring issued in that area. Strictly pull: nothing is ever pushed or broadcast to clients through the directory. The only outbound messages in the entire system remain the vertical-specific reminders each client explicitly registered for.

### 8.1 Concept

- Every keyring in an Area is a **universal access token**: scanning it opens the client home page — the client's own registered services (if any) on top, the Area services directory beneath.
- The client's proposition: "whichever of our keyrings is on your keys, a vetted local plumber / electrician / locksmith is one scan away."
- The provider's proposition: "presence at the moment of urgent need, in front of every keyring-holding household in the area." Providers receive NO client contact data. Clients initiate every interaction (tap-to-call, tap-to-WhatsApp).

### 8.2 Data model additions

- **Area** — `id, name, slug, boundaryDescription, status (seeding | live | sunset), createdAt`.
- **Vendor** gains `areaId (nullable)` and `directoryCategory (nullable)`.
- **AreaCategorySlot** — `id, areaId, category, vendorId (nullable = open slot), exclusivity (true), priceBand, filledAt`. **One provider per category per area — hard constraint.** Open slots are themselves sellable inventory ("the electrician slot in Fourways is open").
- **Household** — dedupe layer: `id, areaId, phone/emailHash`. Registration dedupes on phone/email so one household with three keyrings is ONE node with multiple tokens. Report both numbers honestly: tokens in circulation AND unique households.
- **DirectoryEvent** — `id, areaId, tagId, categoryTapped, vendorTapped, action (view | call | whatsapp), timestamp`. The attribution log.

### 8.3 Provider types (both real, priced differently — see §8.5)

1. **Network seeders** — engine vendors (gas, pool, etc.) whose keyrings carry a reminder/reorder function. They buy keyring batches because the engine serves their business; their tokens populate the area.
2. **Presence buyers** — urgency trades (plumber, electrician, locksmith, pest control, glazier, tow) with no consumption cycle. They pay for a directory slot. Keyring purchase is OPTIONAL for them: their own branded batch adds tokens and keychain advertising, but a presence buyer may rationally hold a slot with zero keyrings once seeders have populated the area.

### 8.4 Scan resolution (extends §1.2)

`/r/[code]` in an area-enabled tag resolves to the **client home page**:
- Unregistered tag → registration prompt for the issuing vendor's vertical (if the tag has one) + directory visible immediately (the directory works before, during, and independent of registration).
- Registered → client's services/status on top (e.g. gas next-due, reorder button), directory beneath.
- Pure-token tags (presence buyer's keyrings, no vertical) → directory directly, issuer's branding headlining.
Issuing vendor's logo always headlines the page — the freebie keyring remains their ambient brand vehicle.

### 8.5 Pricing (extends §3.1 — line items are separable)

- **Keyring batch**: per §3.1 hardware (e.g. R15/unit, min 200) — seeders always; presence buyers optionally.
- **Directory slot fee**: monthly or annual per AreaCategorySlot; priced on exclusivity and area maturity.
- **Engine service fee**: per §3.1, only for vendors using reminder/reorder functionality.
- **Cold-start ladder**: slots 1–3 in a new area priced low or free-for-6-months (a directory of one is worth little); premium loads onto later slots once the network is demonstrably alive. The anchor tenant is always an engine vendor (gas first — the product exists today).
- Retention engine for slot fees = the monthly attribution report from DirectoryEvent: "31 taps, 14 calls initiated from Fourways keyrings." Seeders get the mirror stat: "your keyrings generated N directory uses" — justifying batch reorders.
- Future option (not v1): per-lead pricing from DirectoryEvent data.

### 8.6 Privacy posture

Pull-only by design. Providers never receive client data; there is no shared contact pool; no directory-driven outbound exists. POPIA exposure is confined to the vertical reminders each client opted into at registration. This is a feature — sell it to both sides.

### 8.7 Area governance (extends §6)

- An Area launches only with a committed anchor seeder (signed + paid).
- **Area kill rule**: fewer than 4 filled category slots within 120 days of anchor launch → area is sunset (slots refunded pro-rata, directory page carries a notice, keyrings keep their vertical function). Sunset before it embarrasses the brand.
- Portfolio dashboard gains an area dimension: slots filled/open, tokens circulating, unique households, DirectoryEvents/month.

### 8.8 Prospecting in area mode (extends §4)

Sequence per area: (1) land the anchor gas supplier with the standard GasTag funnel; (2) once tokens are circulating, prospect the urgency trades using the area's live numbers ("N households in {area} carry a keyring that opens this directory — the plumber slot is open, exclusively"); (3) scoring rubric per category prioritises single-area operators over franchises (exclusivity means more to them). Slot scarcity is the outreach angle; open slots per area are the inventory list.

---

*End of spec. Version-control this file in the engine repo root. All changes by amendment with date and reason — the spec is the genome; treat mutations deliberately.*
