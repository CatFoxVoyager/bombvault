import type { TranslationKey, useT } from "../../lib/i18n";
import { Badge } from "../Badge";

// ---------------------------------------------------------------------------
// MobileSectionLabel — the ONE section header of the mobile card language: a
// filled section Badge sitting between the cards, the same heading treatment
// every other surface in the app uses. It replaces an earlier 12px letter-
// spaced all-caps label, which is retired for good: forced capitalisation +
// letter-spacing is a Latin-script idiom that renders as lie-flat (or worse,
// mangled) text
// in the no-case and non-Latin scripts of ar, he, hi, th, zh, ja and ko, and
// the muted grey read as a caption rather than a heading. The filled Badge is
// `inFlow` (not the desktop cards' overlapping notch): a phone column's first
// section sits right under the page header, where a -11px poke above the box
// would clip — the same measurement that moved the sheet titles in-flow (see
// BottomSheet's header note). Kept as a shared component so every page block
// carrying phone-width sections composes the same heading instead of
// re-authoring a private copy — the same single-registry discipline the nav
// model applies to destinations, applied to a component: one source of the
// heading markup, consumers import it back. The Badge carries no hueIndex of
// its own: the block's `glim-hue` root rebinds --accent for the whole subtree,
// so the fill inherits the block's position.
// ---------------------------------------------------------------------------

export function MobileSectionLabel({ t, labelKey }: { t: ReturnType<typeof useT>["t"]; labelKey: TranslationKey }) {
  return (
    <h2 className="flex items-center min-w-0">
      <Badge tone="heading" size="heading" wrap inFlow className="min-w-0">
        {t(labelKey)}
      </Badge>
    </h2>
  );
}
