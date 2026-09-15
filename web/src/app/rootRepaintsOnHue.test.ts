// ---------------------------------------------------------------------------
// The app root subscribes to the colour engine, and that is load-bearing.
//
// A hue reaches an element as an INLINE STYLE computed during render:
// `hueVars(rainbowAt(n))` bakes a concrete hex plus four derived rgba strings
// into a style object (contrastOn() and the soft/wash/ring tints cannot be
// expressed as a CSS var reference, which is why they are baked). So an
// element only changes colour when its component RENDERS again.
//
// About a dozen components compute that style without calling useRainbow()
// themselves, and until Disco that was invisible: rainbow is edited on the
// Settings page, and every other page mounts fresh afterwards, so it read its
// colours at first render and was never asked to change them mid-life.
//
// Disco turns the colour engine into a writer that fires once a second while
// the user is looking at some other page. Without a subscription above the
// routes, the parts that do subscribe (the sidebar, the selectors) walk while
// the parts that do not (dashboard cards, buttons, badges in a log) stay on
// the colour they were born with - and "position three is teal" stops being
// true across one screen, which is the entire promise of the mode.
//
// One subscription at the root repaints everything below it, which is also
// the pre-existing fix for a mounted page never noticing a palette edit.
//
// Node environment: this reads source, it does not render.
// ---------------------------------------------------------------------------
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) sources(full, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

describe("the colour engine's root subscription", () => {
  it("exists, so a hue change repaints the whole tree", () => {
    const router = readFileSync(join(SRC, "app", "router.tsx"), "utf8");
    expect(router).toMatch(/useRainbow\s*\(\s*\)/);
  });

  it("is load-bearing: consumers that never subscribe themselves exist", () => {
    // Without this, somebody could read the root subscription as redundant
    // ("every list subscribes already") and remove it. These are the files
    // that would silently stop following the palette if they did.
    const unsubscribed = sources(SRC)
      .filter((f) => !f.endsWith(join("app", "router.tsx")))
      .filter((f) => {
        const text = readFileSync(f, "utf8");
        return /\b(rainbowAt|rainbowColor)\s*\(/.test(text) && !/\buseRainbow\s*\(/.test(text);
      })
      .map((f) => relative(SRC, f));
    expect(unsubscribed.length).toBeGreaterThan(0);
  });
});
