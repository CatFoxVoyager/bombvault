import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Fab — the mobile primary-action button.
//
// A props-closed control in the Button.tsx TONE discipline: label, icon,
// onClick, and an optional aria-label passthrough — no style-override escape
// hatches, no variant table. The consuming surface passes its EXISTING primary
// CTA key as the label; the Fab is chrome, not a new copy site.
//
// Platform note: under a future material/cupertino platform axis, the
// cupertino idiom's own pinned filled button must never double-paint with a
// Fab — both would be the surface's one reserved primary action, so that PR
// reintroduces a platform-conditional `return null` here. This branch has no
// platform layer, so the component renders unconditionally; adding the gate
// later is a two-line change (one hook call, one early return above the JSX).
//
// WHY IN-FLOW AND NEVER position:fixed/absolute (the same reason
// StickyActionBar carries): the maquette's .fab sits at position:absolute
// right:18px bottom:88px — coordinates against a FIXED-HEIGHT ARTBOARD, not
// app spec. The app is a scrolling document under the locked no-fixed
// contract (fixed chrome fights the Layout visualViewport keyboard
// mechanism), so of the maquette's .fab only the first three visual
// properties transfer — the 52px height, the 18px radius
// (var(--mob-fab-radius)), and the accent fill with contrast ink (ONE accent
// reservation per surface: the surface's primary action only). NO drop
// shadow: the shadow is part of the maquette's elevated-surface language,
// deliberately not transferred. Placement stays the consuming surface's job —
// the Fab renders in-flow (or inside the surface's existing sticky-in-flow
// wrapper), bottom-anchored by the page column, never viewport-anchored by
// itself.
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
  // bv-convention-exception: control-reads-engine-tokens --
  // the Fab's corner radius reads --mob-fab-radius on purpose: a --mob-
  // variable (not a shape-engine --radius-* value) so a future platform axis
  // can give it per-platform values under [data-platform] blocks without
  // touching this component. On this branch the variable is defined once at
  // :root in index.css.
  return (
    // h-13 is the maquette's 52px (Tailwind v4 dynamic spacing); the 44px
    // touch-target floor is cleared by height alone. rounded-(--mob-fab-radius)
    // reads the token, so the radius stays a token decision, not a literal.
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
