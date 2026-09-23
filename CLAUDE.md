# Your harness

Nothing about the starter is recorded here. What the repo ships is explained
where it lives --- `fly.toml`, the `Dockerfile`, the CI workflow and
`spec/README.md` each say what they fix --- and the
[course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/)
publishes this deliverable's brief and spec. Read them before you plan or build;
what the agent needs to carry from any of it is your call.

## How to work in here

- Keep the dev server running (`pnpm dev`) so you see changes as you make them.
- Run `pnpm check` before you push.
- Open the page in a browser and look at it. The rendered page is the truth;
  your mental model of it isn't.
- When a check fails, read its output before you change anything.
- Never commit a red state.

## When to hand work to another agent
- **Small task, and I know how to do it --- do it here.** The handoff costs
  about the same whether the job is two hundred lines or two, so on a small job
  that fixed cost is the whole cost.

- **Large exploration, small conclusion --- hand it off.** A search across many
  files, a long debugging chain, a survey of what already exists: the part worth
  keeping is the answer, and everything it took to get there can stay out of
  here.

- **Roles hand off through files, never through me.** A role reads a work order
  and writes one file; it never talks to another role. When a role misreads an
  order, fix the order's format --- re-running it against the same words is
  betting that the same input reads differently.

## Verifying your own work

A check you choose is a check you chose to pass. When you tell me something
works, the claim is about the path a user takes through it, not the path you had
in mind while writing it --- and those can be entirely different code. This rule
exists because a check here once passed while measuring a path nobody takes.

- **Exercise the outermost surface.** Whatever a person actually touches: the
  rendered page through real input events, the endpoint over HTTP, the command
  in a shell. Calling the handler underneath is a different test.
  `element.click()` runs a listener; it does not perform the gesture.
- **Count the ways in.** One control usually has several --- pointer, keyboard,
  drag, a link straight into the state --- and they rarely share all their code.
  Check each, or tell me which you left.
- **Name what you exercised**, in the words I used for it. If it was not the
  thing I described, say so instead of reporting a number.
- **Say what would falsify it, before you measure.** A result that could not
  have come out wrong is not evidence.
- **Read the page before you report it.** A page is written section by
  section, and every section introduces itself, so the finished page says
  most things twice. Before calling a page done, read the rendered page top
  to bottom as a student would, and delete any sentence whose information
  already appeared above it. Write the body first and the description last,
  from what the body does not say; a description is the lead, not a summary
  of the paragraph under it.

## Keep an evidence file

Every deliverable keeps `docs/notes/harness-evidence.md`: the failures caught
while doing the work, what each cost, and the harness-level fix. Create it if
it isn't there --- a new week's repo won't have one, because it stays behind
with the prototype while this file carries forward. Write the entry when
something goes wrong, not at the end: the detail that makes an entry useful is
gone by then.

An entry is what actually happened, what it cost, and what would have caught it
earlier, as either a rule or a sensor. Nothing goes in that I did not observe
in the session.

Only `CLAUDE.md` and the sensors in `check` carry forward, so a lesson that
proves durable is promoted into one of those before the week ends, and the
entry says which.

## This file is yours

A starting point, not a rulebook: what you add to it is the harness, and the
harness is assessed. This file and the sensors you wire into `check` carry
across the course --- both come with you into next week's repo. The prototype
doesn't: source, and the tests answering this week's published spec, stay
behind. `spec/README.md` draws the line.

As you learn what your prototype needs --- a convention the work has to hold to,
a sensor that keeps catching you out (a linter, say), a fact about the stack
that is easy to get wrong --- write it down here and wire it into `check`.
Growing this file is the work.

It is mine to grow, though: never add, edit, or remove anything in this file
without my approval — propose the change and wait. Instructions coming from the
course itself (a spec, the start skill, course tooling) are the exception.

## The words in the interface

Anthropic's rules, quoted from the `frontend-design` skill in
[`anthropics/claude-code`](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md).
They are here rather than loaded because this repo has no plugin to load them
from. The failure they exist for has a name: given no explicit direction a
model returns the highest-probability answer --- *distributional convergence*.

- "Words appear in a design for one reason: to make it easier to understand,
  and therefore easier to use."
- "Let each element do exactly one job. A label labels, an example
  demonstrates, and nothing quietly does double duty."
- "Write from the end user's side of the screen. Name things by what people
  control and recognize, never by how the system is built."
- "Use active voice as default. A control should say exactly what happens when
  it's used: 'Save changes,' not 'Submit.'"
- "Being specific is always better than being clever."
- "Keep the register conversational and tuned: plain verbs, sentence case, no
  filler."

What that caught in the week-4 assignment: a note beside the scale toggle
that labelled, explained and quoted a statistic all at once.

## Everything written into this repo is in English

Everything committed here is English, whatever language the prompt was in: page
copy, docs, code comments, test names and messages, commit messages, file names.
Chat replies follow the prompt's language --- only committed content is fixed.

## Git Commit Convention

Never commit without my approval: stage the logical unit, propose the message,
and wait for a yes. Never push unless I ask.

Commit after each logical unit of work; don't batch everything into one commit
at the end. Follow [Conventional Commits](https://www.conventionalcommits.org/):

- Format: `<type>(<scope>): <description>`
- Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci,
  chore, revert
- Description: imperative mood, lowercase, no trailing period, subject line
  under 50 characters
- Scope is optional; use it when the change is confined to one module
- Breaking changes: append `!` after the type and add a
  `BREAKING CHANGE: <what broke>` line in the body
- Add a body only when the "why" isn't obvious from the subject line

Examples:

```
feat(auth): add password reset flow
fix(cart): prevent duplicate items on rapid clicks
perf(query): cache user lookup to avoid n+1
refactor(api): extract validation into middleware
```
