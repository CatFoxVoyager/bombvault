// ---------------------------------------------------------------------------
// The control that goes ahead sits on the right.
//
// GlimStone 1.14.0 states it in terms of ROLE rather than vocabulary: ask which
// control moves the thing forward and which holds it or takes it back. Save
// right and Cancel left, Confirm right and Cancel left, Run right and Pause
// left - the last pair being the one that forced the wording, because neither
// of those is a save or a cancel and the rule still has to decide it.
//
// Position is a second signal that survives what colour does not. The accent
// already says which control is primary; the position says it again in
// glyph-only mode, to a colour-blind reader, and after the palette is switched.
// Under RTL the pair mirrors with the page, so "right" means END rather than
// the right of the glass - which is why this guard reasons about ORDER IN THE
// SOURCE and never about a pixel.
//
// The audit that produced this found eleven pairs the wrong way round, and the
// shape of the finding is the argument for a guard rather than a sweep: six of
// the eleven sat in settings cards, all with the same container and the same
// habit of writing the action first and the way out after it. Where
// ConfirmDialog renders the footer, the order was right everywhere; where a
// card wrote its own row, it was wrong in six cases out of seven. A rule that
// only holds where a shared component happens to hold it is not a rule yet.
//
// Deliberately narrow: two <Button> tags that are ADJACENT in the source, one
// naming a known hold key and one a known forward key. That misses a pair split
// by a conditional and it misses one whose keys nothing here knows about, and
// both of those are fine. A guard that tried to infer roles from arbitrary keys
// would be guessing, and a guessing guard is answered with an allow-list.
// ---------------------------------------------------------------------------
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buttonTags } from "./buttonTags.testsupport";

const SRC = join(__dirname, "..");

// Keys that HOLD or TAKE BACK. Matched against the whole labelKey, so
// "common.cancel" and "settingsIO.cancel" are both caught by /cancel/.
const HOLD = /cancel|close$|skip|decline|reset$|back$|dismiss/i;

// Keys that move the thing FORWARD. `save` and `confirm` carry most of it; the
// rest are the verbs this app uses for "do the thing the row is about".
const FORWARD =
  /save$|confirm|apply|create$|accept|connect|restore|import|enable|disable|regenerate|proceed|continue/i;

// The keys this guard MUST recognise, because they are the eleven pairs the
// 1.14.0 audit actually found. A regex is easy to write so that it looks right
// and matches nothing: `\bcreate$` was the first cut here and it silently
// missed `auth.passkeyCreate`, because there is no word boundary between "y"
// and "C". The guard stayed green while one of the pairs it exists for was
// turned back the wrong way round, which is the failure a guard is supposed to
// make impossible.
const MUST_BE_FORWARD = [
  "offsite.targets.save",
  "settings.save",
  "auth.passkeyCreate",
  "auth.twoFactorConfirm",
  "auth.twoFactorDisable",
  "settingsIO.confirmButton",
  "backupOrder.save",
  "fleet.mesh.accept",
  "recovery.foreignConnect",
  "recovery.configRestore",
];
const MUST_BE_HOLD = [
  "offsite.targets.cancel",
  "common.close",
  "common.cancel",
  "settingsIO.cancel",
  "backupOrder.reset",
  "fleet.mesh.decline",
  "recovery.foreignClose",
  "recovery.configSkip",
];

function keyOf(props: string): string | null {
  const m = /\blabelKey\s*=\s*"([^"]+)"/.exec(props);
  return m ? m[1] : null;
}

const tags = buttonTags(SRC);

type Wrong = { where: string; forward: string; hold: string };

const wrong: Wrong[] = [];
for (let i = 0; i < tags.length - 1; i++) {
  const a = tags[i];
  const b = tags[i + 1];
  if (a.file !== b.file) continue;
  // SIBLINGS, not merely close. Line distance was the first cut and it was
  // wrong: it reported the two-factor card's Disable and Cancel buttons, which
  // sit in the two branches of one ternary and never render together. What
  // makes two buttons a pair is that nothing but whitespace and a closing tag
  // lies between them - a `?`, a `:` or a `&&` in the gap means two branches.
  const gap = a.source.slice(a.end, b.start);
  if (/[?:]|&&|\|\|/.test(gap)) continue;
  if (!/^[\s]*(\/>|<\/[A-Za-z.]+>)?[\s]*$/.test(gap)) continue;

  const ka = keyOf(a.props);
  const kb = keyOf(b.props);
  if (!ka || !kb) continue;

  // The wrong way round is: forward FIRST, hold SECOND.
  if (FORWARD.test(ka) && !HOLD.test(ka) && HOLD.test(kb)) {
    wrong.push({ where: `${a.file}:${a.line}`, forward: ka, hold: kb });
  }
}

describe("button order in a pair", () => {
  it("the scan reached the buttons", () => {
    expect(
      tags.length,
      "the <Button> scan found almost nothing, so this guard is measuring its\n" +
        "own regex rather than the app.",
    ).toBeGreaterThan(150);
    const keys = tags.map((t) => keyOf(t.props)).filter(Boolean) as string[];
    expect(
      keys.filter((k) => HOLD.test(k)).length,
      "no hold-role keys were recognised at all, so nothing below can fail.",
    ).toBeGreaterThan(5);
    expect(
      keys.filter((k) => FORWARD.test(k)).length,
      "no forward-role keys were recognised at all.",
    ).toBeGreaterThan(5);

    // And the specific ones, by name. See MUST_BE_FORWARD's own comment: the
    // counts above pass with a regex that happens to match a different set.
    for (const k of MUST_BE_FORWARD) {
      expect(FORWARD.test(k), `${k} is not recognised as a forward role`).toBe(true);
      expect(HOLD.test(k), `${k} is wrongly recognised as a hold role`).toBe(false);
    }
    for (const k of MUST_BE_HOLD) {
      expect(HOLD.test(k), `${k} is not recognised as a hold role`).toBe(true);
    }
  });

  it("puts the control that goes ahead last", () => {
    const report = wrong
      .map((w) => `  ${w.where}  ${w.forward} stands before ${w.hold}`)
      .join("\n");
    expect(
      wrong,
      `These pairs have the forward control first (GlimStone 1.14.0):\n\n${report}\n\n` +
        `Swap the two <Button> blocks. Nothing about the props changes - the\n` +
        `accent stays on the forward one, it just moves to the end of the row,\n` +
        `where it mirrors correctly under RTL for free.`,
    ).toEqual([]);
  });
});
