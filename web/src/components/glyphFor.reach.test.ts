// ---------------------------------------------------------------------------
// Every button can reach a glyph, or it is named here.
//
// glyphFor answers `undefined` for a key nothing matches, and that is a real
// answer rather than a bug: a button with no glyph keeps showing its text, which
// beats a symbol that means nothing. What is NOT fine is a button that falls
// back to text while the buttons beside it show symbols, because in glyph mode
// and in reactive mode that one button prints a word into a row of marks. The
// user sees an inconsistency, not a considered exception.
//
// The count only ever grows on its own. It was recorded as "about 20" in a note
// from an earlier round; measured on the day this guard was written it was 25,
// and two of those had arrived with the release shipped the same morning. That
// is what a missing guard looks like: not a defect that appears once, but a
// number that drifts upward while everything stays green.
//
// THE ONE RULE THIS GUARD DOES NOT GET: no allow-list. ArrowLoop's equivalent
// says why in its own words, and it holds here - from outside, a documented
// exception and a forgotten button are indistinguishable. BombVault has a better
// mechanism anyway, and it is already in the codebase: a call site that really
// wants no glyph writes `glyph=` explicitly, which is visible at the call site
// and cannot rot in a list somebody else maintains.
//
// Three differences from ArrowLoop's version, all forced by this codebase:
//
//   1. The unit is the TAG, not the file. Whether a call site is exempt depends
//      on a prop sitting beside labelKey, so a file-wide grep cannot answer it.
//   2. EVERY branch of a ternary has to resolve, not just one. A single call
//      site can carry two keys (a Pause/Resume pair), and only one of them is on
//      screen at a time - a pass because the other branch resolved is a button
//      that loses its glyph half the time.
//   3. A key held in a variable is a third state. It is reported as
//      unresolvable rather than skipped, because skipping it is a blind spot
//      that grows exactly where somebody factors a key out.
// ---------------------------------------------------------------------------
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buttonTags } from "./buttonTags.testsupport";
import { glyphFor } from "./glyphFor";

const SRC = join(__dirname, "..");
const TAGS = buttonTags(SRC);

/**
 * The keys a single call site can produce, and whether the site names any key
 * at all. `null` contributes nothing and is not a gap - the hygiene guard next
 * door is the one that insists the prop is present.
 */
function keysOf(props: string): { keys: string[]; hasExpression: boolean } {
  const m = /\blabelKey\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([\s\S]*?)\})/.exec(props);
  if (!m) return { keys: [], hasExpression: false };
  const literal = m[1] ?? m[2];
  if (literal !== undefined) return { keys: [literal], hasExpression: false };

  const expr = m[3] ?? "";
  if (/^\s*null\s*$/.test(expr)) return { keys: [], hasExpression: false };

  // A comparison inside the expression carries string literals that are NOT
  // keys: `labelKey={mode === "dr" ? a : b}` would otherwise contribute "dr".
  // Strip the comparisons first, then harvest what is left.
  const body = expr.replace(/[=!]==?\s*["'][^"']*["']/g, "");
  const keys = Array.from(body.matchAll(/["']([^"']+)["']/g)).map((k) => k[1]);
  return { keys, hasExpression: keys.length === 0 };
}

type Gap = { where: string; detail: string };

const gaps: Gap[] = [];
for (const tag of TAGS) {
  // An explicit glyph is the exemption, stated at the call site. `variant="chip"`
  // is the other: a chip never shows a glyph in any mode.
  if (/\bglyph\s*=/.test(tag.props)) continue;
  if (/\bvariant\s*=\s*["']chip["']/.test(tag.props)) continue;

  const { keys, hasExpression } = keysOf(tag.props);
  const where = `${tag.file}:${tag.line}`;

  if (hasExpression) {
    gaps.push({ where, detail: "labelKey is an expression with no literal in it, so nothing here can say whether it resolves" });
    continue;
  }
  if (keys.length === 0) continue; // null, or no labelKey: the hygiene guard's business

  const unreachable = keys.filter((k) => glyphFor(k) === undefined);
  if (unreachable.length > 0) {
    gaps.push({ where, detail: unreachable.join(", ") });
  }
}

describe("glyph reach", () => {
  // The scanner has to prove it scanned. A broken parser reports perfect
  // coverage of nothing, silently, and that is the failure mode a guard like
  // this actually dies of.
  it("the scan reached the buttons", () => {
    expect(
      TAGS.length,
      "the <Button> scan found almost nothing, so it is measuring its own regex\n" +
        "rather than the app. Compare against: grep -rc '<Button' over web/src.",
    ).toBeGreaterThan(150);
    const distinct = new Set(TAGS.flatMap((t) => keysOf(t.props).keys));
    expect(
      distinct.size,
      "almost no distinct labelKeys came out of the tags, so the key extraction\n" +
        "is broken even though the tag scan worked.",
    ).toBeGreaterThan(100);
  });

  it("every button reaches a glyph, or says so at its own call site", () => {
    const report = gaps.map((g) => `  ${g.where}  ${g.detail}`).join("\n");
    expect(
      gaps,
      `These buttons print a word where their neighbours print a symbol:\n\n${report}\n\n` +
        `Two ways out, and an allow-list is not one of them:\n` +
        `  - add a rule to RULES in glyphFor.tsx, so the verb gets its mark everywhere;\n` +
        `  - or write glyph={...} at the call site, which states the exception where\n` +
        `    somebody reading that button will see it.\n` +
        `A key held in a variable has to be resolved by hand or given an explicit\n` +
        `glyph; this guard cannot follow it, and saying so beats skipping it.`,
    ).toEqual([]);
  });
});
