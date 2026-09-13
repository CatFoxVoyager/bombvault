import { useCallback, useState } from "react";

// ---------------------------------------------------------------------------
// useLoadMore — the ONE client-side list pagination primitive (phase 7,
// LISTS-01 / D-11). Consumers across plans 07-03..07-07 render `visible` and
// gate the "Load more" button on `hasMore`; no list in the phase hand-rolls
// slicing.
//
// WHY A CONSTANT THRESHOLD, NEVER A GROWING OR VIEWPORT-DERIVED STEP (D-11):
// a fixed window keeps "where was that row" answers stable as the user pages
// — with an expanding window every append re-shuffles the row the user is
// looking at. The threshold is the caller's constant (default 20); the hook
// never derives it from viewport height or scroll position.
//
// WHY CLIENT-SIDE ONLY: listRuns() takes no params and web/src/lib/api.ts is
// frozen for this milestone, so there is no server pagination to bind — the
// slice is taken client-side over the array the consumer already holds.
//
// WHY NO IntersectionObserver / scroll listener / sentinel ref, EVER
// (REQUIREMENTS.md Out of Scope: infinite scroll): auto-load steals scroll
// anchoring from the user and makes the footer unreachable; the only way the
// window grows is an explicit showMore() press from a hasMore-gated button.
// This file contains no observer and no scroll machinery by construction —
// the source-assert guard treats any appearance as a regression.
//
// RESET-ON-FILTER (UI-SPEC interaction contract): typing in a bound search or
// toggling a filter chip resets the visible slice to the initial window. The
// hook resets when the `items` array IDENTITY changes, and consumers pass the
// FILTERED array — so slice and filter can never disagree (the consumer
// derives `visible` from the same array it filtered).
// ---------------------------------------------------------------------------

/**
 * The next visible count after one "Load more" press: one threshold added,
 * clamped into [0, total]. Pure so the window math is unit-proven directly
 * (activityLog's extractable-pure-fn model).
 */
export function loadMoreWindow(total: number, visible: number, threshold: number): number {
  return Math.max(0, Math.min(total, visible + threshold));
}

export function useLoadMore<T>(
  items: T[],
  threshold = 20
): { visible: T[]; showMore: () => void; hasMore: boolean; reset: () => void } {
  const [count, setCount] = useState(threshold);
  // Render-time state adjust (React's documented "adjusting state when props
  // change" pattern): a new `items` IDENTITY is a new filter result, so the
  // slice resets to the initial window in the SAME render — no stale-slice
  // frame an effect would paint first, and no effect dep array to drift.
  const [seen, setSeen] = useState(items);
  if (seen !== items) {
    setSeen(items);
    setCount(threshold);
  }

  const visible = items.slice(0, count);
  // hasMore is the ONLY signal consumers may gate the button on: no rows
  // beyond the window, no button (true at zero rows by construction).
  const hasMore = visible.length < items.length;

  const showMore = useCallback(() => {
    // Exactly one threshold per press — never "fill the viewport", never a
    // growing step (D-11).
    setCount((c) => loadMoreWindow(items.length, c, threshold));
  }, [items.length, threshold]);

  const reset = useCallback(() => setCount(threshold), [threshold]);

  return { visible, showMore, hasMore, reset };
}
