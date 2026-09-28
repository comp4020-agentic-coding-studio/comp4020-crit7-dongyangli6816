#!/usr/bin/env node
// Fetches the real course catalogue the prototype is seeded with: every
// postgraduate COMP course ANU lists for First Semester 2027, from the public
// Programs and Courses site, plus teaching times from the public ANU
// timetable. Run by hand (`pnpm fetch:catalogue`), never at build, boot or in
// tests: the app reads the committed snapshot in src/data/, and the seed
// migration is generated from that snapshot (scripts/seed-sql.ts).
//
// Politeness: one request at a time, a pause between them, and a User-Agent
// that says who is asking. ANU's copyright terms allow non-commercial copying
// with acknowledgement, which the app gives in its footer and README.
import { writeFileSync } from "node:fs";
import { parse, type HTMLElement } from "node-html-parser";

const YEAR = 2027;
const SESSION = "First Semester";
const PC = "https://programsandcourses.anu.edu.au";
// sws2027 had no First Semester data when this was written (its module list
// was empty), so teaching times come from the same session a year earlier.
const TIMETABLE_YEAR = 2026;
const TIMETABLE = `https://timetabling.anu.edu.au/sws${TIMETABLE_YEAR}/`;
const USER_AGENT =
  "comp4020-crit7-prototype (ANU student project; github.com/DongyangLi6816)";

const pause = () => new Promise((r) => setTimeout(r, 1000));

