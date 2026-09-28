// Enrolment rules as pure functions of a student's record and plan, so the
// page (what a card says before you press anything) and the API (what the
// server allows) can't disagree: both call these.
//
// Every reason is a sentence a student can act on, naming courses by title.
// Titles rather than codes also keep each code to one mention per card on
// /enrol/, which spec/enrolment.test.ts counts.
import { PROGRAMS, type Program, type Requisite, type Rule } from "../data/requisites";

export const UNIT_LOAD = 24;

export type StudentRecord = {
  program: Program;
  completed: ReadonlySet<string>;
  planned: ReadonlySet<string>;
  plannedUnits: number;
};

export type CourseRef = { code: string; title: string; units: number };

/** Names a course the way a student knows it; falls back to the code for
 *  courses outside this session's catalogue (e.g. undergraduate ones). */
export type Namer = (code: string) => string;

function holds(rule: Rule, r: StudentRecord): boolean {
  if ("done" in rule) return rule.done.some((c) => r.completed.has(c));
  if ("doneOrPlanned" in rule)
    return rule.doneOrPlanned.some((c) => r.completed.has(c) || r.planned.has(c));
  if ("program" in rule) return rule.program.includes(r.program);
  if ("units6000" in rule)
    return [...r.completed].filter((c) => /^COMP6\d{3}$/.test(c)).length * 6 >= rule.units6000;
  if ("all" in rule) return rule.all.every((x) => holds(x, r));
  return rule.any.some((x) => holds(x, r));
}

const orList = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;

// Requisites list undergraduate equivalents alongside postgraduate courses;
// a master's student needs the postgraduate ones.
const postgradFirst = (codes: string[]) => {
  const pg = codes.filter((c) => /^[A-Z]{4}[6-9]/.test(c));
  return pg.length ? pg : codes;
};

/** The first unmet part of a rule, as a phrase: "Structured Programming",
 *  "the Master of Computing (Advanced)". */
function missing(rule: Rule, r: StudentRecord, name: Namer): string | null {
  if (holds(rule, r)) return null;
  if ("done" in rule) return orList(postgradFirst(rule.done).map(name));
  if ("doneOrPlanned" in rule) return orList(postgradFirst(rule.doneOrPlanned).map(name));
  if ("program" in rule) return `the ${orList(rule.program.map((p) => PROGRAMS[p]))}`;
  if ("units6000" in rule) return `${rule.units6000} units of 6000-level COMP courses`;
  if ("all" in rule) {
    for (const x of rule.all) {
      const m = missing(x, r, name);
      if (m) return m;
    }
    return null;
  }
  return orList(rule.any.map((x) => missing(x, r, name)).filter((m): m is string => !!m));
}

export type Eligibility =
  | { state: "can-take" }
  | { state: "in-plan" }
  | { state: "completed" }
  | { state: "blocked"; reason: string }
  | { state: "permission"; reason: string }
  | { state: "over-load"; reason: string };

export function eligibility(
  course: CourseRef,
  req: Requisite,
  r: StudentRecord,
  name: Namer,
): Eligibility {
  if (r.planned.has(course.code)) return { state: "in-plan" };
  if (r.completed.has(course.code)) return { state: "completed" };

  const clashDone = req.notIfDone?.find((c) => r.completed.has(c));
  if (clashDone)
    return { state: "blocked", reason: `You've completed ${name(clashDone)}, which covers the same ground.` };
  const clashPlanned = req.notIfPlanned?.find((c) => r.planned.has(c));
  if (clashPlanned)
    return { state: "blocked", reason: `You can't take it alongside ${name(clashPlanned)}.` };
  if (req.notIfProgram?.includes(r.program))
    return { state: "blocked", reason: `It isn't open to students in the ${PROGRAMS[r.program]}.` };

  const need = req.rule && missing(req.rule, r, name);
  if (need) {
    const programs = Object.values(PROGRAMS);
    const isProgram = need
      .replace(/^the /, "")
      .split(/, | or /)
      .every((p) => programs.includes(p));
    return {
      state: "blocked",
      reason: isProgram ? `It's only open to students in ${need}.` : `You need ${need} first.`,
    };
  }
  if (req.permission) return { state: "permission", reason: `Needs a permission code. ${req.permission}` };
  if (r.plannedUnits + course.units > UNIT_LOAD)
    return {
      state: "over-load",
      reason: `It would take you to ${r.plannedUnits + course.units} units; the most in one semester is ${UNIT_LOAD}.`,
    };
  return { state: "can-take" };
}

// ------------------------------------------------------------------ clashes

export type Slot = {
  courseCode: string;
  group: string;
  activity: string;
  kind: string;
  day: string;
  start: string;
  end: string;
};

// Drop-ins, assessments and make-up lectures aren't weekly commitments.
const IRREGULAR = /drop-in|assessment|makeup|make-up/i;

const minutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const overlaps = (a: Slot, b: Slot) =>
  a.day === b.day && minutes(a.start) < minutes(b.end) && minutes(b.start) < minutes(a.end);

/** A course's weekly activities, split into what's fixed and what's a
 *  choice. The timetable's activity id names a stream ("TutA/03"); one
 *  stream can meet more than once a week, or in two rooms at once, so rows
 *  sharing an id are one stream. A group with a single stream is fixed: you
 *  have to be at all its sessions. A group with several streams is a choice:
 *  you pick one later. */
export function weekly(slots: Slot[]) {
  const regular = slots.filter((s) => !IRREGULAR.test(s.kind));
  const groups = new Map<string, Map<string, Slot[]>>();
  for (const s of regular) {
    const streams = groups.get(s.group) ?? new Map<string, Slot[]>();
    const sessions = streams.get(s.activity) ?? [];
    // the same session listed once per room is one session
    if (!sessions.some((x) => x.day === s.day && x.start === s.start && x.end === s.end)) sessions.push(s);
    streams.set(s.activity, sessions);
    groups.set(s.group, streams);
  }
  const fixed: Slot[] = [];
  const choices: Slot[][][] = [];
  for (const streams of groups.values()) {
    const list = [...streams.values()];
    if (list.length === 1) fixed.push(...list[0]);
    else choices.push(list);
  }
  // two groups can list the same session (a lecture filed twice)
  const unique = fixed.filter(
    (s, i) => fixed.findIndex((x) => x.day === s.day && x.start === s.start && x.end === s.end) === i,
  );
  return { fixed: unique, choices };
}

/** Where this course would collide with the plan. A fixed session clashes if
 *  it overlaps anything fixed in the plan; a choice clashes only if every
 *  stream does, since otherwise the student can pick a free one. */
export function clashes(course: Slot[], plan: Slot[]): { mine: Slot; theirs: Slot }[] {
  const planFixed = weekly(plan).fixed;
  const hit = (s: Slot) => planFixed.find((p) => overlaps(s, p));
  const { fixed, choices } = weekly(course);
  const found: { mine: Slot; theirs: Slot }[] = [];
  for (const mine of fixed) {
    const theirs = hit(mine);
    if (theirs) found.push({ mine, theirs });
  }
  for (const streams of choices) {
    const blocked = streams.map((sessions) => sessions.map(hit).find(Boolean));
    if (blocked.every(Boolean)) found.push({ mine: streams[0][0], theirs: blocked[0] as Slot });
  }
  return found;
}
