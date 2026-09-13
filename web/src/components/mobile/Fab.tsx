import type { ReactNode } from "react";
import { usePlatform } from "../../lib/platform";

// ---------------------------------------------------------------------------
// Fab — the material primary-action button (PLAT-01, phase 7, D-12).
//
// A props-closed control in the Button.tsx TONE discipline: label, icon,
// onClick, and an optional aria-label passthrough — no style-override escape
// hatches, no variant table. The consuming surface passes its EXISTING primary
// CTA key as the label; the Fab is chrome, not a new copy site. It hosts the
// primary trigger on the NEW destination surfaces (plans 07-03/07-05 consume
// it); Home keeps its phase 6 sticky block with its own recorded-why, and
// Config/Receiver/Fleet primary actions are sheet-opening rows, not FABs
// (UI-SPEC surface resolution).
//
// WHY `return null` UNDER CUPERTINO (the ONE sanctioned structural
// usePlatform() switch, Pitfall 5's single exception): the design bible gives
// each language its own primary-action idiom — M3's FAB versus HIG's pinned
// filled button. The cupertino equivalent already exists per surface (its
// filled pinned button), so under cupertino this component renders NOTHING —
// the two idioms must never both paint. Everything else about the platform
// axis is attribute-CSS; only this existence flip is JS.
//
// WHY IN-FLOW AND NEVER position:fixed/absolute (recorded deviation, D-12 —
// the comment StickyActionBar.tsx carries for the same reason): the design
// bible's android.html .fab is positioned position:absolute right:18px
// bottom:88px — but those are coordinates against a FIXED-HEIGHT MAQUETTE
// ARTBOARD, not app spec. The app is a scrolling document under the locked
// phase 5 no-fixed contract (fixed chrome fights the Layout visualViewport
// keyboard mechanism), so of the maquette's .fab only the first three visual
// properties transfer — the 52px height, the 18px radius (var(--mob-fab-
// radius), the [data-platform] block in index.css), and the accent fill with
// contrast ink (accent reservation 9: ONE per surface, the surface's primary
// action only). NO drop shadow: the shadow is part of the maquette's elevated
// surface language, and D-12 transfers only the first three properties.
// Placement stays the consuming surface's job — the Fab renders in-flow (or
// inside the surface's existing sticky-in-flow wrapper), bottom-anchored by
// the page column, never viewport-anchored by itself.
// ---------------------------------------------------------------------------
export function Fab({
  label,
  icon,
  onClick,
  ariaLabel,
}: {
  /** The consuming surface's existing primary-CTA label — never new copy. */
  label: string;
  /** Leading glyph row element (navGlyphs icon). */
  icon: ReactNode;
  onClick: () => void;
  /** Overrides the accessible name when the visible label reads wrong aloud
   *  (e.g. a shortened CTA key). Falls through to `label` when omitted — the
   *  visible text is already a real accessible name. */
  ariaLabel?: string;
}): ReactNode {
  const platform = usePlatform();
  if (platform !== "material") return null;

  // bv-convention-exception: control-reads-engine-tokens --
  // the FAB's corner radius belongs to the PLATFORM axis on purpose:
  // --mob-fab-radius is the [data-platform] engine token (index.css, both
  // attribute values defined), not a shape-engine --radius-* value — the
  // platform layer owning chrome geometry IS PLAT-01's contract.
  return (
    // h-13 is the maquette's 52px (v4 dynamic spacing); the 44px touch-target
    // floor is cleared by height alone. rounded-(--mob-fab-radius) reads the
    // platform block, so the radius stays a token decision, not a literal.
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className="inline-flex h-13 items-center gap-2 rounded-(--mob-fab-radius) bg-accent px-4 text-accentContrast"
    >
      {icon}
      <span className="text-heading font-semibold">{label}</span>
    </button>
  );
}
