// ---------------------------------------------------------------------------
// No two selectors on one settings screen start on the same colour.
//
// A Selector segment takes its hue from its POSITION, which is what makes a
// rainbow list readable: position three is the same colour wherever you meet
// it. Stack two selectors of similar width, though, and every column repeats
// straight down the page, so the second one tells you nothing the first did
// not (jdp, 2026-09-15, on the three label-mode selectors in Settings all
// wearing the same orange in column two).
//
// `hueOffset` is the fix, and the trap is that its default is 0 - which is
// correct for a lone selector on a page and wrong for every selector added
// beside another one. A new card gets written, nobody thinks about the
// palette, and the collision comes back silently. So: inside the settings
// tree, passing an offset is not optional, and the offsets come from one
// table rather than from nine separate judgement calls.
//
// Node environment: this reads source, it does not render.
// ---------------------------------------------------------------------------
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const SETTINGS_DIR = HERE;
const SETTINGS_PAGE = join(HERE, "..", "Settings.tsx");

function settingsSources(): { file: string; text: string }[] {
  const out = [{ file: "Settings.tsx", text: readFileSync(SETTINGS_PAGE, "utf8") }];
  for (const name of readdirSync(SETTINGS_DIR)) {
    if (!/\.tsx$/.test(name) || /\.test\.tsx$/.test(name)) continue;
    out.push({ file: name, text: readFileSync(join(SETTINGS_DIR, name), "utf8") });
  }
  return out;
}

/** Each `<Selector … />` element in a file, as its own text. */
function selectorElements(text: string): string[] {
  const out: string[] = [];
  for (let i = text.indexOf("<Selector"); i !== -1; i = text.indexOf("<Selector", i + 1)) {
    // To the element's own closing token. Props may contain `>` inside arrow
    // functions, so stop at the first `/>` or `>` that ends the open tag at
    // depth zero of braces and parentheses instead of the first `>`.
    let depth = 0;
    for (let j = i; j < text.length; j++) {
      const c = text[j];
      if (c === "{" || c === "(") depth++;
      else if (c === "}" || c === ")") depth--;
      else if (c === ">" && depth === 0) {
        out.push(text.slice(i, j + 1));
        break;
      }
    }
  }
  return out;
}

describe("settings selectors", () => {
  const files = settingsSources();

  it("finds the call sites at all, so the scan cannot pass on a rename", () => {
    const total = files.reduce((n, f) => n + selectorElements(f.text).length, 0);
    expect(total).toBeGreaterThanOrEqual(7);
  });

  it("every hued one names its palette start explicitly", () => {
    const offenders: string[] = [];
    for (const { file, text } of files) {
      for (const el of selectorElements(text)) {
        // `hue={false}` opts out of the colour engine entirely, so a start
        // position would be meaningless there.
        if (/hue=\{false\}/.test(el)) continue;
        if (/hueOffset=/.test(el)) continue;
        const label = /label=\{([^}]*)\}/.exec(el)?.[1] ?? "(no label)";
        offenders.push(`${file}: <Selector label={${label}}> has no hueOffset`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("takes those starts from the shared table rather than bare numbers", () => {
    // A literal `hueOffset={6}` is how the collision comes back: the next
    // author picks a number that looks free on the screen they are looking at.
    const offenders: string[] = [];
    for (const { file, text } of files) {
      for (const el of selectorElements(text)) {
        const m = /hueOffset=\{([^}]*)\}/.exec(el);
        if (!m) continue;
        if (/HUE_OFFSET\./.test(m[1])) continue;
        offenders.push(`${file}: hueOffset={${m[1].trim()}} is not from HUE_OFFSET`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
