// How dates, days and times read on the page: day-first dates the way
// Australians write them (ISIS shows 2026/07/27), short weekday names, and a
// one-line summary of when a course meets.
import { type Slot, weekly } from "./rules";

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

/** "2027-02-22" → "22 Feb 2027" */
export function formatDate(iso: string | null, withYear = true): string {
  if (!iso) return "not yet announced";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ""}`;
}

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
export const shortDay = (day: string) => day.slice(0, 3);

/** "Computer Laboratory" → "lab"; the timetable's names are long. */
export function kindName(kind: string): string {
  const k = kind.toLowerCase();
  if (k.includes("laboratory")) return "lab";
  if (k.includes("tutorial")) return "tutorial";
  if (k.includes("workshop")) return "workshop";
  if (k.includes("seminar")) return "seminar";
  if (k.includes("lecture")) return "lecture";
  return k;
}

/** One line for a course card: the fixed classes with their times, then the
 *  ones picked later. "Lecture Mon 13:00–15:00 · tutorial: choose 1 of 17". */
export function meetingSummary(slots: Slot[]): string | null {
  const { fixed, choices } = weekly(slots);
  if (!fixed.length && !choices.length) return null;
  const parts = [
    ...fixed
      .sort((a, b) => DAYS.indexOf(a.day as never) - DAYS.indexOf(b.day as never))
      .map((s) => `${kindName(s.kind)} ${shortDay(s.day)} ${s.start}–${s.end}`),
    ...choices.map((streams) => `${kindName(streams[0][0].kind)}: choose 1 of ${streams.length}`),
  ];
  const line = parts.join(" · ");
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/** The first sentence of a description, for a card. */
export function firstSentence(text: string): string {
  const para = text.split("\n")[0] ?? "";
  const m = para.match(/^.{40,}?[.!?](?=\s|$)/);
  return m ? m[0] : para;
}
