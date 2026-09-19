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
// The table alone is not enough — its entries are per-TAB assignments, and
// the collision class that actually bites is two selectors visible in the
// SAME tab reading from one start (the label rows grew a fourth axis and
// its last row landed on the Shape selector's start, both on General). So
// the last test below expands the table per tab — including the label
// rows' span, which is one entry in the table but CONTROL_AXES.length
// starts on screen — and fails on ANY duplicate within a tab. Starts
// shared across DIFFERENT tabs are fine: those selectors can never be on
// screen together.
//
// Node environment: this reads source, it does not render.
// ---------------------------------------------------------------------------
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { HUE_OFFSET } from "../../components/Selector";
import { CONTROL_AXES } from "../../lib/controls";

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

/** The union of the JSX each `tab === "X"` gate renders in Settings.tsx:
 *  every `{tab === "X" && …}` block, brace-matched to its own close. The
 *  tab strip itself sits above all gates, so it never appears in a region —
 *  the groups below add it explicitly (it shows on every tab). */
function settingsTabRegion(tab: string): string {
  const text = readFileSync(SETTINGS_PAGE, "utf8");
  const needle = `{tab === "${tab}" &&`;
  let out = "";
  for (let i = text.indexOf(needle); i !== -1; i = text.indexOf(needle, i + 1)) {
    let depth = 0;
    for (let j = i; j < text.length; j++) {
      const c = text[j];
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) {
          out += text.slice(i, j + 1);
          break;
        }
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

// ---------------------------------------------------------------------------
// The per-tab collision property itself. The groups name every hued selector
// a tab can show AT THE SAME TIME, and the truthfulness test below keeps
// them honest against the source: if a card moves tabs (ThemeCard did), the
// stale group fails here instead of silently protecting the wrong screen.
// ---------------------------------------------------------------------------

/** Which hued selectors each tab can show simultaneously. The tab strip is
 *  implicit — it renders on every tab and is added by the test. A selector
 *  whose offset is a SPAN (the label rows, one per control axis) is listed
 *  once with `span: true` and expanded below. `marker` is what must appear
 *  inside the tab's gated JSX for the claim to be true (the offset
 *  expression for a selector inline in Settings.tsx, the card tag for one
 *  carried by a card file — whose `cardFile` must then name that key). */
const TAB_GROUPS: {
  tab: string;
  selectors: { key: keyof typeof HUE_OFFSET; span?: boolean; marker: string; cardFile?: string }[];
}[] = [
  {
    tab: "general",
    selectors: [
      { key: "labels", span: true, marker: "HUE_OFFSET.labels" },
      { key: "shape", marker: "HUE_OFFSET.shape" },
      { key: "motion", marker: "HUE_OFFSET.motion" },
      // ThemeCard's own picker — the card lives on the General tab (its
      // file carries the Selector, Settings.tsx's General region mounts it).
      { key: "theme", marker: "<ThemeCard", cardFile: "ThemeCard.tsx" },
    ],
  },
  {
    tab: "integrity",
    selectors: [{ key: "drillKind", marker: "<IntegrityCard", cardFile: "IntegrityCard.tsx" }],
  },
  {
    tab: "notifications",
    selectors: [{ key: "notifyOn", marker: "<NotifyCard", cardFile: "NotifyCard.tsx" }],
  },
];

describe("per-tab palette starts", () => {
  it("names groups the source still agrees with (cards live where the groups say)", () => {
    const offenders: string[] = [];
    const sources = new Map(settingsSources().map(({ file, text }) => [file, text]));
    for (const group of TAB_GROUPS) {
      const region = settingsTabRegion(group.tab);
      if (region.length === 0) {
        offenders.push(`tab "${group.tab}": no {tab === "…"} gate found in Settings.tsx`);
        continue;
      }
      for (const sel of group.selectors) {
        // The card/selector the group claims must actually render inside this
        // tab's gated JSX — a card moving tabs (ThemeCard has) must fail HERE,
        // not silently protect the wrong screen.
        if (!region.includes(sel.marker)) {
          offenders.push(`tab "${group.tab}": ${sel.marker} not found in its gated region`);
        }
        // And the claimed key must be the one the selector really reads.
        if (sel.cardFile) {
          const card = sources.get(sel.cardFile);
          if (card === undefined || !card.includes(`hueOffset={HUE_OFFSET.${sel.key}}`)) {
            offenders.push(`${sel.cardFile}: does not read HUE_OFFSET.${sel.key} as the group claims`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no two simultaneously-visible selectors on one tab start on the same palette position", () => {
    const offenders: string[] = [];
    for (const group of TAB_GROUPS) {
      // Every tab also shows the strip.
      const used = new Map<number, string>([[HUE_OFFSET.tabs, "tabs"]]);
      for (const sel of group.selectors) {
        const starts = sel.span
          ? CONTROL_AXES.map((_, i) => HUE_OFFSET[sel.key] + i)
          : [HUE_OFFSET[sel.key]];
        for (const start of starts) {
          const previous = used.get(start);
          if (previous !== undefined) {
            offenders.push(
              `tab "${group.tab}": ${sel.key} starts at ${start}, already taken by ${previous}`
            );
          } else {
            used.set(start, sel.key);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
