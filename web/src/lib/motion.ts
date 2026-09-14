import { save as saveDisplayPrefs } from "./displayPrefs";
// ---------------------------------------------------------------------------
// Motion intensity — off / subtle / wild via data-motion on <html> +
// localStorage.
//
// GlimStone motion-engine — a NEW axis (jdp, live-review: "Wäre eine
// Animationsengine gut?" -> "Echte Engine mit eigenem Nutzer-Schalter"), a
// DELIBERATE reversal of design-language.md's own prior Motion-Engine
// section (2026-08-18: "kein In-App-Schalter dafür ... kein fünfter
// Nutzer-Schalter, rein OS-gesteuert für jetzt"). jdp has now explicitly
// decided this should exist after all — see that doc's updated Motion
// Intensity write-up for the full course-correction note, quoting the old
// text rather than silently dropping it.
//
// Architecture mirrors shape.ts byte-for-byte: a small fixed enum painted
// onto <html> via one attribute, validated-or-fall-back-to-default,
// localStorage-only (no server round-trip — same "single-operator tool, no
// second viewer who needs to agree" reasoning shape.ts's own header already
// gives, and the same "applied at the app root" client-only pattern every
// other GlimStone axis in this app already follows — see
// apply-global-look-at-app-root for why these all stay client-side).
//
// This is a MANUAL preference that sits ALONGSIDE prefers-reduced-motion,
// never in front of it: index.css keys data-motion's actual effect strictly
// inside its own `@media (prefers-reduced-motion: no-preference)` block, so
// an OS-level reduced-motion user is unaffected by whatever this attribute
// says — that media query, not this file, is what enforces "OS wins." See
// index.css's own "Motion intensity" section header for the full cascade
// design and the off/subtle/wild resolution table for every keyframe.
// ---------------------------------------------------------------------------

export type MotionIntensity = "off" | "subtle" | "wild" | "storm";

/**
 * What the PICKER offers. "storm" is deliberately absent.
 *
 * The two questions this list used to answer at once are now separate, and an
 * axis with a hidden level is exactly where conflating them shows: what a
 * picker lists and what a stored value may legally be are not the same set.
 * See isMotionIntensity below, which accepts "storm", and GSS 1.17.0's
 * "A hidden fourth level" for the rule.
 */
export const MOTION_INTENSITIES: MotionIntensity[] = ["off", "subtle", "wild"];

/** Every level, including the one no picker lists. Validation reads this. */
const ALL_INTENSITIES: MotionIntensity[] = [...MOTION_INTENSITIES, "storm"];

/** How many clicks on the level already chosen open the one below the floor. */
export const STORM_CLICKS = 5;

/**
 * The gesture that reveals the storm, GSS 1.17.0.
 *
 * SET THE MOTION TO "wild", THEN CLICK THAT SAME OPTION FIVE MORE TIMES. It is
 * the gesture of pressing a button that is already pressed because you wanted
 * more of it, which is exactly who the level is for, and it is unreachable from
 * any other level on purpose: clicking "off" five times means somebody is
 * annoyed, not curious, and a secret that opens under annoyance is a bug report
 * waiting to be filed.
 *
 * THE RULE, which is the part worth copying rather than the numbers: an easter
 * egg that changes BEHAVIOUR must be switchable back off, and must not quietly
 * become a permanent entry in a settings list. So the caller keeps `found` in
 * the settings screen's own state and NEVER in storage: the option is offered
 * while it is chosen, because a picker that hid the value it is showing would
 * be lying, and otherwise only for as long as that screen stays open.
 *
 * Counting lives in the caller for the same reason. Returns the level to switch
 * to, or undefined when this was not the fifth click.
 */
export function stormTap(
  state: { taps: number },
  clicked: string,
  current: MotionIntensity,
): MotionIntensity | undefined {
  if (clicked !== "wild" || current !== "wild") {
    state.taps = 0;
    return undefined;
  }
  state.taps += 1;
  if (state.taps < STORM_CLICKS) return undefined;
  state.taps = 0;
  return "storm";
}

const STORAGE_KEY = "bv-motion";

/**
 * DEFAULT is "wild", not shape.ts's kind of arbitrary-but-fixed pick and not
 * theme.ts's "system" either — deliberately chosen, not just copied:
 *   - "system" (mirroring theme.ts) would be redundant here specifically,
 *     not wrong in general: prefers-reduced-motion is ALREADY read
 *     unconditionally by index.css's own (reduce) media block, completely
 *     independent of this attribute. A "system" option for THIS axis would
 *     just re-derive a signal the app already honours everywhere, for a
 *     control whose entire reason to exist is letting a user without OS-
 *     level reduced-motion still dial intensity as a STYLE preference.
 *   - "wild" over "off"/"subtle" because this axis is additive polish a
 *     user dials DOWN, not a compatibility fallback a user has to opt INTO
 *     — the same reasoning rainbow mode's own default (RAINBOW_OFF, an
 *     opt-in) does NOT apply here: rainbow changes what a list looks like
 *     (a real visual identity choice with no obviously-correct default),
 *     while motion intensity only ever makes existing, already-shipped
 *     animations quicker/smaller/absent — "wild" is simply what this app
 *     already looked like before this axis existed, so booting there means
 *     nobody's experience changes just because the toggle now exists.
 */
const DEFAULT: MotionIntensity = "wild";

/* ALL_INTENSITIES, not MOTION_INTENSITIES. A stored "storm" is accepted even
   though no picker offers it, or the gesture above would have produced a
   setting that silently forgets itself on the next reload - and a hidden level
   that cannot survive a page refresh is not a level, it is a flicker. */
function isMotionIntensity(v: unknown): v is MotionIntensity {
  return typeof v === "string" && (ALL_INTENSITIES as string[]).includes(v);
}

/** The stored preference, defaulting to "wild" when unset or corrupt. */
export function getMotionIntensity(): MotionIntensity {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isMotionIntensity(stored) ? stored : DEFAULT;
}

/**
 * applyMotionIntensity sets the attribute index.css's motion tokens key off,
 * validating against ALL_INTENSITIES and falling back to "wild" for anything
 * else — matches shape.ts's own applyShape() exactly, so a caller can hand
 * this an unvalidated value (straight out of localStorage, say) without
 * checking it first.
 *
 * ALL_INTENSITIES and not MOTION_INTENSITIES, which is the same distinction
 * isMotionIntensity above is written for: what the picker LISTS is three
 * levels, what a stored value may legally BE is four. Validating against the
 * picker's list here would throw a stored "storm" away on every boot.
 */
export function applyMotionIntensity(intensity: MotionIntensity | string | undefined): void {
  const m = isMotionIntensity(intensity) ? intensity : DEFAULT;
  document.documentElement.setAttribute("data-motion", m);
}

/** setMotionIntensity persists the choice and applies it immediately (no
 * separate "Save" step, matching shape.ts's setShape()/accent.ts's
 * setAccent()). */
export function setMotionIntensity(intensity: MotionIntensity): void {
  localStorage.setItem(STORAGE_KEY, intensity);
  saveDisplayPrefs();
  applyMotionIntensity(intensity);
}

/** Called at boot in main.tsx before first render (flash prevention), same
 * spot shape.ts's applyStoredShape()/accent.ts's applyStoredAccent()/
 * theme.ts's applyStoredTheme() already run from. */
export function applyStoredMotionIntensity(): void {
  applyMotionIntensity(getMotionIntensity());
}
