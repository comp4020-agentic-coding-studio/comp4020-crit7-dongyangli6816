// Enrolment requirements for each course in src/data/catalogue.json, encoded
// by hand from the free-text requisites on ANU Programs and Courses (the
// text itself is kept in the catalogue and shown on each course's page).
//
// What can be checked from a student's record is a Rule. What can't be (a
// permission code, a project group, competitive entry) is `permission`: the
// course says so before the student tries, instead of refusing them after
// they press the last button, which is what ISIS does
// (docs/research/isis-enrolment.md, step 9).

export type Program = "MCOMP" | "VCOMP";

export const PROGRAMS: Record<Program, string> = {
  MCOMP: "Master of Computing",
  VCOMP: "Master of Computing (Advanced)",
};

export type Rule =
  /** completed any one of these */
  | { done: string[] }
  /** completed, or has in this semester's plan, any one of these */
  | { doneOrPlanned: string[] }
  /** is studying one of these programs */
  | { program: Program[] }
  /** has completed at least this many units of 6000-level COMP courses */
  | { units6000: number }
  | { all: Rule[] }
  | { any: Rule[] };

export type Requisite = {
  rule?: Rule;
  /** can't take it after completing any of these (incompatible courses) */
  notIfDone?: string[];
  /** can't take it alongside any of these in the same plan */
  notIfPlanned?: string[];
  /** can't take it while studying one of these programs */
  notIfProgram?: Program[];
  /** the part no record can show; enrolment needs a permission code */
  permission?: string;
};

const PROJECTS = ["COMP8715", "COMP8755", "COMP8800", "COMP8830"];
const PROGRAMMING = ["COMP6710", "COMP7710", "COMP1110", "COMP1140"];
const ETHICS = ["COMP8280", "COMP8260", "COMP6250"];

