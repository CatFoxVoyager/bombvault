// Disco walks the rainbow palette. Once a second it steps the seed that
// rainbowAt() rotates the palette by, and it holds `rotate` on while it runs,
// because the seed is only read as `rotate ? seed : 0`.
//
// Nothing is animated: a seed change re-renders the colour subscribers, which
// is a paint and adds no compositing layer.
//
// The switch is stored like the other look settings (localStorage plus
// saveDisplayPrefs), the tick is not. There is no prefers-reduced-motion gate:
// this is a hidden mode, and finding it is a statement of intent. The storm
// level in index.css follows the same reasoning.
import { applyRainbow, applyStoredRainbow, rainbowState } from "./appearance";
import { save as saveDisplayPrefs } from "./displayPrefs";

const STORAGE_KEY = "bv-disco";

/** One colour step a second, well below the 3 Hz flicker limit named in
 *  photosensitivity guidance. */
export const DISCO_TICK_MS = 1000;

/** Turn-ons needed to unlock, like STORM_CLICKS in motion.ts. */
export const DISCO_UNLOCK_CLICKS = 5;

/** Longest pause between two turn-ons of one run, so somebody comparing
 *  rainbow on and off over a minute does not unlock disco by accident. */
export const DISCO_UNLOCK_WINDOW_MS = 3000;

/** getDisco returns the stored switch, false when unset or unreadable. */
export function getDisco(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

/** stopDisco stops the walk and is safe to call when nothing runs. The palette
 *  stays where the last tick left it; the caller decides whether to restore it. */
export function stopDisco(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

/**
 * applyStoredDisco starts or stops the walk to match the switch and sets
 * `data-disco` on the root element. It runs at boot and whenever the switch or
 * rainbow changes, and clears the previous interval first so two never run at
 * once.
 *
 * The tick calls applyRainbow, not setRainbow: setRainbow also writes
 * localStorage and syncs to the server, which would happen every second and
 * move the user's stored seed.
 */
export function applyStoredDisco(on: boolean = getDisco()): void {
  const wasWalking = timer !== null;
  stopDisco();

  const root = document.documentElement;
  if (on) root.setAttribute("data-disco", "on");
  else root.removeAttribute("data-disco");

  // With rainbow off nothing on screen is hued. The switch stays on, and the
  // walk resumes when main.tsx re-applies both after rainbow comes back.
  if (!on || !rainbowState().on) {
    // A finished walk leaves a live seed and a forced `rotate`; re-reading the
    // stored rainbow gives the user their own rotation back. At boot main.tsx
    // has just applied it, so only do this after a real walk.
    if (wasWalking) applyStoredRainbow({ animate: false });
    return;
  }

  const palette = rainbowState().palette.length || 1;
  timer = setInterval(() => {
    const live = rainbowState();
    // The seed is an offset that only applies with rotate on, and rotate is
    // off by default. Disco forces it on in the live state; the stored value
    // comes back when the walk stops.
    applyRainbow(
      { ...live, rotate: true, seed: (live.seed + 1) % palette },
      { animate: false },
    );
  }, DISCO_TICK_MS);
}

/** setDisco persists the switch and starts or stops the walk right away. */
export function setDisco(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "true" : "false");
    saveDisplayPrefs();
  } catch {
    // Storage disabled, as in a private window. The choice will not survive a
    // reload, but `on` is passed on so the switch and the walk agree until then.
  }
  applyStoredDisco(on);
}

/**
 * discoTap counts Rainbow Mode turn-ons that come within
 * DISCO_UNLOCK_WINDOW_MS of each other and returns true on the fifth.
 * Counting turn-ons rather than clicks means the gesture ends with rainbow on,
 * the only state in which disco has colours to walk.
 *
 * The caller holds the count, as with stormTap in motion.ts, so the unlock
 * itself is never persisted.
 */
export function discoTap(
  state: { taps: number; last: number },
  turnedOn: boolean,
  clock: { now: number },
): boolean {
  if (!turnedOn) return false;
  const gap = clock.now - state.last;
  state.last = clock.now;
  state.taps = state.taps > 0 && gap <= DISCO_UNLOCK_WINDOW_MS ? state.taps + 1 : 1;
  if (state.taps < DISCO_UNLOCK_CLICKS) return false;
  state.taps = 0;
  return true;
}
