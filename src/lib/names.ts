import catalogue from "../data/catalogue.json";
import titles from "../data/titles.json";

// How a course is named to a student: its title. This session's catalogue
// first, then every COMP course ANU lists (requisites often name courses not
// offered this session), and the code only as a last resort.
const known = new Map<string, string>([
  ...Object.entries(titles as Record<string, string>),
  ...catalogue.courses.map((c) => [c.code, c.title] as [string, string]),
]);

export const courseName = (code: string): string => known.get(code) ?? code;
