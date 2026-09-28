import { describe, expect, inject, it } from "vitest";
import { ROUTES } from "./routes";

// Everything a page asks the browser to load from this server has to load.
// The invariants read each page's HTML; they never fetch what it points at,
// so a README image could 500 in production with every test green.
const baseUrl = inject("baseUrl");

describe.each(ROUTES)("assets on %s", (route) => {
  it("all load", async () => {
    const html = await fetch(new URL(route, baseUrl)).then((r) => r.text());
    const refs = [
      ...html.matchAll(/<img[^>]*\ssrc="([^"]+)"/g),
      ...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g),
      ...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g),
    ].map((m) => m[1].replaceAll("&amp;", "&"));
    const own = refs.filter((ref) => new URL(ref, baseUrl).origin === new URL(baseUrl).origin);
    for (const ref of own) {
      const res = await fetch(new URL(ref, new URL(route, baseUrl)));
      expect(res.status, ref).toBe(200);
    }
  });
});
