# Harness evidence

Failures caught while doing the work, what each cost, and the harness-level
fix.

## Inferences written up as observations in the ISIS journey doc

**What happened (2026-09-28).** Recording the real ISIS enrolment flow into
`docs/research/isis-enrolment.md`, the agent wrote friction points it had not
seen: on step 2, "a course code like COMP4020 isn't accepted here" and "the
browser Back button isn't a reliable way back"; on step 3, "COMP4020 becomes
Subject Area COMP plus Catalogue Number 4020" and "both show no options until
something above is chosen". None was tested. Each was a plausible guess about
PeopleSoft, phrased as fact. The agent caught them on re-reading and rewrote
them as marked inferences or "Not tested".

**What it cost.** Two rounds of edits; nothing shipped. The risk was larger:
the doc exists so later sessions design from it without logging in again, so
an untested guess there would have become a design premise nobody could trace
back to a guess.

**What would have caught it earlier.** A rule for research records: every
claim is either something seen on the page (quoted or screenshotted) or
labelled "inferred" / "not tested". Candidate for `CLAUDE.md` under
"Verifying your own work"; proposed, and the student chose not to promote it
(2026-09-28).

**It kept happening after the entry was written.** Steps 4, 6 and 7 each
went in with at least one claim past the evidence: a date-format generalisation
and an untested button behaviour (step 4), "the form is the same for Second
Semester" when that form was never captured (step 4a), an inferred click
sequence stated as fact (step 6), and "the first page that shows the course by
name" when step 4b's results had already named every course (step 7). Every
one was caught by re-reading the new step against the screenshot and tree
before reporting. Knowing the rule didn't prevent the slip; the per-step
re-read did. So the rule should name the check, not just the standard:
"after writing a research step, re-read each claim against its screenshot or
tree; label anything else inferred or not tested."

## A requisite message fell back to a bare course code

**What happened (2026-09-28).** The first run of `spec/rules.test.ts` failed
one test: COMP8600's refusal read "You need COMP6670 first." instead of naming
Introduction to Machine Learning. The namer only knew this session's
catalogue, and requisites routinely name courses offered in another session
(COMP6670 runs in Second Semester) or undergraduate equivalents. Every such
reason would have shown a code, the system identifier the ISIS research
faulted, and each code shown on `/enrol/` also counts against the spec's
two-mentions limit.

**What it cost.** One extra fetch (`src/data/titles.json`, 196 COMP titles
across 2026 and 2027) and a shared `courseName()` in `src/lib/names.ts`.
Caught before any page rendered it.

**What caught it.** A test written from the design rule ("name courses by
title, not code") rather than from the implementation: it asserted the
reason contains the title *and* not the code. The first assertion alone
would have failed without saying why; the negative one pinned it.

## Every refused enrolment returned 500

**What happened (2026-09-28).** `POST /api/enrolments` re-renders `/enrol/`
on a refusal via `ctx.rewrite()`. Typecheck and every test passed, but the
first HTTP smoke run against the built server returned 500 for all four
refusals (duplicate, unknown course, unmet prerequisite, over the load).
The log said why: Astro won't rewrite a request whose body has been read,
and the handler had read the form. Fixed by reading `request.clone()`.

**What it cost.** One rebuild. It would have cost more: the student's
contract test only asserts `status >= 400`, which a 500 satisfies, so once
the page existed the suite would have gone green on a crash.

**What caught it.** Exercising the endpoint over HTTP and reading the server
log, not just the status codes. Candidate sensor: a contract test that a
refusal is a 4xx *and not* a 5xx, alongside the student's `>= 400`.

## The first browser check opened a different repo's app

**What happened (2026-09-28).** `pnpm dev --port 4321` printed that it had
started, `curl localhost:4321/enrol/` returned a page, and agent-browser
screenshotted it. But this Astro version runs dev as a daemon and had moved
to **4322**, because 4321 was held by the assignment-2 repo's dev server,
left running since 17 Sep. The page on 4321 was assignment 2's. It was
caught only because the dev log said "running at http://localhost:4322".

**What it cost.** One discarded screenshot. Unnoticed, every browser check
would have measured another codebase and passed: the exact failure
CLAUDE.md's verification section exists for.

**What would have caught it earlier.** A rule: before a browser check, take
the URL from the dev server's own output (`astro dev status`), never from
the default port, and confirm the page's `<title>` is this app's.
Candidate for CLAUDE.md; not promoted without approval.

## The enrol confirmation vanished, sometimes

**What happened (2026-09-28).** The first real click on Enrol in the browser
landed on `/enrol/` with no "Enrolled in…" banner, though curl showed the
server redirecting to `/enrol/?enrolled=N`, and a second attempt worked. Cause:
the page listens on `/api/events` for `plan-changed` so *other* tabs refresh;
the submitting tab heard its own event mid-navigation and its
`location.reload()` sometimes beat the 303. Fixed by ignoring the event once a
POST form is submitted; then 5 of 5 enrol/undo cycles by real clicks showed
the banner with focus on it.

**What it cost.** Three browser runs. Every HTTP test passed throughout: the
bug only exists when a real page with a live event stream submits a form.

**What caught it.** Clicking through the rendered page and reading the URL
and focus afterwards, then repeating it: one success would have hidden a
race. Rule candidate: an intermittent result counts as a failure until it
passes repeatedly for a known reason.
