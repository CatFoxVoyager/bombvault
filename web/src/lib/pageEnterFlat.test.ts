// ---------------------------------------------------------------------------
// The page entrance translates. It does not scale and it does not rotate.
//
// WHAT THIS FILE GUARDS, and what it does NOT claim.
//
// It guards an invariant: the page entrance translates, and does not scale or
// rotate. That is worth holding on its own terms - a flatter entrance at the
// top of the range, and one spatial dial instead of three.
//
// It is NOT a fix for #228, and this header said it was. The story was that a
// scale or rotation on an ancestor forces the engine to resample the subtree
// through the parent's matrix, that every animating descendant then holds a
// layer inside a parent being resampled, and that the hued badges came out of
// uninitialised layer memory as #38FF38. Removing both shipped as v8.10.1 with
// the words "fixed at the cause". The reporter re-tested: wild is unchanged.
//
// The mechanism is unconfirmed and the arithmetic argues against that version
// of it. #38FF38 is rgb(56, 255, 56): R and B exactly equal, G clipped, which
// is the shape of one wrong byte rather than of uninitialised memory. 56 sits
// inside this app's dark-neutral band (38/53/57), the badge fill is
// rgba(hue, 0.14) over one of those, and 0.86*38 + 0.14*G = 255 has no
// solution - so that box is painted wrong rather than computed wrong. Whether
// it happens in the page or in the compositor cannot be decided from source.
//
// What IS established: the trigger is inside this wrapper's subtree (the
// sidebar is its sibling and never flashed), motion "off" stops it, and it
// depends on intensity. What remains in the file: four transform animations
// across two nesting levels, all on an overshoot curve.
//
// Keep the invariant. Do not let the next reader take the mechanism as settled.
//
// Node environment: this reads the stylesheet, it does not render.
// ---------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const RAW = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "index.css"), "utf8");

/* Comments blanked out before anything is searched, and that is not tidiness:
   the token comments now POINT AT this keyframe by name, so a plain indexOf
   for "@keyframes glim-page-in" finds the sentence mentioning it several
   hundred lines earlier and brace-matches whatever block comes next. Blanked
   rather than deleted so the offsets a failure reports still line up with the
   real file. */
const CSS = RAW.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

/** The body of one @keyframes block. */
function keyframe(name: string): string {
  const at = CSS.search(new RegExp(`@keyframes\\s+${name}\\s*\\{`));
  expect(at).toBeGreaterThan(-1);
  const open = CSS.indexOf("{", at);
  let depth = 0;
  for (let i = open; i < CSS.length; i++) {
    if (CSS[i] === "{") depth++;
    else if (CSS[i] === "}") {
      depth--;
      if (depth === 0) return CSS.slice(open + 1, i);
    }
  }
  throw new Error(`unbalanced @keyframes ${name}`);
}

describe("the page entrance", () => {
  const body = keyframe("glim-page-in");

  it("still moves, so this is a flatter entrance and not a dropped one", () => {
    // Without this the file passes on a keyframe that lost its transform
    // altogether, which is a different change nobody asked for.
    expect(body).toMatch(/translateY\(/);
    expect(body).toMatch(/--motion-page-travel/);
  });

  it("does not scale", () => {
    expect(body).not.toMatch(/\bscale\(/);
  });

  it("does not rotate", () => {
    expect(body).not.toMatch(/\brotate\(/);
  });

  it("leaves no dead tokens behind for either of them", () => {
    // A token still declared per level but read by nothing is worse than no
    // token: the next person tunes the numbers, sees no change, and goes
    // looking for the bug in the keyframe instead of in the wiring.
    expect(CSS).not.toMatch(/--motion-page-scale/);
    expect(CSS).not.toMatch(/--motion-page-tilt/);
  });
});
