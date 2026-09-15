// ---------------------------------------------------------------------------
// The storm outranks the operating system.
//
// Every other motion level sits strictly inside
// `@media (prefers-reduced-motion: no-preference)`, which is what enforces
// "the OS wins": a browser reporting reduced motion never even evaluates a
// data-motion selector for those properties. motion.ts's own header says so,
// and for the three offered levels it stays true.
//
// "storm" is the exception, on jdp's call (2026-09-15): it is a hidden level
// reached by clicking the same option five times, so choosing it is a
// statement of intent rather than a default somebody inherited.
//
// The gate lives in the `reduce` block, not in the 225-line no-preference
// one. That block does not switch motion off; it swaps in gentler
// substitutes (a fade instead of a shake, a fade instead of the logo
// shattering), and those substitutes ARE the ones that make the storm the
// storm. So each of them now excludes storm, and storm gets the full
// animation back in the same block. The micro-interactions in the
// no-preference block (press, lift, spinner) stay OS-gated: they are not
// what anybody unlocks a storm for.
//
// Node environment: this reads the stylesheet, it does not render.
// ---------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(HERE, "..", "index.css"), "utf8");

/** The body of the `@media (prefers-reduced-motion: reduce)` block that
 *  carries the substitutes, found by brace matching rather than by a line
 *  number so an edit above it cannot silently point this test at nothing. */
function reduceBlock(): string {
  const needle = "@media (prefers-reduced-motion: reduce)";
  let from = -1;
  // The file has several such blocks; the substitutes live in the last one.
  for (let i = css.indexOf(needle); i !== -1; i = css.indexOf(needle, i + 1)) from = i;
  expect(from).toBeGreaterThan(-1);
  const open = css.indexOf("{", from);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error("unbalanced reduce block");
}

/** Every substitute in that block, as selector plus declaration. */
function substitutes(): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = [];
  const body = reduceBlock().replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim();
    if (selector) out.push({ selector, body: m[2].trim() });
  }
  return out;
}

describe("the reduce block", () => {
  it("still carries substitutes rather than switching motion off", () => {
    // The premise. If a future pass turns this block into `animation: none`
    // everywhere, the storm exemption below needs rethinking, not keeping.
    const subs = substitutes();
    expect(subs.length).toBeGreaterThan(4);
    expect(subs.some((s) => /animation:/.test(s.body))).toBe(true);
  });

  it("exempts the storm from every gentler substitute", () => {
    const offenders = substitutes()
      .filter((s) => /animation:|display:|opacity:/.test(s.body))
      .filter((s) => !/:root\[data-motion="storm"\]/.test(s.selector))
      .filter((s) => !/:root:not\(\[data-motion="storm"\]\)/.test(s.selector))
      .map((s) => s.selector);
    expect(offenders).toEqual([]);
  });

  it("gives the storm the full animation back, not just an exemption", () => {
    // Exempting without restoring would leave a storm user with NO animation
    // on these elements under reduced motion, which is worse than the gentle
    // substitute it replaced.
    const subs = substitutes();
    const storm = subs.filter((s) => /:root\[data-motion="storm"\]/.test(s.selector));
    expect(storm.length).toBeGreaterThan(3);

    /** The element a gated selector targets, without its :root prefix. */
    const target = (sel: string) => sel.replace(/:root(:not\()?\[data-motion="storm"\]\)?\s*/g, "").trim();
    const gentle = new Map(
      subs
        .filter((s) => /:root:not\(\[data-motion="storm"\]\)/.test(s.selector))
        .map((s) => [target(s.selector), s.body]),
    );

    // Not "contains no fade": the modal backdrop fades at full motion too,
    // just for longer, so banning the keyword would fail on correct code.
    // What has to hold is that storm does not get handed the SAME
    // declaration the reduced-motion substitute uses.
    let compared = 0;
    for (const rule of storm) {
      const sub = gentle.get(target(rule.selector));
      if (sub === undefined) continue;
      compared += 1;
      expect(rule.body).not.toBe(sub);
    }
    expect(compared).toBeGreaterThan(3);
  });
});

describe("the three offered levels stay OS-gated", () => {
  it("keeps the main motion rules inside the no-preference block", () => {
    const needle = "@media (prefers-reduced-motion: no-preference)";
    let found = false;
    for (let i = css.indexOf(needle); i !== -1; i = css.indexOf(needle, i + 1)) {
      const open = css.indexOf("{", i);
      let depth = 0;
      for (let j = open; j < css.length; j++) {
        if (css[j] === "{") depth++;
        else if (css[j] === "}") {
          depth--;
          if (depth === 0) {
            const body = css.slice(open + 1, j);
            if (body.includes(".glim-btn:active") && body.includes(".glim-stagger-row")) found = true;
            i = j;
            break;
          }
        }
      }
    }
    expect(found).toBe(true);
  });
});
