import type { APIRoute } from "astro";
import { enrol, findStudent, STUDENT_COOKIE } from "../../lib/enrolment";
import { bus } from "../../lib/events";

// A plain HTML form posts here. Enrolling is the whole commit: there is no
// second step to forget (compare ISIS, docs/research/isis-enrolment.md).
//
// Success redirects back to the plan (303, so a reload doesn't re-post).
// A refusal re-renders /enrol/ in place with the reason beside the course
// and a real 4xx status: the server decides, not the form.
export const POST: APIRoute = async (ctx) => {
  // Read a clone: Astro can't rewrite a request whose body is consumed.
  const form = await ctx.request.clone().formData();
  const code = String(form.get("courseCode") ?? "").trim().toUpperCase();
  const student = findStudent(ctx.cookies.get(STUDENT_COOKIE)?.value);

  const result = enrol(student, code);
  if (!result.ok) {
    ctx.locals.enrolRefusal = { code: result.code, reason: result.reason, status: result.status };
    return ctx.rewrite("/enrol/");
  }
  bus.emit("plan-changed", student.id);
  return ctx.redirect(`/enrol/?enrolled=${result.enrolmentId}`, 303);
};
