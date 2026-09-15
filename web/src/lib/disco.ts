// ---------------------------------------------------------------------------
// Disco: rainbow, but the colours keep walking.
//
// Rainbow hands every row in a list its own colour out of a set of eight, read
// through `rainbowAt(index)`, which rotates that set by the state's `seed` when
// the state's `rotate` is on. Disco steps the seed once a second AND holds
// `rotate` on while it runs - the second half is not optional, because `seed`
// is only ever read as `rotate ? seed : 0`. So every hued element in the app
// moves to the next colour together while nothing else changes.
//
// It animates NOTHING, deliberately. There are no keyframes here and no new
// classes: a seed change re-renders the subscribers the colour engine already
// has, which is a paint, not a compositing layer. #228 was two entrance
// animations nesting their transforms and flashing on one engine, so a
// second-by-second effect built out of transforms was never on the table.
//
// Persistence mirrors motion.ts/appearance.ts: localStorage plus
// saveDisplayPrefs(), so the switch travels between browsers like every other
// look setting. The TICK never persists - see applyStoredDisco.
//
// No prefers-reduced-motion gate, on jdp's call (2026-09-15): this is a hidden
// mode somebody had to find, and finding it is a statement of intent. The same
// call covers "storm" in index.css, which is why that level now sits outside
// the (no-preference) block too.
// ---------------------------------------------------------------------------
import { applyRainbow, applyStoredRainbow, rainbowState } from "./appearance";
import { save as saveDisplayPrefs } from "./displayPrefs";

const STORAGE_KEY = "bv-disco";

/** One colour step a second. Fast enough to read as a disco, slow enough to
 *  stay well under the 3Hz flicker threshold photosensitivity guidance names. */
export const DISCO_TICK_MS = 1000;

/** Turn-ons needed to unlock, matching motion.ts's STORM_CLICKS. */
export const DISCO_UNLOCK_CLICKS = 5;

/** How long a run of turn-ons may pause before it counts as a new run.
 *  Without it, somebody comparing rainbow on against rainbow off over a
 *  minute would unlock a mode they never went looking for. */
export const DISCO_UNLOCK_WINDOW_MS = 3000;

/** The stored switch, false when unset or unreadable. */
export function getDisco(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

/** Stops the walk. Safe to call when nothing is running, which is what makes
 *  applyStoredDisco idempotent; the caller decides whether the palette the
 *  last tick left behind stays or gets handed back. */
export function stopDisco(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

/**
 * Starts or stops the walk to match the stored switch, and stamps
 * `data-disco` so a stylesheet or a test can tell disco from plain rainbow.
 *
 * Called at boot from main.tsx and again whenever the switch or rainbow
 * changes. Every entry stops the previous interval first: a second call would
 * otherwise leave two intervals racing and the colours would jump two steps a
 * second.
 *
 * The tick calls applyRainbow, never setRainbow. applyRainbow updates the live
 * state and notifies subscribers; setRainbow additionally writes localStorage
 * and calls saveDisplayPrefs. Ticking through the persisting path would mean a
 * storage write and a server sync every second for as long as the tab is open,
 * and it would grind the user's stored seed forward behind their back. The
 * seed disco shows is therefore live-only, and the stored one is whatever they
 * actually chose.
 */
export function applyStoredDisco(on: boolean = getDisco()): void {
  const wasWalking = timer !== null;
  stopDisco();

  const root = document.documentElement;
  if (on) root.setAttribute("data-disco", "on");
  else root.removeAttribute("data-disco");

  // Rainbow off means there is nothing hued on screen, so a walking seed
  // would be invisible work. The switch stays on and starts walking by
  // itself once rainbow comes back, because main.tsx re-applies both.
  if (!on || !rainbowState().on) {
    // A walk that just ended leaves the palette turned by however many steps
    // it managed, and `rotate` forced on (see the tick below). Both are
    // live-only, so re-reading the stored state hands the user back exactly
    // the rotation they chose - without which a stopped disco looks like the
    // rotate switch having turned itself on. Only after a real walk: at boot
    // main.tsx has applied the stored rainbow one line earlier already.
    if (wasWalking) applyStoredRainbow({ animate: false });
    return;
  }

  const palette = rainbowState().palette.length || 1;
  timer = setInterval(() => {
    const live = rainbowState();
    // `rotate: true` is what makes this visible at all. The seed is not a
    // colour, it is an OFFSET, and rainbowColorAt() applies it as
    // `rotate ? seed : 0` - so on the default setup (rotate off, which is
    // where almost everybody is, it has a switch of its own further down the
    // rainbow card) a walking seed renders byte-identically forever. Disco is
    // rotation over time, so it rotates, and it overrides that switch for as
    // long as it runs; the stored value is untouched and comes back above.
    applyRainbow(
      { ...live, rotate: true, seed: (live.seed + 1) % palette },
      { animate: false },
    );
  }, DISCO_TICK_MS);
}

/** Persists the switch and immediately starts or stops the walk. */
export function setDisco(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "true" : "false");
    saveDisplayPrefs();
  } catch {
    // Storage disabled, as in a private window. The choice cannot survive a
    // reload there, which is the trade every sibling setting makes - but the
    // apply below must not inherit the failure, which is why it is handed the
    // intent rather than left to re-read a key the write never reached. A
    // switch that reads ON while nothing walks is a worse outcome than a
    // switch that forgets itself on reload.
  }
  applyStoredDisco(on);
}

/**
 * The unlock gesture: five turn-ons of Rainbow Mode, each within
 * DISCO_UNLOCK_WINDOW_MS of the last. Returns true on the fifth.
 *
 * Counting turn-ONs rather than clicks does two things at once. It halves the
 * clicks needed (five, not five on and five off), and it makes the gesture end
 * with rainbow ON, which is the only state where disco has colours to walk -
 * a reward that arrives invisible is a bug report waiting to happen.
 *
 * The count lives in the caller, exactly like motion.ts's stormTap: an unlock
 * that persisted would turn a found secret into a permanent settings row, and
 * the row is offered while the mode is on anyway, since a switch that hid the
 * value it is showing would be lying.
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
