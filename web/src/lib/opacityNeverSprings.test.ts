// ---------------------------------------------------------------------------
// OPACITY NEVER RIDES A SPRING.
//
// A spring curve has a control point past 1, so it drives the interpolated
// value THROUGH its target and back. For a distance that is the whole point.
// For opacity it is meaningless: the value is clamped to 1, so the fade
// finishes early and then sits flat for the rest of the duration. A dial that
// was set to make the entrance longer makes the fade shorter.
//
// That is reason enough on its own. The reason it was done NOW is #228, and it
// is the CAUSE of that flash rather than a guess at it. The evidence, in the
// order it arrived:
//   - The reporter's own data: motion "off" and "subtle" are clean, "wild"
//     flashes. He is on software WebRender already, so a GPU compositor is out.
//   - Nesting cannot be it. At subtle the page translates 6px while its rows
//     translate 6px, so the transforms nest there exactly as they do at wild,
//     and subtle does not flash.
//   - What differs is the curve. Subtle eases, off is linear, wild and storm
//     spring - and the four animations on that spring all interpolate opacity.
//     An alpha driven past 1 into a premultiplied software rasteriser is a
//     route to one saturated channel.
//   - AND THEN IT WAS MEASURED, which is what moved this from plausible to
//     settled. A four-panel file stepped through the change that introduced
//     the flash, with nothing of this app in it: the panels that keep opacity
//     on the springing curve flash, the panel without it does not. The
//     reporter ran it, then updated to the build carrying this separation and
//     answered "No more green with wild!".
// One honest limit on that: the standalone panels flashed WITHOUT the green
// tint, so the file reproduced the flash and not its colour. The colour only
// ever appeared in the app, and it goes when the flash goes.
//
// So: movement keeps the spring, opacity gets its own animation on a
// monotonic curve. Both halves stay in the same rule, which is why this guard
// checks the pairing rather than just the keyframe bodies.
//
// Node environment: this reads the stylesheet, it does not render.
// ---------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const RAW = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "index.css"), "utf8");
/* Comments blanked, not deleted, so reported offsets still match the file. */
const CSS = RAW.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

/** The body of one @keyframes block, found by a real declaration rather than
 *  by a prose mention of its name. */
function keyframe(name: string): string {
  const at = CSS.search(new RegExp(`@keyframes\\s+${name}\\s*\\{`));
  expect(at, `@keyframes ${name} not found`).toBeGreaterThan(-1);
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

/** Every `animation:` shorthand in the file that names this keyframe. */
function usages(keyframeName: string): string[] {
  const out: string[] = [];
  for (const m of CSS.matchAll(/animation:\s*([^;]+);/g)) {
    if (new RegExp(`\\b${keyframeName}\\b`).test(m[1])) out.push(m[1].replace(/\s+/g, " ").trim());
  }
  return out;
}

/** The four keyframes driven by a per-level curve that move something. */
const MOVERS = ["glim-page-in", "glim-tab-slide", "glim-card-in", "glim-row-in"];

/** Whichever comma-separated part of an `animation:` shorthand runs `name`. */
function part(shorthand: string, name: string): string {
  return shorthand.split(",").find((p) => new RegExp(`\\b${name}\\b`).test(p)) ?? "";
}

describe("nothing fades on a spring", () => {
  // THE ONE INVARIANT, and it is deliberately about the pairing of keyframe
  // and curve rather than about either alone. Two routes satisfy it and both
  // are in use:
  //   - a transform-only keyframe paired with glim-fade-in on ease-out (the
  //     page, the tab panel, the notch card), or
  //   - a keyframe that fades, driven by a curve that does not spring (the
  //     staggered row, which exists in the dozens and cannot afford the
  //     parse cost of a two-animation shorthand - see its own comment).
  // A guard written against one route would have forced the expensive one
  // everywhere, which is how a 5s test budget turned into 8.8s once already.
  for (const name of MOVERS) {
    it(`${name} never has opacity on --motion-page-ease`, () => {
      const fades = /opacity:/.test(keyframe(name));
      const uses = usages(name);
      expect(uses.length, `${name} is declared nowhere`).toBeGreaterThan(0);

      for (const use of uses) {
        const mine = part(use, name);
        if (fades) {
          expect(mine, `${name} fades, so its own curve must not spring: ${use}`).not.toMatch(
            /--motion-page-ease/
          );
          continue;
        }
        // Transform-only: something still has to bring the opacity, and that
        // something must not spring either.
        expect(use, `${name} moves without a paired fade: ${use}`).toMatch(/glim-fade-in/);
        expect(part(use, "glim-fade-in"), `the fade beside ${name} springs: ${use}`).not.toMatch(
          /--motion-page-ease/
        );
      }
    });
  }

  it("still moves something at every one of them", () => {
    // Without this the file passes on four keyframes that lost their
    // transforms, which is a different change from the one intended.
    for (const name of MOVERS) expect(keyframe(name), `${name} stopped moving`).toMatch(/transform:/);
  });
});

describe("the fade keyframe itself", () => {
  it("is declared exactly once", () => {
    // It was declared twice, identically, back to back. The later one won, so
    // nothing misbehaved and nothing said so either.
    const count = [...CSS.matchAll(/@keyframes\s+glim-fade-in\s*\{/g)].length;
    expect(count).toBe(1);
  });

  it("fades and nothing else, since four rules now lean on it", () => {
    const body = keyframe("glim-fade-in");
    expect(body).toMatch(/opacity:/);
    expect(body).not.toMatch(/transform:/);
  });
});
