import type { TranslationKey, useT } from "../../lib/i18n";

// ---------------------------------------------------------------------------
// MobileSectionLabel — the ONE section header of the mobile card language
// (the maquette's `.sect`, design/mobile @0b64c7df), promoted verbatim out of
// Dashboard.tsx in 07-02 so all six destination page blocks (07-03..07-07)
// compose the same label instead of a second copy. This is the phase 5
// navModel single-registry discipline applied to a component: one source of
// the label markup, consumers import it back — Dashboard's usage is unchanged
// (same props, same rendering) since the move is verbatim.
// ---------------------------------------------------------------------------

export function MobileSectionLabel({ t, labelKey }: { t: ReturnType<typeof useT>["t"]; labelKey: TranslationKey }) {
  // The maquette's `.sect` — a 12px uppercase letter-spaced label sitting
  // between the cards (not a desktop-style overlapping Badge heading; the
  // phone cards are flat, compact boxes).
  return (
    <h2 className="px-0.5 text-xs font-semibold uppercase tracking-[0.09em] text-carbon-textMuted">
      {t(labelKey)}
    </h2>
  );
}
