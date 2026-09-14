// ---------------------------------------------------------------------------
// A motion rule names the QUIET levels, never the lively one.
//
// `[data-motion="wild"] .thing` looks like "apply this at full intensity" and
// is a trap with two separate bites. It excludes every level ABOVE wild, so the
// storm - a level that asks for MORE motion - gets none of the animation it is
// asking for. And it excludes the attribute being ABSENT, which is the state
// the page is in before the boot code paints it, even though the token block
// further down treats bare `:root` as exactly the wild numbers.
//
// Both bites have already been felt. GlimStone shipped two rules keyed on
// `[data-motion="full"]` while the module writing the attribute had been
// renamed to `wild`: they matched nothing at all, anywhere, and nothing went
// red. The spelling was corrected, and the correction would have gone on
// excluding the storm - which is why the rule is about the SHAPE of the
// selector and not about spelling a level correctly.
//
// So: name what must NOT happen. `:not([data-motion="subtle"]):not([data-motion="off"])`
// covers wild, storm, the attribute being absent, and whatever gets added above
// wild later, without anybody having to come back here.
//
// The scan is over the stylesheet rather than the DOM on purpose. A DOM test
// sees the levels it renders; the defect is a level nobody rendered.
// ---------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CSS = join(dirname(fileURLToPath(import.meta.url)), "..", "index.css");

// Comments go first, and here that is not a nicety either: the rule is
// explained at the two rules it governs, and the explanation has to be allowed
// to quote the wrong form it is warning against.
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

/** The levels a rule must never single out. */
const LIVELY = ["wild", "storm"];

/**
 * Declaring a level's own numbers is not the same as gating an animation on it.
 *
 * `:root[data-motion="storm"] { --motion-page-dist: 34px }` is how a level SAYS
 * what it is, and there is no other way to write it. What the rule forbids is a
 * level standing in front of something else - `[data-motion="wild"] .thing` -
 * because that is where "above wild" and "attribute absent" fall out. So the
 * test is what FOLLOWS the attribute: a brace means a token block, anything
 * else means a rule gating something on the level.
 */
function gatesSomething(css: string, end: number): boolean {
  return !/^\s*\{/.test(css.slice(end));
}

describe("motion selectors", () => {
  const css = code(readFileSync(CSS, "utf8"));

  it("never key an animation on a lively level by name", () => {
    const offenders: string[] = [];
    for (const level of LIVELY) {
      const pattern = new RegExp(`\\[data-motion=["']${level}["']\\]`, "g");
      for (const m of css.matchAll(pattern)) {
        if (!gatesSomething(css, m.index! + m[0].length)) continue;
        const line = css.slice(0, m.index!).split("\n").length;
        offenders.push(
          `index.css:${line} - ${m[0]} names a lively level, so every level above it ` +
            `and the attribute being absent both fall out of this rule. ` +
            `Write :root:not([data-motion="subtle"]):not([data-motion="off"]) instead.`
        );
      }
    }
    expect(offenders).toEqual([]);
  });

  it("still has quiet-level rules to protect, so the scan can find something", () => {
    // Without this the guard passes on an empty file, on a renamed attribute,
    // and on a stylesheet that lost the motion engine altogether - three ways
    // to read exactly like a stylesheet that follows the rule.
    const quiet = [...css.matchAll(/\[data-motion=["'](subtle|off)["']\]/g)];
    expect(quiet.length).toBeGreaterThanOrEqual(8);
  });

  it("declares the hidden level's own token block", () => {
    // The storm is the reason the rule above exists. If its block is ever
    // dropped, the selector rule still passes while the level it was written
    // for renders at the default numbers - correct-looking and inert.
    expect(css).toContain(':root[data-motion="storm"]');
  });
});
