import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Platform — material / cupertino via data-platform on <html> + localStorage.
//
// The PLAT-01 platform-adaptive chrome layer (phase 7, D-12). The structure is
// shape.ts's model verbatim — closed union, validate-or-fall-back coercion,
// ONE application choke point — because it is the same kind of setting: a
// small fixed enum painted onto <html> via one attribute. index.css's
// [data-platform] blocks redefine only --mob-* custom properties (FAB radius,
// title size/weight, check shape, chip pill) consumed below the md breakpoint,
// so the attribute reshapes chrome and never recolors it.
//
// WHY NO OS DETECTION (recorded decision, 07-UI-SPEC "platform selection"):
// default "material", a persisted user override, and nothing else. A web page
// cannot honestly distinguish Android from iOS — user-agent sniffing is banned
// app-wide (the mobileShellSource guard keeps both UA identifiers out of
// src/), and (pointer: coarse) is an input-capability axis, not a platform
// identity (useMediaQuery.ts's header), so it cannot tell the two apart
// either. Until a preference control ships (phase 8's real-device pass is the
// scheduled venue), both platforms present the material expression; the
// cupertino layer is real and e2e-verifiable via the attribute.
// ---------------------------------------------------------------------------

export type Platform = "material" | "cupertino";

export const PLATFORMS: Platform[] = ["material", "cupertino"];

export const PLATFORM_STORAGE_KEY = "bv-platform";
export const DEFAULT_PLATFORM: Platform = "material";

function isPlatform(v: unknown): v is Platform {
  return typeof v === "string" && (PLATFORMS as string[]).includes(v);
}

// The window event usePlatform() subscribes to — the useLabelMode shape
// ("bv:label-mode-changed"): a value applied in one place and structurally
// consumed in others is announced, not polled, so a flip updates every mounted
// consumer at once instead of only after a reload. Dispatch lives INSIDE
// applyPlatform() so the one choke point stays the one announcer.
const PLATFORM_CHANGED = "bv:platform-changed";

/** The stored preference, defaulting to "material" when unset or corrupt. */
export function getPlatform(): Platform {
  const stored = localStorage.getItem(PLATFORM_STORAGE_KEY);
  return isPlatform(stored) ? stored : DEFAULT_PLATFORM;
}

/**
 * applyPlatform sets the attribute the --mob-* tokens in index.css key off,
 * validating against PLATFORMS and falling back to "material" for anything
 * else — matches shape.ts's own applyShape() exactly, so a caller can hand
 * this an unvalidated value (straight out of localStorage) without checking
 * it first. This is the ONLY setAttribute("data-platform", ...) call site in
 * src/ (guarded in mobileShellSource.test.ts), so a stored value can never
 * reach the DOM uncoerced (T-07-01).
 */
export function applyPlatform(platform: Platform | string | undefined): void {
  const s = isPlatform(platform) ? platform : DEFAULT_PLATFORM;
  document.documentElement.setAttribute("data-platform", s);
  window.dispatchEvent(new Event(PLATFORM_CHANGED));
}

/** Called at boot in main.tsx before first render (flash prevention), same
 * spot applyStoredShape()/applyStoredMotionIntensity()/applyStoredLabelModes()
 * run from — and again inside main.tsx's ADOPTED_EVENT listener, the #191
 * call-order discipline: re-apply every document-element axis when the server
 * look lands. bv-platform is not (yet) one of displayPrefs' synced KEYS, so
 * adoption can never overwrite it — the re-apply simply re-reads whatever
 * this browser has stored. */
export function applyStoredPlatform(): void {
  applyPlatform(getPlatform());
}

/** The APPLIED platform — the attribute, not the stored preference. The
 *  attribute is what the page actually renders (applyPlatform's coerced
 *  output), so the structural switch reads it; reading storage instead would
 *  report a value no one applied whenever the two ever disagree (a hand-seeded
 *  key, a corrupt value coerced away — exactly the divergence the choke point
 *  exists to prevent). */
function currentPlatform(): Platform {
  const attr = document.documentElement.getAttribute("data-platform");
  return isPlatform(attr) ? attr : DEFAULT_PLATFORM;
}

/**
 * usePlatform — the reader for the ONE sanctioned kind of platform branch:
 * the structural switches (the Fab renders under material and is null under
 * cupertino, its consumer's pinned button is the cupertino equivalent).
 * Everything else is attribute-CSS — a usePlatform() conditional inside a
 * page block is the Pitfall-5 anti-pattern. Event-driven like useLabelMode,
 * but reading the ATTRIBUTE (see currentPlatform): the initial value is
 * whatever boot already stamped (main.tsx applies before first render, so
 * first paint is already right), then re-read on applyPlatform's
 * announcement. A cross-tab "storage" event is routed through the choke
 * point itself — the attribute does not follow another tab's storage write
 * on its own, and re-applying from storage keeps ONE coercion + ONE writer.
 */
export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>(() => currentPlatform());
  useEffect(() => {
    const reread = () => setPlatform(currentPlatform());
    const crossTab = () => applyStoredPlatform();
    window.addEventListener(PLATFORM_CHANGED, reread);
    window.addEventListener("storage", crossTab);
    return () => {
      window.removeEventListener(PLATFORM_CHANGED, reread);
      window.removeEventListener("storage", crossTab);
    };
  }, []);
  return platform;
}
