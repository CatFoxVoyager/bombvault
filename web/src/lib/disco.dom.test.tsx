// @vitest-environment jsdom
// Disco: a persisted tick would write localStorage and sync to the server on
// every step, so only the switch is stored. The unlock gesture counts
// turn-ons inside a time window, so comparing rainbow on and off does not
// trigger it.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DISCO_TICK_MS,
  DISCO_UNLOCK_CLICKS,
  DISCO_UNLOCK_WINDOW_MS,
  applyStoredDisco,
  discoTap,
  getDisco,
  setDisco,
  stopDisco,
} from "./disco";
import { getRainbow, rainbowAt, rainbowState, setRainbow } from "./appearance";

const STORAGE_KEY = "bv-disco";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-rainbow");
  document.documentElement.removeAttribute("data-disco");
  vi.useFakeTimers();
});

afterEach(() => {
  stopDisco();
  vi.useRealTimers();
});

describe("the switch", () => {
  it("is off when nothing is stored", () => {
    expect(getDisco()).toBe(false);
  });

  it("persists and reads back", () => {
    setDisco(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
    expect(getDisco()).toBe(true);
    setDisco(false);
    expect(getDisco()).toBe(false);
  });

  it("is off for a corrupt stored value", () => {
    localStorage.setItem(STORAGE_KEY, "{{");
    expect(getDisco()).toBe(false);
  });
});

describe("the tick", () => {
  it("walks the seed once a tick while rainbow is on", () => {
    setRainbow({ on: true, seed: 0 });
    setDisco(true);
    applyStoredDisco();
    const before = rainbowState().seed;
    vi.advanceTimersByTime(DISCO_TICK_MS);
    expect(rainbowState().seed).not.toBe(before);
    const after = rainbowState().seed;
    vi.advanceTimersByTime(DISCO_TICK_MS);
    expect(rainbowState().seed).not.toBe(after);
  });

  it("does not persist the ticking seed", () => {
    setRainbow({ on: true, seed: 0 });
    setDisco(true);
    applyStoredDisco();
    const stored = localStorage.getItem("bv-rainbow");
    vi.advanceTimersByTime(DISCO_TICK_MS * 5);
    expect(localStorage.getItem("bv-rainbow")).toBe(stored);
    expect(getRainbow().seed).toBe(0);
  });

  it("does not run while rainbow is off", () => {
    setRainbow({ on: false, seed: 0 });
    setDisco(true);
    applyStoredDisco();
    const before = rainbowState().seed;
    vi.advanceTimersByTime(DISCO_TICK_MS * 3);
    expect(rainbowState().seed).toBe(before);
  });

  it("does not run while the switch is off", () => {
    setRainbow({ on: true, seed: 0 });
    setDisco(false);
    applyStoredDisco();
    const before = rainbowState().seed;
    vi.advanceTimersByTime(DISCO_TICK_MS * 3);
    expect(rainbowState().seed).toBe(before);
  });

  it("starts only one interval however often it is applied", () => {
    setRainbow({ on: true, seed: 0 });
    setDisco(true);
    applyStoredDisco();
    applyStoredDisco();
    applyStoredDisco();
    vi.advanceTimersByTime(DISCO_TICK_MS);
    // One step, not three: each apply replaces the interval.
    expect(rainbowState().seed).toBe(1);
  });

  it("stops when the switch goes off", () => {
    setRainbow({ on: true, seed: 0 });
    setDisco(true);
    applyStoredDisco();
    vi.advanceTimersByTime(DISCO_TICK_MS);
    setDisco(false);
    // Read after the switch-off, which restores the stored rotation.
    const parked = rainbowState().seed;
    vi.advanceTimersByTime(DISCO_TICK_MS * 3);
    expect(rainbowState().seed).toBe(parked);
  });

  // The seed only applies with `rotate` on, which defaults to off, so a tick
  // that walked the seed alone would change nothing on screen.
  it("moves the colours even when the user's own rotate switch is off", () => {
    setRainbow({ on: true, rotate: false, seed: 0 });
    const resting = rainbowAt(0);
    setDisco(true);
    vi.advanceTimersByTime(DISCO_TICK_MS);
    expect(rainbowAt(0)).not.toBe(resting);
  });

  it("restores the stored rotate switch and palette when it stops", () => {
    setRainbow({ on: true, rotate: false, seed: 0 });
    const resting = rainbowAt(0);
    setDisco(true);
    vi.advanceTimersByTime(DISCO_TICK_MS * 3);
    setDisco(false);
    expect(rainbowState().rotate).toBe(false);
    expect(rainbowAt(0)).toBe(resting);
  });

  it("keeps a chosen rotation and seed when it stops", () => {
    setRainbow({ on: true, rotate: true, seed: 3 });
    const chosen = rainbowAt(0);
    setDisco(true);
    vi.advanceTimersByTime(DISCO_TICK_MS * 2);
    setDisco(false);
    expect(rainbowState().rotate).toBe(true);
    expect(rainbowState().seed).toBe(3);
    expect(rainbowAt(0)).toBe(chosen);
  });

  it("sets data-disco on the document while it is on", () => {
    setRainbow({ on: true });
    setDisco(true);
    applyStoredDisco();
    expect(document.documentElement.getAttribute("data-disco")).toBe("on");
    setDisco(false);
    expect(document.documentElement.hasAttribute("data-disco")).toBe(false);
  });

  it("cuts a glide short when the walk stops, and leaves other animations alone", () => {
    // Chromium keeps a transition on a registered property running after its
    // rule stops matching, so the restored palette would land a tick late.
    const root = document.documentElement;
    const glide = { transitionProperty: "--rb-3", cancel: vi.fn() };
    const other = { transitionProperty: "opacity", cancel: vi.fn() };
    root.getAnimations = () => [glide, other] as unknown as Animation[];
    try {
      setRainbow({ on: true });
      setDisco(true);
      vi.advanceTimersByTime(DISCO_TICK_MS);
      setDisco(false);
      expect(glide.cancel).toHaveBeenCalled();
      expect(other.cancel).not.toHaveBeenCalled();
    } finally {
      delete (root as { getAnimations?: unknown }).getAnimations;
    }
  });

  it("hands the stylesheet a glide as long as one step", () => {
    // index.css glides each hue over --disco-step. A shorter glide pauses
    // between steps, a longer one is overtaken before it arrives.
    const root = document.documentElement;
    setRainbow({ on: true });
    setDisco(true);
    expect(root.style.getPropertyValue("--disco-step")).toBe(`${DISCO_TICK_MS}ms`);
    setDisco(false);
    expect(root.style.getPropertyValue("--disco-step")).toBe("");
  });
});

describe("the unlock gesture", () => {
  const at = (ms: number) => ({ now: ms });

  it("opens on the fifth turn-on", () => {
    const s = { taps: 0, last: 0 };
    for (let i = 1; i < DISCO_UNLOCK_CLICKS; i += 1) {
      expect(discoTap(s, true, at(i * 500))).toBe(false);
    }
    expect(discoTap(s, true, at(DISCO_UNLOCK_CLICKS * 500))).toBe(true);
  });

  it("ignores turn-offs", () => {
    const s = { taps: 0, last: 0 };
    for (let i = 0; i < DISCO_UNLOCK_CLICKS * 2; i += 1) {
      expect(discoTap(s, false, at(i * 500))).toBe(false);
    }
    expect(s.taps).toBe(0);
  });

  it("forgets the count when the clicks are too far apart", () => {
    const s = { taps: 0, last: 0 };
    discoTap(s, true, at(0));
    discoTap(s, true, at(DISCO_UNLOCK_WINDOW_MS + 1));
    // The second click starts a new run.
    expect(s.taps).toBe(1);
  });

  it("resets the count once it opens", () => {
    const s = { taps: 0, last: 0 };
    for (let i = 1; i <= DISCO_UNLOCK_CLICKS; i += 1) discoTap(s, true, at(i * 500));
    expect(s.taps).toBe(0);
  });
});
