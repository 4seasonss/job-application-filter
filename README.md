# New Grad Filter

Ranks the software-engineering postings on [newgrad-jobs.com](https://www.newgrad-jobs.com/)
against a configurable profile, and shows *why* each posting survived the filter.

The upstream board lists ~1,375 SWE roles with no meaningful filtering. For a
candidate with fixed constraints — a graduation year, a visa status, no prior
full-time experience — most of those are noise. This narrows them and explains
every ranking decision it makes.

## How the data gets here

newgrad-jobs.com is a Webflow shell. The listings themselves live in **public
Airtable shared views**, one base per category, embedded as iframes. So there is
no scraping and no HTML parsing: [`src/server/airtable.js`](src/server/airtable.js)
performs the same handshake the embed does (scrape the prefetch descriptor from
the embed page, replay the signed request) and gets structured JSON back — all
1,375 rows in a single request, roughly 600ms.

Upstream gives us: title, company, location, salary, date, apply URL, work
model, company size, industry, an H1b sponsorship guess, a new-grad tag, and a
free-text qualifications list.

**This is the one fragile part of the project.** The endpoint is internal and
undocumented, so it can change shape without warning. It is deliberately
isolated in that single file — if the board breaks, that is the only thing to
fix. Category IDs for all 23 upstream categories are in
[`src/config/sources.js`](src/config/sources.js); the MVP pulls `swe` only.

## Syncing — why there is no cron job and no database

`/api/jobs` fetches upstream on demand and returns:

```
Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400
```

Vercel's CDN is the sync mechanism. The first request after an hour refreshes
in the background while every other visitor is served instantly from cache, so
nobody ever waits on the upstream fetch. No cron, no storage, no scheduled job
to babysit.

This is also *more* frequent than cron would give you: Vercel's Hobby tier
limits cron jobs to roughly daily triggers, while cache revalidation has no such
limit. And hourly is already generous — upstream aggregates hourly, but postings
stay live for weeks.

## The filtering model

Two layers, kept deliberately separate:

**Knockouts** — reasons a posting is genuinely unapplicable. Hard filters only
run on things that actually disqualify you, because the upstream data is full of
unknowns and filtering on an unknown throws away real matches.

**Match points** — everything else. Ranking degrades gracefully instead of
emptying the board.

### What the data actually looks like

These distributions drove the design, and they are worth knowing before you
tighten anything:

| Field | Reality |
|---|---|
| `H1b Sponsored` | `not sure` 714 · `no` 652 · **`yes` 9** |
| `Is New Grad` | `yes` 389 · blank 986 |
| Experience | 77% ask for none · only 4% want 2+ years |
| Work model | On Site 959 · Hybrid 303 · Remote 113 |

Two consequences the UI warns about inline:

- **"Confirmed sponsors only" is a trap.** Nine postings out of 1,375 say `yes`.
  The useful rule is *exclude the explicit no's*, which leaves ~723.
- **A blank new-grad tag means unlabeled, not "not a new grad."** Gating on it
  discards 70% of the board sight-unseen, so it boosts by default instead.

### Reading the requirements text

The schema is thin, so [`src/lib/enrich.js`](src/lib/enrich.js) mines the
qualifications prose for what the columns miss:

- **Minimum years of experience** — takes the lowest figure mentioned near the
  word "experience", since postings pair a hard floor with a softer "5+
  preferred" and the floor is what gates you.
- **Citizenship and clearance requirements** — "must be a US citizen", security
  clearance, ITAR. This catches postings the sponsorship column rates `not sure`
  but which are closed to a visa holder regardless.
- **Explicit sponsorship refusals** in prose.
- **Graduation years** named in the posting, e.g. "2027 Start".
- **Graduate degree requirements**, counted only when no bachelor's alternative
  is offered.

### Scoring

Role lanes in [`src/config/profiles.js`](src/config/profiles.js) are weighted
keyword sets scored against title + qualifications. The best-matching lane
counts fully and the runner-up counts 30%, so a posting spanning two of your
strengths outranks one hitting a single lane. Each lane is capped so a
keyword-stuffed posting can't swamp a genuinely good match.

On top of the lanes: new-grad tag, graduation-year match, confirmed sponsorship,
work model, location, recency, salary presence — minus penalties for experience
and degree requirements beyond your configured maximum.

Every point a posting earns or loses comes back as a labelled chip on the card.
A ranked list you can't interrogate is one you can't trust or tune.

## Onboarding and resume parsing

First-time visitors get a landing page and a three-step setup: resume, then
eligibility, then what kind of work they want. Returning visitors skip straight
to their board.

**The resume is parsed entirely in the browser and never uploaded.** pdf.js
extracts the text, [`src/lib/resume.js`](src/lib/resume.js) scores it against
the same keyword lanes used to score postings, and only the conclusions are
kept — lane weights, matched skills, graduation year. A resume carries a name,
a phone number and an address; uploading it would create a real breach surface
in exchange for keywords that can be pulled out locally in well under a second.

Using one vocabulary for both sides is what makes the result legible: the terms
that set your weights are the same terms that light up on a job card.

### Word boundaries matter more than they sound like they do

Matching is boundary-aware ([`src/lib/match.js`](src/lib/match.js)), not raw
substring matching. Substring matching silently corrupts scoring in ways that
are easy to miss:

| Term | Falsely matches |
|---|---|
| `java` | Java**Script** |
| `rust` | t**rust** |
| `css` | S**CSS** |
| `sql` | Postgre**SQL** |

`java` alone mis-scored 61 of the 1,375 postings. A trailing `*` marks a prefix
stem, so `containeriz*` covers containerize and containerization, and reports
back whichever word it actually found.

## No accounts, nothing stored

There is no sign-up, no database and no server-side storage of anything about
you. Your setup lives in your own browser's `localStorage`, and your resume is
read in the tab you dropped it into and then discarded.

That is a deliberate MVP choice rather than a missing feature: with nothing
leaving the device, there is no personal data to secure and no breach to have.
The only server-side code in the project is a cache in front of a public job
board.

If you want a hosted multi-user version, the **`public-version`** branch carries
a full account layer — a landing page, Supabase email/password and Google
sign-in, and per-user profile rows behind row-level security. It is kept
separate on purpose, because running it means taking on responsibility for
other people's data.

## Using it for yourself

Fork or clone the repo, run it locally, and tune it to your own background:

1. `npm install && npm run dev`
2. Drop your resume into the setup flow — it is parsed in your browser and sets
   your role weights automatically.
3. Adjust anything you disagree with in the sidebar; it persists.

To change the ranking model itself rather than its settings, edit
[`src/config/profiles.js`](src/config/profiles.js) — the keyword lanes are plain
data, and adding a term or a whole new lane needs no changes to the scoring
engine.

Deploying your own copy is a Vercel import away, with no environment variables
and no services to provision.

## Configuration

Everything is editable in the UI and persists to this browser — no redeploy to
retune. The defaults suit a 2027 graduate who needs visa sponsorship, and the
presets ("US authorized", "Show everything") cover other situations. Every
weight, lane and filter is adjustable.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173 — /api/jobs is mounted on the dev server
npm run build
npm run lint
```

Deploy to Vercel as-is. It auto-detects the Vite build and serves `api/jobs.js`
as a serverless function. There are no environment variables and no external
services to configure.

## Layout

```
api/jobs.js             fetch + normalize + cache headers
src/server/airtable.js  the upstream handshake (the fragile part)
src/lib/enrich.js       requirements-text mining
src/lib/match.js        boundary-aware keyword matching
src/lib/scoring.js      knockouts + match points (pure, no React)
src/lib/resume.js       in-browser PDF parsing + profile derivation
src/lib/store/          localStorage persistence
src/config/             sources, role profiles, default config
src/components/         Landing, Onboarding, JobBoard, FilterPanel, JobCard
```

## Known limits

- SWE category only. Adding more is one line in `DEFAULT_CATEGORIES`, at the
  cost of a slower refresh and more noise.
- No application tracking (applied / dismissed / saved) — by design.
- Settings live in one browser and don't follow you to another device. The
  `public-version` branch is where that gets solved.
- Resume parsing handles PDF and plain text. `.docx` falls back to pasting the
  text in.
- Keyword lanes are a fixed vocabulary. They are tunable, not clever: a skill
  nobody listed as a term is a skill the ranking cannot see.
- Upstream location strings are free text, so location filtering is substring
  matching rather than real geocoding.
- The Airtable endpoint is internal and undocumented. It is isolated in one
  file so a break is one file to fix, but it *will* break eventually.
