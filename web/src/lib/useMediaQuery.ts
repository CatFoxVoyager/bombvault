// ---------------------------------------------------------------------------
// USE MEDIA QUERY — the ONE breakpoint hook, and the ONE home of the desktop
// breakpoint literal.
//
// DESKTOP_QUERY below is the single JS definition of "desktop" in the app,
// pinned to Tailwind's md breakpoint (`--breakpoint-md: 48rem`,
// node_modules/tailwindcss/theme.css) by src/lib/useMediaQuery.test.ts's
// source assert. It must never be copied: Layout's chrome switch (the
// Sidebar <-> bottom-bar + More-sheet decision, phase 5) is the only consumer
// for now, and the CSS side keeps using `md:`/`max-md:` variants. A second JS
// literal somewhere else would let the JS chrome flip at one width while the
// CSS variants flip at another, flickering both chrome systems in the 1px
// window where they disagree — the fragile-pair discipline lib/theme.ts
// documents for its index.html duplicate, applied to the breakpoint.
//
// useSyncExternalStore, not useEffect+useState: the subscribe/getSnapshot
// contract is React's sanctioned shape for a browser API as a store and
// cannot tear between render and effect (a media query answering one value
// during render and another after the effect is exactly the torn snapshot a
// listener-in-effect hook can produce). The subscribe/unsubscribe shape
// mirrors theme.ts:78-87 — addEventListener with the deprecated
// addListener/removeListener fallback for Safari < 14.
// ---------------------------------------------------------------------------
import { useSyncExternalStore } from "react";

/** Tailwind's md breakpoint, as a media query. The ONLY place this literal
 *  may live — see this file's header comment and the guard test, which fails
 *  with the why if the literal is altered or duplicated. */
export const DESKTOP_QUERY = "(min-width: 48rem)";

// One MediaQueryList for the lifetime of the page, created lazily so a
// windowless runtime (node-env test files import source modules freely) never
// touches `window` at module scope. null means "no matchMedia available".
let desktopMql: MediaQueryList | null = null;

function currentMql(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  if (!desktopMql) desktopMql = window.matchMedia(DESKTOP_QUERY);
  return desktopMql;
}

function subscribe(onChange: () => void): () => void {
  const mql = currentMql();
  if (!mql) return () => {};
  // Same shape as theme.ts:78-87 — modern API first, Safari < 14 fallback.
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }
  mql.addListener(onChange);
  return () => mql.removeListener(onChange);
}

function getSnapshot(): boolean {
  const mql = currentMql();
  // Desktop default when matchMedia is unavailable — consistent with the
  // desktop-default answer the jsdom stub (src/lib/testSetup/matchMedia.ts)
  // gives, so test suites keep asserting the desktop layout they were
  // written against.
  return mql ? mql.matches : true;
}

/** True at/above Tailwind's md breakpoint (48rem). Windowless/server snapshot:
 *  true (desktop default). */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
