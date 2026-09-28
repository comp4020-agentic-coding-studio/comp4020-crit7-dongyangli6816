import { describe, expect, it } from "vitest";
import catalogue from "../src/data/catalogue.json";
import { REQUISITES } from "../src/data/requisites";
import { courseName } from "../src/lib/names";
import { clashes, eligibility, type Slot, type StudentRecord } from "../src/lib/rules";

// The enrolment rules on their own, without the server: what a student is
// told about a course before they press anything, and when two courses
// collide in the week.

const name = courseName;
const course = (code: string) => {
  const c = catalogue.courses.find((x) => x.code === code);
  if (!c) throw new Error(`${code} isn't in the catalogue`);
  return c;
};
const record = (over: Partial<StudentRecord> = {}): StudentRecord => ({
  program: "MCOMP",
  completed: new Set(),
  planned: new Set(),
  plannedUnits: 0,
  ...over,
});
const check = (code: string, r: StudentRecord) => eligibility(course(code), REQUISITES[code], r, name);

describe("requisites cover the catalogue", () => {
  it("has an entry for every course offered", () => {
    const missing = catalogue.courses.map((c) => c.code).filter((c) => !(c in REQUISITES));
    expect(missing).toEqual([]);
  });
});

describe("eligibility", () => {
  it("lets a student take a course with nothing required", () => {
    expect(check("COMP6240", record())).toEqual({ state: "can-take" });
  });

  it("names a missing prerequisite by title, not code", () => {
    const e = check("COMP8600", record());
    expect(e.state).toBe("blocked");
    if (e.state === "blocked") {
      expect(e.reason).toContain("Introduction to Machine Learning");
      expect(e.reason).not.toMatch(/COMP6670/);
    }
  });

  it("opens the course once the prerequisite is completed", () => {
    expect(check("COMP8600", record({ completed: new Set(["COMP6670"]) }))).toEqual({
      state: "can-take",
    });
  });

  it("counts a course in this semester's plan where the rule allows it", () => {
    // COMP6320 needs Logic completed *or currently enrolled*.
    const r = record({ completed: new Set(["COMP6710"]), planned: new Set(["COMP6262"]), plannedUnits: 6 });
    expect(check("COMP6320", r)).toEqual({ state: "can-take" });
  });

  it("refuses an incompatible course the student has already done", () => {
    const e = check("COMP7710", record({ completed: new Set(["COMP6710"]) }));
    expect(e.state).toBe("blocked");
  });

  it("says a program-only course is only for that program", () => {
    const e = check("COMP6800", record());
    expect(e).toMatchObject({ state: "blocked" });
    if (e.state === "blocked") expect(e.reason).toMatch(/^It's only open to students in the Master of Computing \(Advanced\)/);
  });

  it("says up front when a permission code is needed", () => {
    const r = record({ completed: new Set(["COMP6670"]) });
    expect(check("COMP8650", r).state).toBe("permission");
  });

  it("refuses a course that would take the plan past 24 units", () => {
    const e = check("COMP6240", record({ plannedUnits: 24 }));
    expect(e.state).toBe("over-load");
  });

  it("allows reaching exactly 24 units", () => {
    expect(check("COMP6240", record({ plannedUnits: 18 })).state).toBe("can-take");
  });
});

describe("clashes", () => {
  const slot = (courseCode: string, group: string, day: string, start: string, end: string, kind = "Lecture"): Slot => ({
    courseCode,
    group,
    activity: `${group}/01`,
    kind,
    day,
    start,
    end,
  });

  it("finds a lecture that overlaps a lecture in the plan", () => {
    const found = clashes([slot("A", "LecA", "Monday", "10:00", "12:00")], [slot("B", "LecA", "Monday", "11:00", "13:00")]);
    expect(found).toHaveLength(1);
  });

  it("doesn't count back-to-back classes as a clash", () => {
    const found = clashes([slot("A", "LecA", "Monday", "10:00", "12:00")], [slot("B", "LecA", "Monday", "12:00", "14:00")]);
    expect(found).toEqual([]);
  });

  it("ignores a tutorial when at least one stream is free", () => {
    const tutorials = [
      { ...slot("A", "TutA", "Tuesday", "09:00", "10:00", "Tutorial"), activity: "TutA/01" },
      { ...slot("A", "TutA", "Tuesday", "11:00", "12:00", "Tutorial"), activity: "TutA/02" },
    ];
    const found = clashes(tutorials, [slot("B", "LecA", "Tuesday", "09:00", "10:00")]);
    expect(found).toEqual([]);
  });

  it("flags a tutorial when every stream overlaps", () => {
    const tutorials = [
      { ...slot("A", "TutA", "Tuesday", "09:00", "10:00", "Tutorial"), activity: "TutA/01" },
      { ...slot("A", "TutA", "Tuesday", "09:30", "10:30", "Tutorial"), activity: "TutA/02" },
    ];
    const found = clashes(tutorials, [slot("B", "LecA", "Tuesday", "09:00", "11:00")]);
    expect(found).toHaveLength(1);
  });

  it("treats rows sharing a stream id as one stream that meets twice", () => {
    // COMP6331's LecA/01 meets Monday and Thursday: both are fixed, so a
    // plan busy on Thursday afternoon clashes even though Monday is free.
    const lecture = [
      { ...slot("A", "LecA", "Monday", "12:00", "14:00"), activity: "LecA/01" },
      { ...slot("A", "LecA", "Thursday", "13:00", "15:00"), activity: "LecA/01" },
    ];
    const found = clashes(lecture, [slot("B", "LecA", "Thursday", "14:00", "15:00")]);
    expect(found).toHaveLength(1);
  });

  it("ignores drop-in sessions", () => {
    const found = clashes(
      [slot("A", "DroA", "Monday", "10:00", "11:00", "Drop-In Class")],
      [slot("B", "LecA", "Monday", "10:00", "11:00")],
    );
    expect(found).toEqual([]);
  });
});
