// ---------------------------------------------------------------------------
// The page column ends where the rail ends.
//
// jdp, live review: "die unterste card scrollt weiter hoch als die unterkante
// der sidebar". Measured in the browser at 1600x900 before the fix: with the
// scroll at its end the rail's bottom edge sat at y=884 and the last card's at
// y=860, on every route. The 24 pixels were the page wrapper's own bottom
// padding, inside the scroll container, so they could never be scrolled away.
//
// A source guard rather than a render test on purpose: what has to hold is a
// property of ONE className on ONE element, and a jsdom render measures nothing
// (no layout, no scrolling), so a DOM test here would assert the same string
// through three times the machinery and claim to have measured something.
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const layout = readFileSync(join(here, "Layout.tsx"), "utf8");

// The per-route wrapper inside <main>, identified by the entry animation class
// it is the only carrier of.
const pageWrapper = /className="glim-page-enter([^"]*)"/.exec(layout);

describe("the scrolling page column", () => {
  it("has a wrapper this guard can actually see", () => {
    expect(pageWrapper).not.toBeNull();
  });

  it("carries no bottom padding, so the last card ends level with the rail", () => {
    const cls = pageWrapper![1];
    expect(cls).toContain("pb-0");
    // …and nothing that reinstates it. `p-6` alone sets all four sides, which
    // is why the fix is `p-6 pb-0` and not a removal: the other three sides are
    // the page's own gutter and have to stay.
    expect(/\bpb-(?!0\b)\d/.test(cls)).toBe(false);
    expect(/\bpy-\d/.test(cls)).toBe(false);
  });
});
