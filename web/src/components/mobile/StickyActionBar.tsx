// ---------------------------------------------------------------------------
// StickyActionBar — the ONE shared sticky-in-flow action bar (phase 6, D-03;
// consumed by the tree Save bar, this plan, and the Home trigger zone 06-06).
//
// WHY STICKY-IN-FLOW AND NEVER position:fixed (locked Phase 5 discipline):
// fixed chrome fights the Layout visualViewport keyboard mechanism (a fixed
// bar does not move when the keyboard resizes the visual viewport) and needs
// manual width/safe-area syncing that in-flow sticky gets for free.
//
// WHY THE LAST DIRECT CHILD OF THE PAGE COLUMN (research Pitfall 3): a sticky
// element is confined to its PARENT box — nested inside a Card, the bar
// "sticks" only within that card's own height and scrolls away with it. As a
// direct child of the PAGE_SHELL column (whose nearest scrolling ancestor is
// main#bv-main, Layout.tsx) the bar rides the page scroll and pins to the
// viewport bottom while any of the column is on screen. For the same reason
// no overflow/contain wrapper may sit between this bar and main#bv-main —
// keep new page wrappers clean (Phase 5 verified .glim-page-enter is).
//
// Chrome mirrors the BottomNav precedent (BottomNav.tsx): sidebar surface +
// top hairline, padded below by max(0.75rem, var(--safe-area-bottom)) so the
// home-indicator / gesture-bar inset never swallows the action row. Deliberately
// NO negative margins and no fixed positioning — the bar spans the page
// column's own width inside the scroller gutter (p-4 md:p-6), the 06-02
// convention.
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";

export function StickyActionBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`sticky bottom-0 z-10 bg-carbon-sidebar border-t border-carbon-border pt-3 pb-[max(0.75rem,var(--safe-area-bottom))] ${className}`}
    >
      {/* Rows stack: count/busy row, then the primary action, then the
          plain-language second row (D-03's save-bar anatomy). */}
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
