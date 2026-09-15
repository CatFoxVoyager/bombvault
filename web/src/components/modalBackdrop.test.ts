import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

/**
 * One window, one backdrop, one darkness.
 *
 * A modal backdrop in this app is `.glim-modal-backdrop`, and that class now
 * carries BOTH halves of what a backdrop does: the fade-in it always carried,
 * and the darkness, which used to be written beside it at every call site as
 * `bg-black/60`. jdp asked for a darker one (2026-09-10: "wenn man es öffnet
 * dunkelt es den Hintergrund zu wenig ab"), and a value repeated at nine call
 * sites is standardised only until the first time somebody wants it changed.
 *
 * A test rather than a note, because counting is what caught the bug and
 * nothing else would have. Removing `bg-black/60` from all nine looked like a
 * clean sweep and would have left FIVE windows with no darkness at all: four
 * of the nine backdrops carried `.glim-modal-backdrop`, five had only the
 * literal, and the two sets were never the same set. Nobody reading one call
 * site could see that - each one is correct on its own page.
 *
 * So both halves are checked, and the second is the one with teeth: a new
 * window whose backdrop forgets the class is now a failing test rather than a
 * dialog that opens over a fully readable page.
 *
 * Matched on `fixed inset-0 z-50`, which is what makes a div a backdrop here
 * (nine of them, all written that way). It reads string and template literals
 * rather than lines, the same way hoverRamp.test.ts does and for the same
 * reason: neighbouring lines belong to different elements.
 */

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..");

/** What marks a div as a modal backdrop in this codebase. */
const BACKDROP = "fixed inset-0 z-50";

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return entry === "node_modules" ? [] : tsxFiles(full);
    if (!full.endsWith(".tsx") || full.includes(".test.")) return [];
    return [full];
  });
}

/** Every quoted string and template chunk in a file, without its quotes. */
function literals(source: string): string[] {
  return (source.match(/"[^"\n]*"|'[^'\n]*'|`[^`]*`/g) ?? []).map((raw) => raw.slice(1, -1));
}

const backdrops = tsxFiles(src).flatMap((file) =>
  literals(readFileSync(file, "utf8"))
    .filter((text) => text.includes(BACKDROP))
    .map((text) => ({ where: relative(src, file), text }))
);

it("finds the backdrops at all", () => {
  // The guard below passes vacuously if the search stops matching - a rename
  // of the shared class list would silently switch this whole file off.
  expect(backdrops.length).toBeGreaterThanOrEqual(9);
});

it("gives every modal backdrop the class that darkens it", () => {
  for (const { where, text } of backdrops) {
    expect(text, where).toContain("glim-modal-backdrop");
  }
});

it("paints the darkness unconditionally, never inside a motion query", () => {
  // The third half of this, found by the GlimStone 1.11.0 lift and worth its
  // own test because it is invisible from every call site: the class had the
  // darkness, and the class itself sat inside
  // `@media (prefers-reduced-motion: no-preference)` together with its fade.
  // So somebody whose system asks for less motion got no scrim at all - a
  // dialog floating over a fully undimmed page - and every check above passed,
  // because the call sites were all correct and the class did exist.
  //
  // Darkening the page is not motion. The fade is, and that one may stay
  // gated. The test reads the stylesheet's own structure rather than a
  // rendered page, because no test that renders a dialog can see a media query
  // it is not currently matching.
  const css = readFileSync(join(src, "index.css"), "utf8");

  // Everything that lies INSIDE a prefers-reduced-motion query, by brace
  // counting from each query's own opening brace.
  const gated: string[] = [];
  const q = /@media\s*\([^)]*prefers-reduced-motion[^)]*\)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = q.exec(css))) {
    let depth = 1;
    let i = m.index + m[0].length;
    const from = i;
    for (; i < css.length && depth > 0; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
    }
    gated.push(css.slice(from, i));
  }

  expect(
    gated.length,
    "no prefers-reduced-motion query was found in index.css, so this test is\n" +
      "checking nothing. The query's shape changed.",
  ).toBeGreaterThan(0);

  for (const block of gated) {
    const rule = /\.glim-modal-backdrop\s*\{([^}]*)\}/.exec(block);
    if (!rule) continue;
    expect(
      rule[1],
      "the backdrop's own colour is declared inside a prefers-reduced-motion\n" +
        "query. A reader who asks their system for less motion then gets NO\n" +
        "darkening, and a window floating over an undimmed page. Move the\n" +
        "background out to the unconditional rule and leave only the animation\n" +
        "in here.",
    ).not.toMatch(/background/);
  }
});

it("takes its darkness from the token, not from a literal", () => {
  // GlimStone 1.11.0 made the value a token because a literal is a value the
  // rule describes and nothing holds: asked to change it, somebody has to find
  // every place it was typed. This app had it in one place, which was the
  // previous fix - one place is still not the same as one NAME.
  const css = readFileSync(join(src, "index.css"), "utf8");
  const rules = Array.from(css.matchAll(/\.glim-modal-backdrop\s*\{([^}]*)\}/g)).map((r) => r[1]);
  const painting = rules.filter((body) => /background/.test(body));

  expect(painting.length, "no .glim-modal-backdrop rule paints a background at all").toBe(1);
  expect(
    painting[0],
    "the backdrop paints a literal colour. It takes --glim-scrim, which the\n" +
      "theme blocks set to .65 dark and .55 light.",
  ).toMatch(/var\(--glim-scrim\)/);
});

it("keeps the darkness in the class, not beside it", () => {
  // A second value on the element wins or loses against the class depending on
  // which one Tailwind emits last, so two windows would darken differently
  // and only one of them would answer to index.css.
  for (const { where, text } of backdrops) {
    expect(text, where).not.toMatch(/bg-black\//);
  }
});
