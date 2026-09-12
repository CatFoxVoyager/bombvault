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
//     3. the FilterPopover's panel opens fully INSIDE the viewport — the
//        computeBubblePosition clamp against the 360/390px screen edge, the
//        exact clipping this primitive exists to fix — and dismisses on an
//        outside tap with focus restored.
//
//   desktop-1280 (control): the InfoBubble STILL opens on hover — the D-09
//   byte-identical-desktop guarantee, asserted on the real desktop chrome.
//
// Harness honesty — what is staged and why (the 06-01 precedent): the e2e
// webServer is the real bombvault binary over a wiped fresh DB, which can
// never contain a container (no Docker in the harness), and the Containers
// toolbar only renders its FilterPopover once `containers.length > 0`. The
// container LIST is therefore fulfilled at the Playwright route layer, mirroring
// the Go JSON shape field-for-field; everything else (settings, SSE) rides the
// real server untouched. The display-prefs boot fetch is aborted so every
// worker keeps the harness default locale regardless of sibling order
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

// One running container is enough: the toolbar row (search + FilterPopover)
// renders only when the list is non-empty, and the list is all this spec
// needs — no mounts/browse staging, this spec never opens the folders editor.
const CONTAINERS_BODY = {
  ok: true,
  containers: [
    {
      name: "plex",
      image: "lscr.io/linuxserver/plex:latest",
      state: "running",
      status: "Up 2 hours",
      ip: "172.18.0.5",
      installed: true,
      includeInSchedule: true,
      lastBackup: null,
      lastBackupStarted: null,
      preHook: "",
      postHook: "",
      stopContainers: [],
      excludes: [],
      lastUpdateCheck: 0,
      lastUpdateResult: "",
      stack: "",
    },
  ],
};

async function bootContainersWithStagedList(page: Page): Promise<void> {
  await page.route("**/api/display-prefs*", (route) => route.abort());
  await page.route("**/api/containers", (route) => route.fulfill({ json: CONTAINERS_BODY }));
  await page.goto("/containers");
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

test("Escape dismisses an open popover and focus returns to the trigger", async ({ page }, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "mobile-only: tap() needs hasTouch");
  await bootContainersWithStagedList(page);

  const filter = page.getByRole("button", { name: "Filter" });
  await filter.tap();
  const dialog = page.getByRole("dialog", { name: "Filter" });
  await expect(dialog).toBeVisible();

  // Escape — document-level inside the primitive, works wherever focus sits.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  // The D-09 light-focus restore, on the real page: the trigger (the button
  // labelled "Filters") holds focus again after dismissal.
  await expect(page.locator(":focus")).toHaveText("Filters");
});

test("the filter panel opens fully inside the viewport and dismisses on an outside tap", async ({ page }, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "mobile-only: tap() needs hasTouch");
  await bootContainersWithStagedList(page);

  await page.getByRole("button", { name: "Filter" }).tap();
  const dialog = page.getByRole("dialog", { name: "Filter" });
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
  await expect(page.locator(":focus")).toHaveText("Filters");
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