async function get(url: string, init: RequestInit = {}): Promise<Response> {
  await pause();
  const res = await fetch(url, {
    ...init,
    headers: { "user-agent": USER_AGENT, ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
}

const text = (el: HTMLElement | null | undefined) =>
  (el?.textContent ?? "").replace(/\s+/g, " ").trim();

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
/** "22 Feb 2027" → "2027-02-22" */
function isoDate(d: string): string | null {
  const m = d.trim().match(/^(\d{1,2}) (\w{3}) (\d{4})$/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2]) + 1;
  return `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

// ---------------------------------------------------------------- courses

async function listCourses() {
  // The search endpoint ignores a list filter unless every index from 0 is
  // sent, so the empty slots are deliberate.
  const q = new URLSearchParams({
    AppliedFilter: "FilterByCourses",
    SearchText: "COMP",
    SelectedYear: String(YEAR),
    "Careers[0]": "",
    "Careers[1]": "Postgraduate",
    "Careers[2]": "",
    "Careers[3]": "",
    "Sessions[0]": "",
    "Sessions[1]": SESSION,
    "Sessions[2]": "",
    "Sessions[3]": "",
    "Sessions[4]": "",
    "Sessions[5]": "",
    ShowAll: "true",
    PageIndex: "0",
    MaxPageSize: "10",
  });
  const res = await get(`${PC}/data/CourseSearch/GetCourses?${q}`);
  const data = (await res.json()) as {
    Items: { CourseCode: string; Name: string; Units: number; ModeOfDelivery: string }[];
  };
  // SearchText is full-text, so "COMP" also matches e.g. Competition Law.
  return data.Items.filter((i) => /^COMP\d{4}$/.test(i.CourseCode))
    .map((i) => ({
      code: i.CourseCode,
      title: i.Name.trim(),
      units: i.Units,
      mode: i.ModeOfDelivery.trim(),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

/** The class row for this session and year: the site renders one tab per
 *  year, each with an h3 per session followed by a table of classes. */
function classDates(page: HTMLElement) {
  for (const h3 of page.querySelectorAll("h3")) {
    if (text(h3) !== SESSION) continue;
    let table = h3.nextElementSibling;
    while (table && !table.classList.contains("table-terms")) table = table.nextElementSibling;
    for (const row of table?.querySelectorAll("tbody tr") ?? []) {
      const cells = row.querySelectorAll("td").map((c) => text(c));
      const start = isoDate(cells[1] ?? "");
      if (start?.startsWith(String(YEAR))) {
        return {
          classStart: start,
          enrolBy: isoDate(cells[2] ?? ""),
          census: isoDate(cells[3] ?? ""),
          classEnd: isoDate(cells[4] ?? ""),
        };
      }
    }
  }
  return { classStart: null, enrolBy: null, census: null, classEnd: null };
}

async function courseDetail(code: string) {
  const url = `${PC}/${YEAR}/course/${code}`;
  const page = parse(await (await get(url)).text());

  // The summary block is rendered twice (mobile and desktop); the first is
  // enough.
  const summary = new Map<string, HTMLElement>();
  for (const li of page.querySelectorAll("li.degree-summary__code")) {
    const label = text(li.querySelector(".degree-summary__code-heading"));
    if (label && !summary.has(label)) summary.set(label, li);
  }
  const conveners = summary
    .get("Course convener")
    ?.querySelectorAll(".degree-summary__code-text")
    .map((el) => text(el))
    .filter(Boolean);

  const requisite = page.querySelector("div.requisite");
  const requisiteText = text(requisite);
  // Codes linked before "Incompatible with" are candidate prerequisites;
  // the rule itself is hand-encoded in src/data/requisites.ts.
  const [before, after = ""] = (requisite?.innerHTML ?? "").split(/Incompatible with/i);
  const linked = (html: string) => [...new Set([...html.matchAll(/\/course\/([A-Z]{4}\d{4})/g)].map((m) => m[1]))];

  const intro = page.querySelector("#introduction");
  const paragraphs = (intro?.querySelectorAll("p") ?? []).map((p) => text(p)).filter(Boolean);

  return {
    description: paragraphs.join("\n\n") || text(intro),
    convener: conveners?.length ? conveners.join(", ") : null,
    requisiteText,
    requisiteCodes: linked(before),
    incompatibleCodes: linked(after),
    ...classDates(page),
    sourceUrl: url,
  };
}

// -------------------------------------------------------------- timetable

type Activity = {
  activity: string; // e.g. "LecA/01"
  group: string; // e.g. "LecA": one stream from each group is attended
  kind: string; // the timetable's activity type, e.g. "Lecture"
  day: string;
  start: string; // "13:00"
  end: string;
  location: string;
};

const hidden = (html: string) =>
  Object.fromEntries(
    parse(html)
      .querySelectorAll("input[type=hidden]")
      .map((i) => [i.getAttribute("name") ?? "", i.getAttribute("value") ?? ""]),
  );

/** One timetable session per run: the Scientia site is ASP.NET WebForms, so
 *  each request posts back the page state and keeps the session cookie. */
async function timetableSession() {
  let cookie = "";
  const post = async (path: string, form: Record<string, string>) => {
    const res = await get(TIMETABLE + path, {
      method: "POST",
      headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(form),
    });
    return res.text();
  };
  const first = await get(TIMETABLE);
  cookie = (first.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  const modules = await post("Default.aspx", {
    ...hidden(await first.text()),
    __EVENTTARGET: "LinkBtn_modules",
  });
  const state = hidden(modules);
  const offered = new Set(
    parse(modules)
      .querySelectorAll("select#dlObject option")
      .map((o) => o.getAttribute("value") ?? ""),
  );

  return async function activities(code: string): Promise<Activity[] | null> {
    const module = `${code}_S1`;
    if (!offered.has(module)) return null;
    const html = await post("Default.aspx", {
      ...state,
      dlObject: module,
      lbWeeks: "7-24", // First Semester teaching weeks
      lbDays: "1-5;1;2;3;4;5",
      dlPeriod: `1-32;${Array.from({ length: 32 }, (_, i) => i + 1).join(";")};`,
      RadioType: "module_list;cyon_reports_list_url;dummy",
      bGetTimetable: "View Timetable",
    });
    const rows = parse(html).querySelectorAll("table tr");
    const out: Activity[] = [];
    for (const row of rows) {
      const c = row.querySelectorAll("td").map((td) => text(td));
      const m = c[0]?.match(/-([A-Za-z]+)\/(\d+)$/);
      if (!m || !/^\d\d:\d\d$/.test(c[2] ?? "")) continue;
      out.push({
        activity: `${m[1]}/${m[2]}`,
        group: m[1],
        kind: c[6] ?? "",
        day: c[1],
        start: c[2],
        end: c[3],
        location: c[7] ?? "",
      });
    }
    return out;
  };
}

// ------------------------------------------------------------------- main

const fetchedAt = new Date().toISOString().slice(0, 10);
const list = await listCourses();
console.log(`${list.length} courses`);

const courses = [];
for (const c of list) {
  courses.push({ ...c, ...(await courseDetail(c.code)) });
  console.log(`  ${c.code} ${c.title}`);
}

const activities = await timetableSession();
const timetable: Record<string, Activity[]> = {};
for (const c of list) {
  const acts = await activities(c.code);
  if (acts?.length) timetable[c.code] = acts;
  console.log(`  ${c.code} ${acts ? `${acts.length} activities` : "not timetabled"}`);
}

writeFileSync(
  "src/data/catalogue.json",
  `${JSON.stringify(
    {
      source: `${PC}/${YEAR}/`,
      session: `${SESSION} ${YEAR}`,
      fetchedAt,
      courses,
    },
    null,
    2,
  )}\n`,
);
writeFileSync(
  "src/data/timetable.json",
  `${JSON.stringify(
    {
      source: TIMETABLE,
      session: `${SESSION} ${TIMETABLE_YEAR}`,
      fetchedAt,
      activities: timetable,
    },
    null,
    2,
  )}\n`,
);
console.log("wrote src/data/catalogue.json and src/data/timetable.json");
