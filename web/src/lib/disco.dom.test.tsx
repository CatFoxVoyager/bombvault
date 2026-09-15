// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Disco: the hidden fourth thing the colour engine can do.
//
// Rainbow gives every row its own colour from a set of eight. Disco walks
// that set, one step a second, so the colours a list is already wearing keep
// moving. It reuses the seed the palette is already read through rather than
// animating anything, which is the whole reason it is cheap: no keyframes, no
// extra compositing layers, and after #228 that distinction is not academic.
//
// Four things here are easy to get wrong and every one of them is quiet:
//   - A tick that PERSISTS would write to localStorage and sync to the server
//     once a second, forever. The tick applies; only the switch stores.
//   - Disco without rainbow has nothing to colour, so it must not run.
//   - A hidden tab keeps its interval unless somebody stops it.
//   - An unlock gesture that counts plain toggle clicks fires while somebody
//     is merely comparing the mode on and off. It counts turn-ONs, inside a
//     time window, and lands on "on" so the reward arrives in a state that
//     can show it.
// ---------------------------------------------------------------------------
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
import { getRainbow, rainbowState, setRainbow } from "./appearance";

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
  it("walks the seed once per second while rainbow is on", () => {
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

  it("never persists, so a second of disco is not a write", () => {
    setRainbow({ on: true, seed: 0 });
    setDisco(true);
    applyStoredDisco();
    const stored = localStorage.getItem("bv-rainbow");
    vi.advanceTimersByTime(DISCO_TICK_MS * 5);
    expect(localStorage.getItem("bv-rainbow")).toBe(stored);
    expect(getRainbow().seed).toBe(0);
  });

  it("does not run while rainbow is off, since there is nothing to colour", () => {
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
    // One step, not three: a second apply must replace the interval rather
    // than add a second one racing it.
    expect(rainbowState().seed).toBe(1);
  });

  it("stops when the switch goes off", () => {
    setRainbow({ on: true, seed: 0 });
    setDisco(true);
    applyStoredDisco();
    vi.advanceTimersByTime(DISCO_TICK_MS);
    setDisco(false);
    const parked = rainbowState().seed;
    vi.advanceTimersByTime(DISCO_TICK_MS * 3);
    expect(rainbowState().seed).toBe(parked);
  });

  it("marks the document so a reader can tell disco from plain rainbow", () => {
    setRainbow({ on: true });
    setDisco(true);
    applyStoredDisco();
    expect(document.documentElement.getAttribute("data-disco")).toBe("on");
    setDisco(false);
    expect(document.documentElement.hasAttribute("data-disco")).toBe(false);
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

  it("ignores turn-offs, so the gesture ends in a state that can show it", () => {
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
    // The second click restarted the run rather than continuing it, so this
    // is click two of five, not four of five.
    expect(s.taps).toBe(1);
  });

  it("starts over after it has opened, so a sixth turn-on is not a seventh", () => {
    const s = { taps: 0, last: 0 };
    for (let i = 1; i <= DISCO_UNLOCK_CLICKS; i += 1) discoTap(s, true, at(i * 500));
    expect(s.taps).toBe(0);
  });
});
