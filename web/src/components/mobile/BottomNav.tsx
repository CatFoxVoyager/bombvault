// ---------------------------------------------------------------------------
// BottomNav — SHELL-02, the mobile bottom bar (phase 05, plan 05).
//
// Below the 48rem breakpoint this is the desktop Sidebar's counterpart, and
// Layout mounts exactly one of the two (THE ONE chrome switch). The bar is a
// NORMAL-FLOW flex sibling of the `bv-main` scroller — never `position:
// fixed` (SHELL-02's prohibition): a fixed bar is an overlay the scroller
// ignores, which is exactly how content ends up hidden under chrome on a
// resizing viewport. As a shrink-0 sibling, the browser's own layout reserves
// the bar's height and the scroller ends above it by construction, in both
// orientations and under the Android keyboard's viewport resize.
//
// Slots are NEVER hand-typed: every destination slot is derived from the ONE
// nav registry (lib/navModel.ts) the desktop Sidebar reads — same order, same
// settings gates — so bar and Sidebar cannot drift apart about which
// destinations exist (SHELL-03's whole point). The registry's `bar` members
// fill the destination slots; the fifth slot is the More trigger, which opens
// the SHELL-03 sheet (MoreSheet, inside the PRIM-01 BottomSheet primitive).
//
// EMPTINESS rule: the More trigger renders only while the sheet it opens
// would have content — at least one enabled non-bar destination, or a
// sign-out row (authEnabled). An empty sheet never exists; when there is
// nothing to show, the bar degrades to its destination slots alone.
//
// Active/rest language (UI-SPEC): the active slot's label reads --accentText
// over an --accentSoft backdrop behind its glyph; resting slots use the muted
// text token. Status colors never touch controls; tokens only, no hex.
//
// Tap-on-active (SHELL-02): tapping the ALREADY-active destination scrolls
// the scroller back to the top instead of navigating. The scroller is
// Layout's <main id="bv-main">, so the mechanism is passed down from Layout
// as a prop and nothing here queries the DOM for it.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import type { Settings } from "../../lib/api";
import { useT } from "../../lib/i18n";
import { barDestinations, moreDestinations, type NavDestination } from "../../lib/navModel";
import { IconEllipsis } from "../navGlyphs";
import { MoreSheet } from "./MoreSheet";

export interface BottomNavProps {
  /** Already-loaded settings, owned by Layout — the chrome performs no
   *  fetches of its own; both surfaces derive from the ONE registry
   *  synchronously (UI-SPEC: no loading state exists). */
  settings: Settings | null;
  /** Whether a login password exists. Drives the More trigger's emptiness
   *  rule here, and the sign-out row inside the sheet. */
  authEnabled: boolean;
  /** Layout's tap-on-active scroll (the scroller is Layout's
   *  <main id="bv-main">) — passed on to the sheet's rows too. */
  scrollMainToTop: () => void;
}

// One bar slot, destination or More trigger alike: the 24px glyph box over
// the 11px caption, `flex-1` so the slots split the bar's width equally, and
// the full 56px (h-14) row as the touch target — comfortably over the 44px
// floor (UI-SPEC). min-w-0 + truncate keep de/fr labels single-line at 320px.
const slotBase =
  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-caption motion-safe:active:scale-[.97]";

export function BottomNav({ settings, authEnabled, scrollMainToTop }: BottomNavProps) {
  const { t } = useT();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  // The ONE registry, filtered to enabled bottom-bar destinations — the same
  // derivation the Sidebar's order guarantee rides on.
  const slots = barDestinations(settings);
  const hasMore = moreDestinations(settings).length > 0 || authEnabled;

  // NavLink's onClick fires BEFORE the navigation commits, so the current
  // location still equals the slot's route exactly when this tap is a
  // tap-on-active — scroll to top instead of re-navigating.
  const tapDestination = (to: string) => {
    if (location.pathname === to) scrollMainToTop();
  };

  return (
    <nav
      data-testid="bottom-nav"
      // Normal flow (see header): shrink-0 keeps the bar at its own height
      // while `main` flexes; the hairline rides the bar's TOP edge (border
      // token, never a shadow on an edge that must read as a surface
      // boundary), and the safe-area padding sits below the content so the
      // slots themselves stay a full h-14 on notched devices. The surface is
      // the SAME token the desktop rail reads — one nav-surface token.
      className="shrink-0 border-t border-carbon-border bg-carbon-sidebar pb-[var(--safe-area-bottom)]"
    >
      {/* h-14 static height: svh semantics by construction — a fixed-height
          row never resizes when the DYNAMIC viewport does (browser chrome,
          keyboard), which is the property that keeps the bar visible
          (SHELL-05: static chrome sizes against svh semantics). */}
      <div className="flex h-14">
        {slots.map((d) => (
          <BarSlot key={d.to} destination={d} onTap={() => tapDestination(d.to)} />
        ))}
        {hasMore && (
          <button type="button" onClick={() => setMoreOpen(true)} className={`${slotBase} text-carbon-textMuted`}>
            {/* The glyph box is the 24px slot-icon box (the 16px generated
                glyph scales up to it, the same scaling the rail applies). */}
            <span className="flex h-6 w-6 items-center justify-center rounded-control [&_svg]:h-6 [&_svg]:w-6">
              <IconEllipsis />
            </span>
            <span className="max-w-full truncate">{t("nav.more")}</span>
          </button>
        )}
      </div>
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        settings={settings}
        authEnabled={authEnabled}
        scrollMainToTop={scrollMainToTop}
      />
    </nav>
  );
}

// One destination slot. NavLink drives the active language off the route
// (native aria-current), the same className-by-isActive shape the desktop
// rail's NavItem uses — no parallel active-state bookkeeping to keep in sync.
function BarSlot({ destination, onTap }: { destination: NavDestination; onTap: () => void }) {
  const { t } = useT();
  const Icon = destination.icon;
  return (
    <NavLink
      to={destination.to}
      onClick={onTap}
      className={({ isActive }) => `${slotBase} ${isActive ? "text-accentText" : "text-carbon-textMuted"}`}
    >
      {({ isActive }) => (
        <>
          {/* The accentSoft backdrop is the structural active language
              (UI-SPEC) — the M3 navpill *indicator* treatment of it is
              Phase 7 and deliberately not previewed here. */}
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-control [&_svg]:h-6 [&_svg]:w-6 ${
              isActive ? "bg-accentSoft" : ""
            }`}
          >
            <Icon />
          </span>
          {/* 400 rest, 600 active — the caption's two sanctioned weights. */}
          <span className={`max-w-full truncate ${isActive ? "font-semibold" : ""}`}>{t(destination.labelKey)}</span>
        </>
      )}
    </NavLink>
  );
}
