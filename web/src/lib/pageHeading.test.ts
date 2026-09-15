// ---------------------------------------------------------------------------
// Every page wears the same heading.
//
// The house form is one line of markup repeated on each page of the app:
//
//   <h1 className="text-2xl font-semibold text-carbon-text">…</h1>
//   <p className="mt-1 text-sm text-carbon-textSub">…</p>
//
// Recovery drifted off it and nobody noticed for months: text-lg instead of
// text-2xl, and the dimmer text-carbon-textMuted instead of text-carbon-textSub.
// So the tab with the most frightening job in the app - the one somebody opens
// after losing their configuration - had the quietest heading in it, and it was
// jdp who spotted it in the live review rather than any test.
//
// That is the shape of defect this file exists for: not a broken behaviour, a
// SILENT DIVERGENCE between siblings, which no unit test and no type checker can
// see because each page is correct on its own terms. A source scan is the right
// instrument for "these distant lines must agree", and the wrong one for almost
// everything else - see named_repos_reach_internal_test.go for the same tool
// used on the Go side, and for what it costs when it is pointed at the wrong
// question.
// ---------------------------------------------------------------------------
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const PAGES = join(dirname(fileURLToPath(import.meta.url)), "..", "pages");

// Glyphs.tsx is a developer sheet, not a page of the product: it is reachable
// only by typing its route, carries no nav entry and no translated title.
// Login.tsx is the pre-authentication screen - one centred card, no tab, no
// subtitle - and its heading is deliberately its own.
const NOT_A_TAB = new Set(["Glyphs.tsx", "Login.tsx"]);

function pageFiles(): string[] {
  return readdirSync(PAGES).filter((f) => /^[A-Z].*\.tsx$/.test(f) && !/\.test\.tsx$/.test(f) && !NOT_A_TAB.has(f));
}

describe("every tab's heading", () => {
  it("finds the pages at all (so an empty scan cannot pass)", () => {
    expect(pageFiles().length).toBeGreaterThan(6);
  });

  it.each(pageFiles())("%s uses the house size and the house subtitle colour", (file) => {
    const src = readFileSync(join(PAGES, file), "utf8");
    const h1 = src.match(/<h1 className="([^"]*)"/);
    expect(h1, `${file} has no <h1 className="…">; every tab needs one heading`).not.toBeNull();
    expect(
      h1![1],
      `${file}'s heading is "${h1![1]}", want the house form "text-2xl font-semibold text-carbon-text".\n` +
        `A tab whose title is smaller than its siblings reads as less important than they are, and\n` +
        `nothing in the type system or the tests can see it - which is how Recovery kept a text-lg\n` +
        `heading until somebody looked at the two tabs side by side.`,
    ).toBe("text-2xl font-semibold text-carbon-text");

    // The sentence under the title, where one exists. text-carbon-textMuted is
    // the dimmer token and belongs to hints and secondary lines inside a card,
    // never to the page's own subtitle.
    //
    // Matched by POSITION, not by class order. The first version of this check
    // looked for the literal "mt-1 text-sm text-carbon-…", which is the spelling
    // the house form happens to use - and Recovery's own regression was spelled
    // "text-sm text-carbon-textMuted mt-1", so the guard written for it would
    // have let it straight through. A class list is a set; anything that reads it
    // as a sequence is testing the formatter, not the rule.
    const after = src.slice(src.indexOf(h1![0]));
    const sub = after.match(/<p className="([^"]*)"/);
    if (sub && /text-carbon-text(Sub|Muted)/.test(sub[1])) {
      const classes = sub[1].split(/\s+/);
      expect(
        classes,
        `${file}'s subtitle is "${sub[1]}", want the house set: mt-1, text-sm and text-carbon-textSub.\n` +
          `text-carbon-textMuted is the dimmer token for hints inside a card, not for a page's own subtitle.`,
      ).toContain("text-carbon-textSub");
      expect(classes, `${file}'s subtitle is not text-sm`).toContain("text-sm");
      expect(classes, `${file}'s subtitle has no mt-1`).toContain("mt-1");
    }
  });
});
