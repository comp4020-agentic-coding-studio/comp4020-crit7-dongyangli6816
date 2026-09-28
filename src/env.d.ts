declare namespace App {
  interface Locals {
    /** A refused enrolment, handed from POST /api/enrolments to the /enrol/
     *  page it re-renders, so the refusal is shown next to its card with a
     *  real 4xx status. */
    enrolRefusal?: { code: string; reason: string; status: number };
  }
}
