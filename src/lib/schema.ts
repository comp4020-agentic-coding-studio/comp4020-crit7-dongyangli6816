import { sql } from "drizzle-orm";
import { int, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.

// The catalogue: courses offered this session, seeded from the snapshot in
// src/data/catalogue.json by a migration (scripts/seed-sql.ts), so every
// fresh database — local, test, the Fly volume — starts with it.
export const courses = sqliteTable("courses", {
  code: text().primaryKey(),
  title: text().notNull(),
  units: int().notNull(),
  mode: text().notNull(),
  description: text().notNull(),
  requisiteText: text("requisite_text").notNull(),
  convener: text(),
  classStart: text("class_start"),
  classEnd: text("class_end"),
  enrolBy: text("enrol_by"),
  census: text(),
  sourceUrl: text("source_url").notNull(),
});

// When a course is taught. A student attends one stream from each group
// (e.g. one of the TutA streams), which is what clash detection works from.
export const activities = sqliteTable("activities", {
  id: int().primaryKey({ autoIncrement: true }),
  courseCode: text("course_code")
    .notNull()
    .references(() => courses.code),
  activity: text().notNull(),
  group: text().notNull(),
  kind: text().notNull(),
  day: text().notNull(),
  start: text().notNull(),
  end: text().notNull(),
  location: text().notNull(),
});

// Demo students stand in for a login: switching between them shows how
// eligibility depends on a student's program and record.
export const students = sqliteTable("students", {
  id: text().primaryKey(),
  name: text().notNull(),
  program: text({ enum: ["MCOMP", "VCOMP"] }).notNull(),
});

// A student's record. Codes aren't tied to the catalogue: most completed
// courses (undergraduate ones included) aren't offered this session.
export const completedCourses = sqliteTable(
  "completed_courses",
  {
    studentId: text("student_id")
      .notNull()
      .references(() => students.id),
    courseCode: text("course_code").notNull(),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.courseCode] })],
);

// This session's plan. The unique constraint means the database itself
// refuses a second enrolment in the same course, whatever the code above it
// does.
export const enrolments = sqliteTable(
  "enrolments",
  {
    id: int().primaryKey({ autoIncrement: true }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id),
    courseCode: text("course_code")
      .notNull()
      .references(() => courses.code),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [unique().on(t.studentId, t.courseCode)],
);

export type Course = typeof courses.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Enrolment = typeof enrolments.$inferSelect;
