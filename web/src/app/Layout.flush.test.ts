// ---------------------------------------------------------------------------
// The page column ends where the rail ends; and the phone column ends where
// the bottom bar sits.
//
// jdp, live review: "die unterste card scrollt weiter hoch als die unterkante
// der sidebar". Measured in the browser at 1600x900 before the fix: with the
// scroll at its end the rail's bottom edge sat at y=884 and the last card's at
// y=860, on every route. The 24 pixels were the page wrapper's own bottom
// padding, inside the scroll container, so they could never be scrolled away.
//
// The mobile half is the same property one branch down: a kept bottom padding
// on the phone scroller clamps a sticky action bar 16px short of the bottom
// bar and leaves a strip of scrolling page visible between the two; the
// exact strip the shell's flush page end exists to prevent.
//
// A source guard rather than a render test on purpose: what has to hold is a
// property of one className on one element, and a jsdom render measures nothing
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

// The phone scroller: the one branch main that carries the 16px gutter class
// itself (the desktop main stays gutter-free; the frame owns it there).
const mobileMain = /<main id="bv-main" className="([^"]*p-4[^"]*)"/.exec(layout);

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

  it("has a phone scroller this guard can actually see", () => {
    expect(mobileMain).not.toBeNull();
  });

  it("carries no bottom padding on the phone scroller, so the sticky action bar reaches the bottom bar", () => {
    const cls = mobileMain![1];
    expect(cls).toContain("p-4");
    expect(cls).toContain("pb-0");
    expect(/\bpb-(?!0\b)\d/.test(cls)).toBe(false);
    expect(/\bpy-\d/.test(cls)).toBe(false);
  });
});
