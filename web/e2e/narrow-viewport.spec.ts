// ---------------------------------------------------------------------------
// Narrow-viewport backstop — the operationalized UI-SPEC UI Considerations
// long-text row (phase 05 plan 06, Task 2).
//
// UI-SPEC's one backstop state, made executable evidence: German and French
// chrome must fit 320-360px — the de compound words ("Einstellungen",
// "Wiederherstellung") and fr accented long labels ("Paramètres",
// "Récupération") are the stress cases. For every combination of {de, fr} x
// {320px, 360px}, every bottom-bar slot caption and every More-sheet row
// label stays on a SINGLE line box and the bar container shows NO horizontal
// overflow — the min-w-0 + truncate CSS contract's visible outcome.
//
// Geometry, not screenshots (fast + non-flaky): each caption's height is
// measured against an explicitly normalized 20px line box — with the
// truncate contract intact (white-space: nowrap) a caption IS one line box;
// a dropped contract lets a long label wrap into a second box (~40px),
// which is the exact failure mode the 1.5x bound cannot pass. Overflow is
// scrollWidth vs clientWidth on the bar itself. Both measurements tolerate
// subpixel rounding (+0.5/+1px) and nothing else.
//
// The locale is seeded the way a returning visitor's browser carries it —
// the persisted `bv-lang` localStorage key (web/src/lib/i18n.ts STORAGE_KEY;
// not exported, kept in sync by hand) — via addInitScript BEFORE the first
// page script runs. The mobile chrome has no language control this phase
// (the switcher lives in the desktop-only Sidebar controls), so there is no
// UI-driven path; seeding is the only honest way to boot the page in de/fr.
//
// The boot-time display-prefs reconciliation is cut (see bootSeededPage):
// the server is the truth for the look (#191), so a stored bv-lang on the
// harness DB would silently overwrite this page's seed — and with de/fr
// workers running in parallel, each page would see whichever locale booted
// first, not its own.
// ---------------------------------------------------------------------------
import { expect, test, type Page } from "@playwright/test";

// The two device projects from playwright.config.ts — the backstop targets
// the mobile chrome, which only exists below the 48rem switch.
const MOBILE_PROJECTS = new Set(["mobile-iphone", "mobile-android"]);

// Persisted-locale localStorage key (i18n.ts STORAGE_KEY) + the localized
// "More" trigger label per locale. Waiting on the localized trigger before
// measuring proves the locale TABLE is live (de ships inline; fr arrives via
// its async locale chunk) — measuring before that would silently assert the
// English fallback instead of the stress-case strings.
const LOCALE_STORAGE_KEY = "bv-lang";
const MORE_LABEL = { de: "Mehr", fr: "Plus" } as const;
// The sheet's fresh-DB stress-case row: the always-on Recovery destination.
const RECOVERY_LABEL = { de: "Wiederherstellung", fr: "Récupération" } as const;

// Explicit single-line box used for the height arithmetic (see header).
const LINE_BOX = 20;

// Boot the page with THIS test's locale standing, immune to the server-side
// look and to the other workers: seed the persisted key before any page
// script runs (a returning visitor's localStorage), then abort the
// boot-time display-prefs reconciliation. sync()'s fetch failing is the
// app's own documented degradation path ("offline: the cache is the look",
// displayPrefs.ts / #191), so the seeded locale renders — and nothing is
// PUT back to the shared harness server, which is what makes parallel de/fr
// workers deterministic (a booted de page otherwise seeds bv-lang=de on the
// server and every later fr boot adopts it — observed live in this phase).
async function bootSeededPage(page: Page, locale: string, width: number): Promise<void> {
  await page.route("**/api/display-prefs*", (route) => route.abort());
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [LOCALE_STORAGE_KEY, locale] as const,
  );
  await page.setViewportSize({ width, height: 700 });
  await page.goto("/dashboard");
}

const locales = ["de", "fr"] as const;
const widths = [320, 360];

for (const locale of locales) {
  for (const width of widths) {
    test(`narrow viewport ${locale} @ ${width}px: bar and sheet labels single-line, bar never overflows`, async ({ page }, testInfo) => {
      test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "mobile-only: the backstop targets the mobile chrome");
      await bootSeededPage(page, locale, width);

      // The locale table is live: the trigger carries its localized label.
      const bar = page.getByTestId("bottom-nav");
      const moreTrigger = bar.getByRole("button", { name: MORE_LABEL[locale] });
      await expect(moreTrigger).toBeVisible();

      // Single-line contract, bar captions: every slot caption is one
      // normalized line box (+subpixel), never two (~2x). Two full line
      // boxes need >= 2 * LINE_BOX, so the 1.5x bound is strict about the
      // two-line failure mode while tolerating subpixel rounding.
      const captionStats = await bar
        .locator("span.truncate")
        .evaluateAll(
          (els, box) =>
            els.map((el) => {
              el.style.lineHeight = `${box}px`;
              const height = el.getBoundingClientRect().height;
              el.style.lineHeight = "";
              return { text: (el.textContent ?? "").trim(), height };
            }),
          LINE_BOX,
        );
      expect(
        captionStats.length,
        "the bar must carry caption labels to assert against",
      ).toBeGreaterThan(0);
      for (const s of captionStats) {
        expect(s.height, `caption "${s.text}" must stay on one line`).toBeGreaterThan(0);
        expect(
          s.height,
          `caption "${s.text}" wrapped to a second line (height ${s.height}px vs one ${LINE_BOX}px line box)`,
        ).toBeLessThanOrEqual(LINE_BOX * 1.5 + 0.5);
      }

      // No-overflow contract: the bar never scrolls horizontally — with
      // min-w-0 + truncate the slots shrink/ellipsis instead of pushing the
      // bar wider than the viewport. (+1px subpixel tolerance.)
      const barOverflow = await bar.evaluate((el) => ({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }));
      expect(
        barOverflow.scrollWidth,
        `the bar overflows horizontally at ${width}px (${barOverflow.scrollWidth} > ${barOverflow.clientWidth})`,
      ).toBeLessThanOrEqual(barOverflow.clientWidth + 1);

      // Same single-line contract inside the More sheet: open it and measure
      // every destination row's label span (the long de/fr Recovery label is
      // the fresh-DB stress case; the sheet is where >1 row lands later).
      await moreTrigger.click();
      const sheet = page.getByTestId("more-sheet");
      await expect(sheet).toBeVisible();
      await expect(sheet.getByRole("link", { name: RECOVERY_LABEL[locale] })).toBeVisible();

      const rowStats = await sheet
        .getByRole("link")
        .locator("span.truncate")
        .evaluateAll(
          (els, box) =>
            els.map((el) => {
              el.style.lineHeight = `${box}px`;
              const height = el.getBoundingClientRect().height;
              el.style.lineHeight = "";
              return { text: (el.textContent ?? "").trim(), height };
            }),
          LINE_BOX,
        );
      expect(
        rowStats.length,
        "the sheet must carry row labels to assert against",
      ).toBeGreaterThan(0);
      for (const s of rowStats) {
        expect(s.height, `sheet row "${s.text}" must stay on one line`).toBeGreaterThan(0);
        expect(
          s.height,
          `sheet row "${s.text}" wrapped to a second line (height ${s.height}px)`,
        ).toBeLessThanOrEqual(LINE_BOX * 1.5 + 0.5);
      }
    });
  }
}
