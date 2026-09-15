// ---------------------------------------------------------------------------
// The page entrance translates. It does not scale and it does not rotate.
//
// #228, and the second attempt at it. The first moved the DEFAULT from wild to
// subtle, which meant a first-time visitor no longer met the bug - and left it
// exactly where it was for anybody who chose wild, including the reporter,
// whose stored choice a changed default never reaches. "Fixed by making it the
// non-default" is mitigation; this file is the fix.
//
// WHAT THE BUG ACTUALLY IS. `.glim-page-enter` sits on the route wrapper and
// animated `translateY() scale() rotate()`. The cards and rows inside it
// animate transforms of their own (`.glim-stagger-row`, `.glim-pulse`). A
// scale or a rotation on an ancestor cannot be composited independently of its
// subtree the way a translation can: the engine has to resample everything
// underneath through the parent's matrix, so every animating descendant gets
// its own layer inside a parent that is itself being resampled. On
// Firefox/macOS the hued badges came out of uninitialised layer memory as
// #38FF38, which is the green flash; Chromium got the colour right and showed
// the same double resampling as the page trembling before it settled. Two
// engines, two symptoms, one cause.
//
// SO THE ENERGY MOVES INTO THE AXES THAT DO NOT NEST. Distance, duration and
// curve already separate the levels: wild travels 18px against subtle's 6px,
// for longer, on a spring that overshoots. That is a visibly livelier entrance
// without asking the compositor to resample the page.
//
// The storm is included, and it is the one that most needed it: 3deg and .9
// were the largest values in the file, and since the OS exemption it is also
// the only level that animates for somebody who asked for less motion.
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
    expect(body).toMatch(/--motion-page-dist/);
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
