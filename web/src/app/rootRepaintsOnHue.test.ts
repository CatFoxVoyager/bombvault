// The app root subscribes to the colour engine. A hue reaches an element as an
// inline style computed during render (`hueVars(rainbowAt(n))` bakes a hex and
// four derived tints that cannot be CSS var references), so an element only
// changes colour when its component renders again. Many components compute
// that style without calling useRainbow(), and disco changes the palette every
// second while any page is open, so without the root subscription those parts
// would keep their first colour while the subscribed ones moved on.
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

  it("is needed: some hue consumers do not subscribe themselves", () => {
    // The files that would stop following the palette without the root.
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
