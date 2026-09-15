// ---------------------------------------------------------------------------
// Every themed utility a component names has to exist in the theme.
//
// Tailwind v4 builds a utility from a `--color-<name>` custom property in the
// `@theme` block. Write `bg-statusWarnBgSoft` when no `--color-statusWarnBgSoft`
// is declared and NOTHING complains: Tailwind emits no rule for it, TypeScript
// never sees class strings, the lint rules look at code rather than CSS, and the
// element renders with no background at all. The box keeps its radius and its
// padding, so it still looks deliberate - it is just transparent.
//
// That is not hypothetical. The passkey card shipped in v8.8.0 asking for
// exactly that name for its refusal paragraph, and the warn family only had a
// base tone and a strong tone: the soft step existed for the FAILURE family and
// nowhere else. The box had a radius, padding and no fill for a whole release,
// and every gate in the build was green.
//
// GlimStone 1.15.0 calls this out as its own rule and carries the token; this
// guard is the mechanical half, so the next invented name fails here instead of
// on somebody's screen. It is deliberately a source scan and not a DOM test: a
// DOM test can only see the components it renders, and the defect is that a
// class nobody rendered in a test was wrong.
// ---------------------------------------------------------------------------
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const CSS = join(SRC, "index.css");

// The themed families. `carbon`, `accent` and `status` are the three prefixes
// this app's @theme block defines; anything else in a class name is either a
// stock Tailwind colour or not a colour at all, and neither is ours to check.
const FAMILY = "(?:carbon|accent|status)";
// A utility is <property>-<Family><Rest>, and the property list is the set of
// Tailwind utilities that resolve against --color-*. `divide` and `outline` are
// in it because both take a colour and both are used here.
const PROPERTY = "(?:bg|text|border|ring|fill|stroke|divide|outline|from|via|to|shadow|caret|accent)";
// The name may carry hyphens of its own (`carbon-textSub`), so the character
// class has to allow them - and then a trailing hyphen has to be trimmed back
// off, or `bg-carbon-surface-` style typos read as part of the name.
const USE = new RegExp(`\\b${PROPERTY}-(${FAMILY}[A-Za-z0-9-]*)`, "g");

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry === "locales") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sources(full));
      continue;
    }
    if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

// Comments have to go before the scan, and that is not a nicety: this codebase
// documents its own history in them ("Task 7: was text-statusInfo, the old fifth
// hue"), so a scan that reads comments reports nine pieces of deliberate
// documentation as defects and one real one. The next person then adds an
// allow-list, and the guard is finished. Block comments first, then line
// comments - and a line comment only when the slashes are not part of a URL,
// which is why the preceding character is checked.
function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:\w])\/\/[^\n]*/g, "$1");
}

const css = readFileSync(CSS, "utf8");
// The @theme declarations, as a set of bare names: --color-statusWarnBg -> statusWarnBg.
const declared = new Set(
  Array.from(css.matchAll(/--color-([A-Za-z0-9-]+)\s*:/g)).map((m) => m[1]),
);

type Use = { name: string; file: string; line: number };

const uses: Use[] = [];
for (const file of sources(SRC)) {
  const text = code(readFileSync(file, "utf8"));
  text.split("\n").forEach((line, i) => {
    for (const m of line.matchAll(USE)) {
      const name = m[1].replace(/-+$/, "");
      uses.push({ name, file: file.slice(SRC.length + 1).replace(/\\/g, "/"), line: i + 1 });
    }
  });
}

describe("themed utilities", () => {
  // Self-check first, the same shape pageHeading.test.ts and
  // backupCancelReach.test.ts carry: a scanner that reads nothing reports
  // perfect coverage of nothing, and does it silently.
  it("the scan actually reached the source tree", () => {
    expect(
      uses.length,
      "the themed-utility scan found almost nothing, so it is measuring its own\n" +
        "regex rather than the app. Check SRC, the file filter and USE before\n" +
        "trusting a green run below.",
    ).toBeGreaterThan(300);
    expect(
      declared.size,
      "no --color-* declarations were read out of index.css, so every utility\n" +
        "below would be reported missing. The @theme block's shape changed.",
    ).toBeGreaterThan(30);
  });

  it("every one of them is declared in the theme", () => {
    const missing = uses.filter((u) => !declared.has(u.name));
    const report = missing
      .map((u) => `  ${u.file}:${u.line}  ${u.name}`)
      .join("\n");
    expect(
      missing,
      `A themed utility names a colour the @theme block does not declare:\n\n${report}\n\n` +
        `Tailwind emits no rule for an undeclared name, so the element renders with\n` +
        `NO colour and keeps its radius and padding - it looks deliberate and is\n` +
        `transparent. Add --color-<name> to the @theme block in web/src/index.css\n` +
        `and give it a value in BOTH theme blocks, or use a name that exists.\n` +
        `Declared names starting the same way: ${[...declared]
          .filter((d) => missing.some((m) => d.slice(0, 9) === m.name.slice(0, 9)))
          .join(", ") || "none"}`,
    ).toEqual([]);
  });
});
