# Process overview

## What I built

A replacement for ISIS's add-a-course flow for First Semester 2027: search
real ANU computing courses, see whether you can take each one before you
press anything, enrol in one step, and watch your plan and week update.
`README.md` says what good means here.

## How I got here

I started from evidence, not ideas. I logged into ISIS in a browser window
the agent opened, and had it record every screen of adding a course
([`9dfe024`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-dongyangli6816/commit/9dfe024)):

> Click save.

and, when it paused to warn me that might really enrol me:

> It's fine, the next step still won't let me enrol.

*(both translated from Chinese)*

I was right: after nine screens ISIS refused with an internal error code.
That ending became the brief, telling students before they act. I then chose
the scope, three switchable demo students, First Semester 2027 and clash
detection when the agent asked.

The build went in reviewable units, each approved before committing:
real catalogue data fetched from ANU
([`c72fca5`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-dongyangli6816/commit/c72fca5)),
schema and seed
([`6b7446d`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-dongyangli6816/commit/6b7446d)),
rules and API
([`bac7aed`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-dongyangli6816/commit/bac7aed)),
then the interface
([`2cbdafb`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-dongyangli6816/commit/2cbdafb)).

I knew it was right by checking the surface a student touches, not the
test count. Real clicks, keyboard-only and no-JavaScript runs found a
vanishing confirmation and a misread timetable while every test was green.
Deliberately breaking code proved the new tests could fail. Probing the
live site found README images failing in production that passed locally
([`92a5474`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-dongyangli6816/commit/92a5474)).
Each failure, its cost and its fix is in `docs/notes/harness-evidence.md`
([`6cf76de`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-dongyangli6816/commit/6cf76de)).
