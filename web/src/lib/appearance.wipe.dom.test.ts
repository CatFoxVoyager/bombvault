// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// The colour wipe fires for a flip somebody MADE, and never for a look that
// merely arrived.
//
// Reported as #228: "when switching options the screen flashes green". Measured
// from the reporter's own video, a heading badge travelled from the flat accent
// to a rainbow hue and back over about 160 ms while the accent itself never
// changed. The cause is two applies, not one: main.tsx applies every stored
// axis before first paint, and applies them AGAIN when the server hands this
// browser a different stored look. The wipe gate only ever suppressed the
// first, so the second animated a change nobody had made, across the whole
// page, a moment after paint.
//
// Both halves are pinned here, because the fix is one boolean and the obvious
// "simplification" later is to drop it:
//
//   a real flip     still wipes. Removing that makes a mode change snap, which
//                   is the animation this engine exists for.
//   an adopted look never wipes, but its VALUE still lands. Skipping the value
//                   too would leave the browser showing the wrong look.
// ---------------------------------------------------------------------------
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const WIPE = "glim-colour-wipe";

async function freshModule() {
  vi.resetModules();
  return import("./appearance");
}

beforeEach(() => {
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-rainbow");
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("colour wipe", () => {
  it("stays quiet on the boot apply, because nothing is on screen yet", async () => {
    const a = await freshModule();
    a.applyRainbow({ on: true });
    expect(document.documentElement.classList.contains(WIPE)).toBe(false);
    expect(document.documentElement.getAttribute("data-rainbow")).toBe("on");
  });

  it("wipes on a genuine flip after mount", async () => {
    const a = await freshModule();
    a.applyRainbow({ on: false }); // boot
    a.applyRainbow({ on: true }); // somebody switched it on
    expect(document.documentElement.classList.contains(WIPE)).toBe(true);
  });

  it("does NOT wipe when the same look merely arrives from the server", async () => {
    const a = await freshModule();
    a.applyRainbow({ on: false }); // boot, from localStorage
    a.applyRainbow({ on: true }, { animate: false }); // the adopted look
    expect(
      document.documentElement.classList.contains(WIPE),
      "an adopted look animated a change nobody made: every hued element walks " +
        "from the flat accent to its own hue across the whole page, right after paint (#228)",
    ).toBe(false);
  });

  it("still applies the adopted value, it only skips the excursion", async () => {
    const a = await freshModule();
    a.applyRainbow({ on: false });
    a.applyRainbow({ on: true }, { animate: false });
    expect(
      document.documentElement.getAttribute("data-rainbow"),
      "the adopted look must still LAND - suppressing the animation must not suppress the value",
    ).toBe("on");
  });

  it("a later real flip still wipes after an adopted one", async () => {
    // The adopt must not poison the gate for the flips that follow it.
    const a = await freshModule();
    a.applyRainbow({ on: false });
    a.applyRainbow({ on: true }, { animate: false });
    document.documentElement.classList.remove(WIPE);
    a.applyRainbow({ on: false });
    expect(document.documentElement.classList.contains(WIPE)).toBe(true);
  });

  it("a re-apply of the identical value never wipes, animated or not", async () => {
    const a = await freshModule();
    a.applyRainbow({ on: true });
    a.applyRainbow({ on: true });
    expect(document.documentElement.classList.contains(WIPE)).toBe(false);
  });
});