export const REQUISITES: Record<string, Requisite> = {
  COMP6240: { notIfDone: ["COMP2400", "COMP7240"] },
  COMP6242: {
    rule: {
      all: [
        { done: ["COMP3670", "COMP6670", "COMP8410"] },
        { done: ["COMP1110", "COMP6710", "COMP7710", "COMP1730", "COMP6730"] },
      ],
    },
  },
  COMP6262: { notIfDone: ["PHIL2080", "COMP2620"] },
  COMP6300: {
    rule: { any: [{ program: ["MCOMP", "VCOMP"] }, { done: ["COMP6710", "COMP7710", "COMP1110"] }] },
    notIfDone: ["COMP2300", "ENGN2219", "COMP6719"],
  },
  COMP6320: {
    rule: {
      all: [
        { any: [{ done: ["COMP6710", "COMP7710", "COMP1110"] }, { program: ["VCOMP"] }] },
        { doneOrPlanned: ["COMP6262", "COMP2620"] },
      ],
    },
    notIfDone: ["COMP3620"],
  },
  COMP6331: {
    rule: { done: [...PROGRAMMING, "COMP6310", "COMP2310", "COMP6442", "COMP2100"] },
    notIfDone: ["COMP3310", "ENGN3539", "ENGN6539"],
  },
  COMP6363: { rule: { program: ["MCOMP", "VCOMP"] }, notIfDone: ["COMP3630"] },
  COMP6442: {
    rule: {
      any: [
        {
          all: [
            { done: PROGRAMMING },
            { doneOrPlanned: ["MATH6005", "COMP6260", "MATH1005", "COMP1600"] },
          ],
        },
        { program: ["VCOMP"] },
      ],
    },
    notIfDone: ["COMP2100"],
  },
  COMP6445: { rule: { program: ["VCOMP"] }, notIfDone: ["COMP2550", "COMP4450"] },
  COMP6528: {
    rule: { program: ["MCOMP", "VCOMP"] },
    notIfDone: ["ENGN6528", "COMP4528", "ENGN4528"],
  },
  COMP6710: {
    notIfProgram: ["VCOMP"],
    notIfDone: ["COMP1110", "COMP1140", "COMP7710"],
    notIfPlanned: ["COMP7710"],
  },
  COMP6730: { notIfDone: ["COMP1100", "COMP1130", "COMP1730", "COMP6710", "COMP7710"] },
  COMP6800: { rule: { program: ["VCOMP"] }, notIfDone: ["COMP2700"] },
  COMP7710: {
    notIfDone: ["COMP1110", "COMP1140", "COMP6710"],
    notIfPlanned: ["COMP6710"],
  },
  COMP8045: {
    rule: { units6000: 12 },
    permission: "It's an advanced topic: request a permission code once the topic is announced.",
  },
  COMP8131: {
    rule: { all: [{ program: ["VCOMP"] }, { done: ["COMP6800"] }] },
    notIfDone: ["COMP4130"],
  },
  COMP8280: {
    rule: { program: ["MCOMP", "VCOMP"] },
    notIfDone: ["COMP8260", "ENGN8260", "ENGN8280"],
  },
  COMP8300: {
    rule: {
      done: ["COMP6310", "COMP2310", "COMP6330", "COMP3300", "COMP6331", "COMP3310", "COMP6464", "ENGN6539"],
    },
    notIfDone: ["COMP4300"],
  },
  COMP8350: { rule: { done: ["COMP6390", "COMP6720"] }, notIfDone: ["COMP4350"] },
  COMP8410: {
    rule: {
      all: [
        { done: ["COMP6240", "COMP7240", "COMP2400"] },
        { done: ["COMP6730", "COMP7230", "COMP6710"] },
      ],
    },
    notIfDone: ["COMP3420", "COMP3425", "COMP8400", "COMP8910"],
  },
  COMP8535: { rule: { all: [{ program: ["VCOMP"] }, { units6000: 12 }] } },
  COMP8600: { rule: { done: ["COMP6670", "COMP3670"] }, notIfDone: ["COMP4670"] },
  COMP8610: {
    rule: {
      any: [
        { program: ["VCOMP"] },
        {
          all: [
            { done: ["COMP6710", "COMP1110", "COMP1140"] },
            { done: ["COMP6390", "COMP6442", "COMP6540", "COMP6780", "COMP6720"] },
          ],
        },
      ],
    },
    notIfDone: ["COMP4610", "COMP6461"],
  },
  COMP8650: {
    rule: { done: ["COMP6670", "COMP8600"] },
    permission: "It's an advanced topic: request a permission code once the topic is announced.",
  },
  COMP8703: {
    rule: { all: [{ program: ["VCOMP"] }, { done: ["COMP6034", "COMP3704"] }] },
    notIfDone: ["COMP3703", "COMP4703"],
  },
  COMP8715: {
    rule: {
      all: [
        { program: ["MCOMP"] },
        { done: ["COMP6442", "COMP2100"] },
        { done: ETHICS },
        { doneOrPlanned: ["COMP6120", "COMP2120"] },
      ],
    },
    notIfDone: PROJECTS.filter((c) => c !== "COMP8715"),
    notIfPlanned: PROJECTS.filter((c) => c !== "COMP8715"),
    permission: "You need to join an approved project group before the end of week 1.",
  },
  COMP8800: {
    rule: {
      all: [{ program: ["VCOMP"] }, { doneOrPlanned: ["COMP6445"] }, { done: ETHICS }],
    },
    notIfDone: PROJECTS.filter((c) => c !== "COMP8800"),
    notIfPlanned: PROJECTS.filter((c) => c !== "COMP8800"),
    permission: "It needs 36 units of COMP, a GPA of 6 and a registered project.",
  },
  // The source lists no requirements for the exchange program.
  COMP8820: {},
  COMP8830: {
    rule: { all: [{ program: ["MCOMP"] }, { done: ["COMP6442"] }, { done: ETHICS }] },
    notIfDone: PROJECTS.filter((c) => c !== "COMP8830"),
    notIfPlanned: PROJECTS.filter((c) => c !== "COMP8830"),
    permission: "Entry is competitive.",
  },
};
