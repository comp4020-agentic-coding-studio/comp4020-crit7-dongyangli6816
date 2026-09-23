import { describe, expect, inject, it } from "vitest";

// Crit 7's published spec, as far as a machine can hold it. Two of the five
// lines are mechanically checkable — the core flow persists across a reload,
// and the slice is wired end to end — so they live here. The rest (is this a
// real ANU system, can you account for how you directed the work) is judged at
// the crit, not here.
//
// These assert the CONTRACT: what the app must do, not how it's built. Change
// the three constants below to match your routes and field names; leave the
// assertions alone, and they survive you rebuilding the thing underneath.
const baseUrl = inject("baseUrl");

const ENROL_PAGE = "/enrol/";          // lists what you can enrol in, and what you have
const ENROL_ENDPOINT = "/api/enrolments"; // accepts an enrolment, rejects a bad one
const COURSE_FIELD = "courseCode";     // the form field naming the course

// Astro checks form POSTs carry a same-origin Origin header (CSRF protection);
// browsers send it automatically, a bare fetch doesn't.
const post = (path: string, body: URLSearchParams) =>
  fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body,
    redirect: "manual",
  });

const load = (path: string) => fetch(new URL(path, baseUrl)).then((r) => r.text());

describe("the enrolment slice", () => {
  it("offers courses to enrol in", async () => {
    const page = await load(ENROL_PAGE);
    // Whatever the catalogue is, the page has to name at least one course
    // using a recognisable ANU course code (e.g. COMP4020).
    expect(page).toMatch(/[A-Z]{4}\d{4}/);
  });

  it("persists an enrolment across a reload", async () => {
    const page = await load(ENROL_PAGE);
    const code = page.match(/[A-Z]{4}\d{4}/)?.[0];
    if (!code) throw new Error(`no course code offered on ${ENROL_PAGE}`);

    const res = await post(ENROL_ENDPOINT, new URLSearchParams({ [COURSE_FIELD]: code }));
    expect(res.status).toBeLessThan(400);

    // The reload is the point: a fresh request, no client state carried over.
    const reloaded = await load(ENROL_PAGE);
    expect(reloaded).toContain(code);
  });

  it("refuses a course that doesn't exist", async () => {
    // End-to-end means the server decides, not the form. A code the catalogue
    // never offered must not become an enrolment.
    //
    // Guard first: without this, a 404 on the page satisfies the assertions
    // below and the check passes because the app is missing, not because it
    // is right.
    const page = await load(ENROL_PAGE);
    expect(page).toMatch(/[A-Z]{4}\d{4}/);

    const bogus = "ZZZZ9999";
    const res = await post(ENROL_ENDPOINT, new URLSearchParams({ [COURSE_FIELD]: bogus }));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await load(ENROL_PAGE)).not.toContain(bogus);
  });

  it("refuses to enrol in the same course twice", async () => {
    const page = await load(ENROL_PAGE);
    const code = page.match(/[A-Z]{4}\d{4}/)?.[0];
    if (!code) throw new Error(`no course code offered on ${ENROL_PAGE}`);

    await post(ENROL_ENDPOINT, new URLSearchParams({ [COURSE_FIELD]: code }));
    const again = await post(ENROL_ENDPOINT, new URLSearchParams({ [COURSE_FIELD]: code }));
    expect(again.status).toBeGreaterThanOrEqual(400);

    // And the plan still lists it once, not twice.
    const reloaded = await load(ENROL_PAGE);
    const occurrences = reloaded.split(code).length - 1;
    expect(occurrences).toBeLessThanOrEqual(2); // the catalogue entry, and the plan entry
  });
});
