import type { APIRoute } from "astro";
import { findStudent, STUDENT_COOKIE } from "../../lib/enrolment";

// The demo's stand-in for logging in: remember which student is looking.
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const student = findStudent(String(form.get("student") ?? ""));
  cookies.set(STUDENT_COOKIE, student.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  return redirect("/enrol/", 303);
};
