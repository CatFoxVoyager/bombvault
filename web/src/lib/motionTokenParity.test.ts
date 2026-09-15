// ---------------------------------------------------------------------------
// Every motion level answers every motion token.
//
// The engine's own rule is that a level is a different NUMBER, never a
// different animation. That only holds if each level actually carries a number
// for each dial: a level that omits one inherits the bare root's, which is the
// LIVELY value - so a quiet level silently keeps a lively number, and the level
// above the default silently keeps the default's.
//
// Both halves have already happened here. The storm block arrived without a
// page scale, so the level that travels furthest arrived at exactly the size
// the level below it does. And a tilt added to the lively default without a `0`
// in the quiet blocks would have rotated the page for somebody who asked for
// less movement - the first thing such a person would notice.
//
// So: the quiet levels must name every dial the lively default names, and the
// storm must too. The exceptions are listed, each with its reason, because an
// exception that cannot be explained is a gap.
// ---------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const RAW = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "index.css"), "utf8");

// Comments out first, and here it is load-bearing rather than tidy: the bare
// root block carries a long note that NAMES the token families it is about
// ("Shape-morph (--motion-shape-*)"), so a scan that reads comments counts
// seven prose mentions as declarations and then reports them missing from
// every other level. Replaced with blanks so every offset stays where it was.
const CSS = RAW.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

/** The tokens declared in one `:root...{ }` block, by selector. */
function tokensOf(selector: string): Set<string> {
  const at = CSS.indexOf(selector + " {");
  if (at < 0) return new Set();
  const end = CSS.indexOf("\n}", at);
  const body = CSS.slice(at, end);
  return new Set([...body.matchAll(/(--motion-[a-z-]+)\s*:/g)].map((m) => m[1]));
}

/**
 * The lively default is a BARE `:root` block, which the file has several of -
 * colours, shapes and the motion dial all declare on one. So it is found by
 * what it contains rather than by being first, and the difference is not
 * pedantic: keyed on the first `:root {` this guard compared an empty set
 * against three full ones and passed every level.
 */
function livelyDefaults(): Set<string> {
  const marker = CSS.indexOf("--motion-page-dist:");
  const at = CSS.lastIndexOf(":root {", marker);
  return tokensOf2(at);
}

function tokensOf2(at: number): Set<string> {
  if (at < 0) return new Set();
  const body = CSS.slice(at, CSS.indexOf("\n}", at));
  return new Set([...body.matchAll(/(--motion-[a-z-]+)\s*:/g)].map((m) => m[1]));
}

/**
 * Dials a level may legitimately leave to the default.
 *
 * A curve is the one honest omission for a QUIETER level: asking for less
 * movement does not mean asking for a different easing, and the shorter
 * duration is what carries the change. A LIVELIER level has no such excuse,
 * which is why `storm` is not in here.
 */
const QUIET_MAY_OMIT = new Set(["--motion-shape-ease", "--motion-wipe-ease", "--motion-toast-ease"]);

describe("motion tokens", () => {
  const lively = livelyDefaults();

  it("declares the lively default on the bare root", () => {
    // If this ever drops to a handful, the sets below are comparing nothing.
    expect(lively.size).toBeGreaterThanOrEqual(20);
  });

  for (const level of ["subtle", "off"]) {
    it(`${level} answers every dial the default sets`, () => {
      const mine = tokensOf(`:root[data-motion="${level}"]`);
      const missing = [...lively].filter((t) => !mine.has(t) && !QUIET_MAY_OMIT.has(t));
      expect(missing).toEqual([]);
    });
  }

  it("storm answers every dial, curves included", () => {
    // A level asking for MORE that inherits the default's gentler curve gets a
    // longer animation on a softer spring, which reads as sluggish rather than
    // wilder - and the block looks complete while it does.
    const mine = tokensOf(':root[data-motion="storm"]');
    const missing = [...lively].filter((t) => !mine.has(t));
    expect(missing).toEqual([]);
  });

  // The page tilt used to be checked here, as zero wherever somebody asked for
  // less movement. There is no tilt at any level now, and no scale either:
  // both were what made the page entrance nest transforms with the elements
  // animating inside it, which is #228. lib/pageEnterFlat.test.ts is the guard
  // that replaced this one, and it checks the stronger thing - that neither
  // dial exists at all, rather than that the quiet levels neutralise it.
  it("keeps the page's one spatial dial answered at every level", () => {
    for (const level of ["subtle", "off", "storm"]) {
      const at = CSS.indexOf(`:root[data-motion="${level}"] {`);
      const body = CSS.slice(at, CSS.indexOf("\n}", at));
      expect(body).toMatch(/--motion-page-dist:/);
    }
  });
});
