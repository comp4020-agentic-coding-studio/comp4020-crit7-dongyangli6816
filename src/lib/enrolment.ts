// Reads and writes for the enrolment slice. The page and the API both go
// through here, and every decision goes through src/lib/rules.ts, so what a
// card promises is what the server does.
import { and, asc, eq } from "drizzle-orm";
import catalogueMeta from "../data/catalogue.json";
import { REQUISITES, type Program } from "../data/requisites";
import timetableMeta from "../data/timetable.json";
import { db } from "./db";
import { courseName } from "./names";
import { clashes, eligibility, type Eligibility, type Slot, type StudentRecord } from "./rules";
import {
  activities,
  type Course,
  completedCourses,
  courses,
  enrolments,
  type Student,
  students,
} from "./schema";

export const SESSION = catalogueMeta.session;
export const DATA_SOURCES = {
  catalogue: { url: catalogueMeta.source, fetchedAt: catalogueMeta.fetchedAt },
  timetable: { url: timetableMeta.source, session: timetableMeta.session },
};

// No cookie means the default student; see scripts/seed-sql.ts.
export const DEFAULT_STUDENT = "alex";
export const STUDENT_COOKIE = "student";

export function listStudents(): Student[] {
  return db.select().from(students).orderBy(asc(students.name)).all();
}

export function findStudent(id: string | undefined): Student {
  const all = listStudents();
  return all.find((s) => s.id === id) ?? (all.find((s) => s.id === DEFAULT_STUDENT) as Student);
}

export type CourseView = Course & {
  slots: Slot[];
  eligibility: Eligibility;
  clashesWith: { title: string; day: string; start: string }[];
};

export type PlanRow = { enrolmentId: number; course: Course; slots: Slot[] };

function allSlots(): Map<string, Slot[]> {
  const byCourse = new Map<string, Slot[]>();
  for (const a of db.select().from(activities).all()) {
    byCourse.set(a.courseCode, [...(byCourse.get(a.courseCode) ?? []), a]);
  }
  return byCourse;
}

/** Everything /enrol/ shows for one student: each course with what it would
 *  mean for them, and their plan. */
export function enrolmentView(student: Student) {
  const catalogue = db.select().from(courses).orderBy(asc(courses.code)).all();
  const byCode = new Map(catalogue.map((c) => [c.code, c]));
  const slots = allSlots();
  const name = courseName;

  const plan: PlanRow[] = db
    .select({ enrolmentId: enrolments.id, code: enrolments.courseCode })
    .from(enrolments)
    .where(eq(enrolments.studentId, student.id))
    .orderBy(asc(enrolments.courseCode))
    .all()
    .map((e) => ({
      enrolmentId: e.enrolmentId,
      course: byCode.get(e.code) as Course,
      slots: slots.get(e.code) ?? [],
    }));

  const record: StudentRecord = {
    program: student.program as Program,
    completed: new Set(
      db
        .select({ code: completedCourses.courseCode })
        .from(completedCourses)
        .where(eq(completedCourses.studentId, student.id))
        .all()
        .map((r) => r.code),
    ),
    planned: new Set(plan.map((p) => p.course.code)),
    plannedUnits: plan.reduce((n, p) => n + p.course.units, 0),
  };

  const planSlots = plan.flatMap((p) => p.slots);
  const views: CourseView[] = catalogue.map((c) => {
    const own = slots.get(c.code) ?? [];
    const inPlan = record.planned.has(c.code);
    const others = inPlan ? planSlots.filter((s) => s.courseCode !== c.code) : planSlots;
    return {
      ...c,
      slots: own,
      eligibility: eligibility(c, REQUISITES[c.code] ?? {}, record, name),
      clashesWith: clashes(own, others).map(({ theirs }) => ({
        title: name(theirs.courseCode),
        day: theirs.day,
        start: theirs.start,
      })),
    };
  });

  return { courses: views, plan, record, name };
}

export type EnrolResult =
  | { ok: true; enrolmentId: number; course: Course }
  | { ok: false; status: 400 | 404 | 409 | 422; reason: string; code: string };

/** The server's decision, from the same rules the cards show. */
export function enrol(student: Student, code: string): EnrolResult {
  const view = enrolmentView(student);
  const course = view.courses.find((c) => c.code === code);
  if (!course) {
    return {
      ok: false,
      status: 404,
      code,
      reason: "That course isn't offered this semester. Search the list for one that is.",
    };
  }
  const e = course.eligibility;
  if (e.state === "in-plan")
    return { ok: false, status: 409, code, reason: `${course.title} is already in your plan.` };
  if (e.state === "completed")
    return { ok: false, status: 409, code, reason: `You've already completed ${course.title}.` };
  if (e.state !== "can-take") return { ok: false, status: 422, code, reason: e.reason };

  try {
    const row = db
      .insert(enrolments)
      .values({ studentId: student.id, courseCode: code })
      .returning({ id: enrolments.id })
      .get();
    return { ok: true, enrolmentId: row.id, course };
  } catch {
    // The unique index caught a race the check above missed.
    return { ok: false, status: 409, code, reason: `${course.title} is already in your plan.` };
  }
}

/** Drops one of this student's own enrolments; anyone else's id is ignored. */
export function drop(student: Student, enrolmentId: number): Course | null {
  const row = db
    .delete(enrolments)
    .where(and(eq(enrolments.id, enrolmentId), eq(enrolments.studentId, student.id)))
    .returning({ code: enrolments.courseCode })
    .get();
  if (!row) return null;
  return db.select().from(courses).where(eq(courses.code, row.code)).get() ?? null;
}
