import { describe, expect, inject, it } from "vitest";

// Promises of the enrolment slice beyond the published spec's
// (spec/enrolment.test.ts), driven over HTTP against the running app: what a
// student can rely on whichever way the page is built.
//
// The server and database are shared with every other spec file, which run
// in parallel, and spec/enrolment.test.ts acts as the default student. So
// these act only as the other demo students (scripts/seed-sql.ts): Priya,
// who has completed nothing, and Jordan, who starts with 18 units planned.
const baseUrl = inject("baseUrl");

const as = (student: string) => ({ cookie: `student=${student}` });
const post = (path: string, student: string, body: Record<string, string> = {}) =>
  fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin: baseUrl, ...as(student) },
    body: new URLSearchParams(body),
    redirect: "manual",
  });
const page = (student: string) =>
  fetch(new URL("/enrol/", baseUrl), { headers: as(student) }).then((r) => r.text());
/** The "Your plan" panel only, so a course's card doesn't count as planned. */
const plan = (html: string) => html.slice(html.indexOf('id="plan"'), html.indexOf("</aside>"));

describe("refusals", () => {
  it("are client errors with a reason, not server errors", async () => {
    // Statistical Machine Learning needs Introduction to Machine Learning.
    const res = await post("/api/enrolments", "priya", { courseCode: "COMP8600" });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    const html = await res.text();
    expect(html).toContain("You need Introduction to Machine Learning first.");
    expect(plan(await page("priya"))).not.toContain("COMP8600");
  });

  it("stop a plan going past 24 units", async () => {
    // Jordan starts on 18: one more 6-unit course fits, a second doesn't.
    expect((await post("/api/enrolments", "jordan", { courseCode: "COMP6363" })).status).toBe(303);
    const over = await post("/api/enrolments", "jordan", { courseCode: "COMP6528" });
    expect(over.status).toBe(422);
    expect(plan(await page("jordan"))).toMatch(/<strong>24<\/strong> of 24 units/);
  });
});

describe("the plan", () => {
  it("loses a course when it's dropped, after a reload", async () => {
    expect((await post("/api/enrolments", "priya", { courseCode: "COMP6240" })).status).toBe(303);
    const before = plan(await page("priya"));
    expect(before).toContain("COMP6240");

    const action = before.match(/action="(\/api\/enrolments\/\d+\/drop)"/)?.[1];
    if (!action) throw new Error("no drop form in the plan");
    expect((await post(action, "priya")).status).toBe(303);
    expect(plan(await page("priya"))).not.toContain("COMP6240");
  });

  it("won't drop another student's enrolment", async () => {
    const jordans = plan(await page("jordan")).match(/action="(\/api\/enrolments\/\d+\/drop)"/)?.[1];
    if (!jordans) throw new Error("Jordan has no drop form");
    expect((await post(jordans, "priya")).status).toBe(404);
  });

  it("warns about a clash but still enrols", async () => {
    // Computer Vision and Cyber Security Foundations both lecture Wednesday 12:30.
    expect((await post("/api/enrolments", "priya", { courseCode: "COMP6528" })).status).toBe(303);
    expect((await post("/api/enrolments", "priya", { courseCode: "COMP6800" })).status).toBe(303);
    expect(plan(await page("priya"))).toMatch(/overlap on Wednesday/);
  });
});

describe("switching student", () => {
  it("remembers who is looking and shows their plan", async () => {
    const res = await post("/api/student", "alex", { student: "jordan" });
    expect(res.status).toBe(303);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/student=jordan/);
    const html = await fetch(new URL("/enrol/", baseUrl), {
      headers: { cookie: cookie.split(";")[0] },
    }).then((r) => r.text());
    expect(html).toMatch(/<option value="jordan" selected/);
    expect(plan(html)).toContain("Data Mining");
  });
});

describe("the list", () => {
  it("mentions each course code at most twice", async () => {
    // Once as the card's text, once as its enrol button's value; enrolled
    // courses trade the button for their row in the plan. spec/enrolment
    // counts this for one course; this holds it for all of them.
    const html = await page("priya");
    const codes = new Set(html.match(/COMP\d{4}/g));
    for (const code of codes) {
      expect(html.split(code).length - 1, code).toBeLessThanOrEqual(2);
    }
  });
});

describe("other tabs", () => {
  it("hear about a plan change over the event stream", async () => {
    const controller = new AbortController();
    const res = await fetch(new URL("/api/events", baseUrl), { signal: controller.signal });
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();

    await post("/api/enrolments", "priya", { courseCode: "COMP6262" });

    let received = "";
    const deadline = Date.now() + 5000;
    while (!received.includes("event: plan-changed") && Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      received += decoder.decode(value);
    }
    controller.abort();
    expect(received).toMatch(/event: plan-changed\ndata: "priya"/);
  });
});
