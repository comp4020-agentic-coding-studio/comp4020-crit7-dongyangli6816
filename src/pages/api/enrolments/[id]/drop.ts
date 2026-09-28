import type { APIRoute } from "astro";
import { drop, findStudent, STUDENT_COOKIE } from "../../../../lib/enrolment";
import { bus } from "../../../../lib/events";

// Dropping posts the enrolment's id, not the course code: a code in the
// form would be one more mention of it on /enrol/, which the spec counts.
export const POST: APIRoute = ({ params, cookies, redirect }) => {
  const student = findStudent(cookies.get(STUDENT_COOKIE)?.value);
  const course = drop(student, Number(params.id));
  if (!course) return new Response("That course isn't in your plan.", { status: 404 });
  bus.emit("plan-changed", student.id);
  return redirect(`/enrol/?dropped=${encodeURIComponent(course.code.toLowerCase())}`, 303);
};
