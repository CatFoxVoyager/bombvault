// ---------------------------------------------------------------------------
// Tap-popovers e2e — the real-binary contract for PRIM-02 (phase 06 plan 03,
// Task 3).
//
// The dom tests prove TapPopover's SEMANTICS in jsdom; this spec proves the
// tap contracts on the real binary in real device emulation, where the
// (pointer: coarse) media query, hasTouch tap() dispatch and laid-out pixels
// actually exist:
//
//   mobile (both device projects):
//     1. an InfoBubble — dead on touch before this phase — opens on tap and
//        dismisses on an outside tap (its useTipBubble tap path),
//     2. Escape dismisses an open popover AND focus returns to the trigger
//        (the D-09 light-focus restore, end to end),
//     3. the color picker's panel opens fully INSIDE the viewport — the
//        computeBubblePosition clamp against the 360/390px screen edge, the
//        exact clipping this primitive exists to fix — and dismisses on an
//        outside tap with focus restored.
//
//   Host note (07-06): tests 2-3 were born on the Containers FilterPopover,
//   whose MOBILE presentation the LISTS-01 retrofit retired — below the
//   breakpoint that page's filters are now the in-flow ListToolbar (D-10),
//   and every remaining FilterPopover call site is `max-md:hidden` desktop
//   chrome. The primitive contracts they prove are host-independent, so they
//   ride the OTHER TapPopover consumer that is still genuinely mobile: the
//   Settings color picker (ColorPickerSwatch), whose picker body mounts
//   through TapPopover below the breakpoint (phase 06 plan 03).
//
//   desktop-1280 (control): the InfoBubble STILL opens on hover — the D-09
//   byte-identical-desktop guarantee, asserted on the real desktop chrome.
//
// Harness honesty — what is staged and why (the 06-01 precedent): the e2e
// webServer is the real bombvault binary over a wiped fresh DB. Everything
// here (settings, SSE) rides the real server untouched — a fresh instance
// ships the default palette, so the general tab's rainbow-palette row and its
// swatches render without any staging. The display-prefs boot fetch is aborted
// so every worker keeps the harness default locale regardless of sibling order
// (bootWithoutServerLook, the 05-06 precedent).
// ---------------------------------------------------------------------------
import { expect, test, type Page } from "@playwright/test";

// The two device projects from playwright.config.ts. Everything else is a
// desktop project.
const MOBILE_PROJECTS = new Set(["mobile-iphone", "mobile-android"]);

async function bootWithoutServerLook(page: Page, path = "/settings"): Promise<void> {
  await page.route("**/api/display-prefs*", (route) => route.abort());
  await page.goto(path);
}

/** The ONE InfoBubble trigger shape on the Settings page: an aria-labelled,
 *  tabbable inline span (buttons/links never match; every InfoBubble call
 *  site renders this shape). `.first()` of the VISIBLE ones — the page has
 *  several, and any one of them proves the contract. */
function infoBubbleTrigger(page: Page) {
  return page.locator('span[aria-label][tabindex="0"]:visible').first();
}

test("an InfoBubble opens on tap and dismisses on an outside tap", async ({ page }, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "mobile-only: tap() needs hasTouch");
  await bootWithoutServerLook(page);

  const trigger = infoBubbleTrigger(page);
  await trigger.scrollIntoViewIfNeeded();
  await trigger.tap();
  await expect(page.getByRole("tooltip")).toHaveCount(1);

  // An outside tap — real coordinates over plain page content, far from the
  // trigger. The bubble itself is pointer-events:none, so the pointerdown
  // lands on the content underneath, which is exactly the "outside" the tap
  // path dismisses on.
  await page.locator("#bv-main").click({ position: { x: 10, y: 10 } });
  await expect(page.getByRole("tooltip")).toHaveCount(0);
});

// The accent card's first preset swatch (general tab): AccentPresetSwatch's
// ColorPickerSwatch trigger, named "Preset" + the 1-based position
// (settings.accentPreset). Below the breakpoint its picker body mounts through
// TapPopover — the same primitive the retired Containers FilterPopover
// exercised, so the two contracts below transfer host 1:1. This row (not the
// rainbow palette's own swatches) is the honest fresh-DB host: the palette
// swatches are `disabled={!rainbow.on}` — dead on a fresh instance, whose
// rainbow rotation is off — while the accent presets are `disabled={rainbowOn}`
// and therefore live exactly when the palette row is not.
const SWATCH_NAME = "Preset 1";

function paletteSwatch(page: Page) {
  return page.getByRole("button", { name: SWATCH_NAME });
}

test("Escape dismisses an open popover and focus returns to the trigger", async ({ page }, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "mobile-only: tap() needs hasTouch");
  await bootWithoutServerLook(page);

  const swatch = paletteSwatch(page);
  await swatch.scrollIntoViewIfNeeded();
  await swatch.tap();
  const dialog = page.getByRole("dialog", { name: SWATCH_NAME });
  await expect(dialog).toBeVisible();

  // Escape — document-level inside the primitive, works wherever focus sits.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  // The D-09 light-focus restore, on the real page: the trigger swatch holds
  // focus again after dismissal (named via aria-label, not text content).
  await expect(page.locator(":focus")).toHaveAttribute("aria-label", SWATCH_NAME);
});

test("the picker panel opens fully inside the viewport and dismisses on an outside tap", async ({ page }, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "mobile-only: tap() needs hasTouch");
  await bootWithoutServerLook(page);

  const swatch = paletteSwatch(page);
  await swatch.scrollIntoViewIfNeeded();
  await swatch.tap();
  const dialog = page.getByRole("dialog", { name: SWATCH_NAME });
  await expect(dialog).toBeVisible();

  // No clipping at the phone's edge — the whole point of anchoring through
  // computeBubblePosition instead of the desktop's in-flow absolute panel
  // (which shoves itself off-screen when the trigger sits near an edge).
  // The panel's own max-height cap keeps it inside vertically too, scrolling
  // internally instead of running off the bottom.
  const box = await dialog.boundingBox();
  const vp = page.viewportSize();
  expect(box, "the panel must be laid out to measure it").not.toBeNull();
  expect(vp, "the emulated viewport must be known").not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vp!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(vp!.height);

  // Outside tap (near the viewport's bottom-left, well clear of the panel)
  // dismisses — and focus lands back on the trigger.
  await page.mouse.click(10, vp!.height - 80);
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(":focus")).toHaveAttribute("aria-label", SWATCH_NAME);
});

test.describe("desktop", () => {
  test("the InfoBubble still opens on hover — the desktop contract is untouched", async ({ page }, testInfo) => {
    test.skip(MOBILE_PROJECTS.has(testInfo.project.name), "desktop-only: the hover contract");
    await bootWithoutServerLook(page);

    const trigger = infoBubbleTrigger(page);
    await trigger.scrollIntoViewIfNeeded();
    await trigger.hover();
    await expect(page.getByRole("tooltip")).toHaveCount(1);
  });
});
