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
