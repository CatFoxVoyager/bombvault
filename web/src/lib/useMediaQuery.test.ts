// ---------------------------------------------------------------------------
// DESKTOP_QUERY — the fragile-pair guard between the ONE JS breakpoint
// literal and Tailwind's CSS md: variants.
//
// The JS chrome switch (Layout's Sidebar <-> bottom-bar + More-sheet decision)
// and the CSS `md:`/`max-md:` variants are two halves of one breakpoint
// contract (Tailwind default: `--breakpoint-md: 48rem`). If the literal drifts
// from the CSS — or a future edit "just tweaks the breakpoint" in the hook
// without regenerating the CSS, or copies the literal into a second file —
// pages flicker between chrome systems in the 1px window where the two
// disagree. So this test pins the exact literal to the ONE sanctioned home
// and enforces the one-literal rule everywhere else in src.
//
// Node environment, no DOM: this reads source text, it does not render
// (app/routedPages.test.ts's doctrine and style).
// ---------------------------------------------------------------------------
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SRC = join(HERE, "..");

const source = readFileSync(join(HERE, "useMediaQuery.ts"), "utf8");

// The literal, exactly as Tailwind defines its md breakpoint. Whitespace
// tolerance is deliberate — the failure this guards is a changed WIDTH
// (48rem -> 64rem) or a second copy, not a reformatted space.
const LITERAL = /min-width:\s*48rem/;

// The one sanctioned home of the literal, and this file itself (which has to
// quote it in order to guard it).
const SANCTIONED = new Set(["lib/useMediaQuery.ts", "lib/useMediaQuery.test.ts"]);

describe("DESKTOP_QUERY stays the one breakpoint literal", () => {
  it("reads the hook source at all (guards against this test silently matching nothing)", () => {
    expect(source.length).toBeGreaterThan(0);
    expect(source).toMatch(LITERAL);
  });

  it("pins the exact Tailwind md breakpoint (min-width: 48rem) in the hook", () => {
    expect(
      source,
      'useMediaQuery.ts no longer contains "(min-width: 48rem)". That literal IS the app\'s ' +
        "definition of desktop, pinned to Tailwind's --breakpoint-md: 48rem — the JS chrome " +
        "switch and the CSS md:/max-md: variants must flip at the same width or pages flicker " +
        "between chrome systems in the 1px window where they disagree. If the breakpoint " +
        "genuinely moves, change Tailwind's --breakpoint-md AND this literal together, and " +
        "narrow this guard consciously."
    ).toMatch(LITERAL);
    // The hook must stay the React-sanctioned store shape, not a
    // listener-in-effect hook (torn snapshots).
    expect(source).toContain("useSyncExternalStore");
    expect(source).toContain("DESKTOP_QUERY");
  });

  it("no second min-width: 48rem literal exists anywhere else in src (the one-literal rule)", () => {
    const offenders: string[] = [];
    for (const rel of readdirSync(SRC, { recursive: true })) {
      const relPath = rel.replaceAll("\\", "/");
      if (!/\.(ts|tsx|css)$/.test(relPath) || SANCTIONED.has(relPath)) continue;
      const text = readFileSync(join(SRC, rel), "utf8");
      if (LITERAL.test(text)) offenders.push(`src/${relPath}`);
    }
    expect(
      offenders,
      "A second (min-width: 48rem) literal appeared outside lib/useMediaQuery.ts. The JS " +
        "breakpoint has exactly one home: import DESKTOP_QUERY from there instead. Two " +
        "independent definitions of desktop is how the JS chrome and the CSS md: variants " +
        "drift apart and flicker against each other."
    ).toEqual([]);
  });
});
