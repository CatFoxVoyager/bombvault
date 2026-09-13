// ---------------------------------------------------------------------------
// A control greyed out by somebody else's decision has to say whose.
//
// GlimStone's rule for a disabled control asks what the grey state is ABOUT.
// If it is about the thing the control touches (a spinner arrow at the end of
// its range, a reset with nothing to reset), dimming says it: the control is
// reporting on itself. If it is about a decision taken somewhere else on the
// page, the control should not be there at all - a switch greyed because
// another switch is off offers a decision nobody can make.
//
// 1.16.0 adds the case between those two, and it is the one this guard exists
// for: a control whose value STILL ACTS while something else is in charge.
// The accent swatches under rainbow mode are the original - the accent is
// still stored, still applies the moment rainbow goes off, so removing the row
// would hide a setting that is doing something. It stays, dimmed, and a
// conditional bubble names who is in charge. Same shape for the three domain
// schedules while "use the Containers schedule" is on.
//
// What goes wrong without a guard is not that somebody writes the wrong rule.
// It is that the bubble is the easiest half to lose: the `disabled` prop is
// load-bearing and gets read on every change, the sentence beside it is not,
// and deleting it leaves a control that is grey for no stated reason and looks
// exactly like a bug. The three schedule editors sat like that for months.
//
// The test is per COMPONENT, deliberately. A file-wide search would go green
// on two of the three schedule sections' bubbles while the third was gone -
// the same blindness a guard in this directory has already shipped once.
// ---------------------------------------------------------------------------
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry === "locales") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sources(full));
      continue;
    }
    if (/\.tsx$/.test(entry) && !/\.test\.tsx$/.test(entry)) out.push(full);
  }
  return out;
}

// Comments out first. This codebase quotes its own past props in them
// ("the old `disabled={presetsAreDefault}`"), so a scan that reads comments
// reports documentation as defects - and the next person answers that with an
// allow-list, which is how a guard stops guarding.
function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:\w])\/\/[^\n]*/g, (m, p1: string) => p1 + m.slice(p1.length).replace(/./g, " "));
}

/**
 * Does this `disabled={...}` expression name a decision taken ELSEWHERE?
 *
 * Two marks together, and both are needed. First the shape: a settings field,
 * or a flag whose name says a feature is switched on (`...Enabled`, `rainbowOn`,
 * `syncSchedules`). Second the origin: the flag is NOT computed in this file.
 * A `const enabled = direction > 0 ? ends.up : ends.down` inside NumberField
 * has the giveaway name and is pure self-state - the arrow knows its own range.
 * A flag that arrives as a prop was decided by whoever rendered this.
 *
 * `busy` anywhere in the expression settles it the other way before either
 * mark is read: `fieldBusy.digestEnabled` and `busy?.drillsEnabled` carry the
 * word Enabled and mean "this row is saving itself right now".
 */
function ownerFlag(expr: string, file: string): string | null {
  if (/busy/i.test(expr)) return null;
  const candidates = expr.match(/!?\b(?:settings\.\w+|\w*(?:Enabled|Schedules)|rainbowOn|rainbow\.on)\b/g);
  for (const raw of candidates ?? []) {
    const flag = raw.replace(/^!/, "");
    // Declared right here = this component worked it out from its own inputs.
    if (new RegExp(`\\bconst\\s+${flag.replace(/\W/g, "\\$&")}\\b`).test(file)) continue;
    return flag;
  }
  return null;
}

/**
 * Component windows: every top-level function/const whose name starts with a
 * capital. The bubble and the control it explains belong to the same one -
 * that is what makes the proof local instead of file-wide.
 */
function components(file: string): { name: string; start: number; end: number }[] {
  const heads = [...file.matchAll(/^(?:export\s+)?(?:function|const)\s+([A-Z]\w*)/gm)];
  return heads.map((h, i) => ({
    name: h[1],
    start: h.index!,
    end: i + 1 < heads.length ? heads[i + 1].index! : file.length,
  }));
}

/** A bubble that appears only while `flag` is on, in either spelling. */
function namesTheOwner(window: string, flag: string): boolean {
  const f = flag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    // {flag && <InfoBubble tip={...} />}
    new RegExp(`${f}\\s*&&\\s*(?:\\(\\s*)?<InfoBubble`).test(window) ||
    // hint={flag ? t("...") : undefined}
    new RegExp(`hint=\\{[^}]*${f}\\s*\\?`).test(window) ||
    // <UnavailableNotice> keyed on the same flag (GlimStone's third case, kept
    // here because a component may use both shapes as it grows).
    new RegExp(`${f}\\s*&&\\s*(?:\\(\\s*)?<UnavailableNotice`).test(window)
  );
}

describe("a control dimmed by a decision elsewhere names who is in charge", () => {
  const files = sources(SRC);

  it("scans the components that have such a control", () => {
    const offenders: string[] = [];
    let checked = 0;

    for (const path of files) {
      const text = code(readFileSync(path, "utf8"));
      const windows = components(text);

      for (const m of text.matchAll(/disabled=\{([^}]*)\}/g)) {
        const flag = ownerFlag(m[1], text);
        if (!flag) continue;
        checked++;
        const w = windows.find((c) => m.index! >= c.start && m.index! < c.end);
        const window = w ? text.slice(w.start, w.end) : text;
        if (namesTheOwner(window, flag)) continue;
        const line = text.slice(0, m.index!).split("\n").length;
        offenders.push(
          `${relative(SRC, path)}:${line} - disabled={${m[1].trim()}} is grey because ` +
            `${flag} was decided elsewhere, and ${w ? w.name : "the file"} never says so. ` +
            `Either drop the control while ${flag} is on, or render an InfoBubble under the same condition.`
        );
      }
    }

    // The scan has to be able to FIND something. If a refactor renames the
    // prop or the expressions move out of JSX, this count goes to zero and a
    // guard that checks nothing reads exactly like a guard that passes.
    expect(checked).toBeGreaterThanOrEqual(5);
    expect(offenders).toEqual([]);
  });
});
