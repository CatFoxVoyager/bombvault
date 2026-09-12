// ---------------------------------------------------------------------------
// Mobile shell e2e — the real-binary contract for the mobile chrome
// (VERIFY-01, phase 05 plan 05, Tasks 1-2).
//
// Task 1 proved the chrome SWITCH (bar on mobile / Sidebar on desktop, each
// exactly once and never both). Task 2 expands to the SHEET contract: the
// More trigger opens the SHELL-03 sheet, its rows are the fresh-DB registry,
// it closes through all three BottomSheet paths (Escape, scrim, close
// button), the Tab trap holds focus inside the dialog, and the bar stays
// bottom-docked in landscape. The sign-out parity test runs on ALL four
// projects: the fresh harness DB has auth disabled, so the row must be
// absent from the More sheet AND from the desktop Sidebar footer on the
// same environment (T-05-02: one authEnabled gate, both surfaces — the
// enabled-side behavior is proven by the MoreSheet dom test mocks; real-auth
// flows are Phase 8 VERIFY-02/04 scope).
//
// Branching on the Playwright project name (rather than a viewport probe in
// the test) keeps every assertion honest about WHICH contract each project
// verifies.
//
// Plan 06 Task 1 tightens the Task-1 smoke into the SHELL-02 exactness
// contract: the bar renders EXACTLY the registry slots — the enabled bar
// destinations plus the More trigger, nothing else (bar-exactness test below).
// ---------------------------------------------------------------------------
import { expect, test } from "@playwright/test";

// The two device projects from playwright.config.ts. Everything else is a
// desktop project.
const MOBILE_PROJECTS = new Set(["mobile-iphone", "mobile-android"]);

test("chrome switches with the viewport: bar on mobile, Sidebar on desktop", async ({ page }, testInfo) => {
  await page.goto("/dashboard");
  if (MOBILE_PROJECTS.has(testInfo.project.name)) {
    // Mobile: the bottom bar is present exactly once, the desktop Sidebar is
    // not in the DOM at all, and main is the scroller.
    await expect(page.getByTestId("bottom-nav")).toBeVisible();
    await expect(page.getByTestId("bottom-nav")).toHaveCount(1);
    await expect(page.getByTestId("desktop-sidebar")).toHaveCount(0);
    await expect(page.locator("#bv-main")).toHaveCount(1);
  } else {
    // Desktop: today's shell, untouched — Sidebar visible, zero bars.
    await expect(page.getByTestId("desktop-sidebar")).toBeVisible();
    await expect(page.getByTestId("bottom-nav")).toHaveCount(0);
  }
});

test("the bar renders EXACTLY the registry slots: enabled destinations + More, nothing else", async ({ page }, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "mobile-only: bar exactness is the SHELL-02 mobile contract");
  await page.goto("/dashboard");
  const bar = page.getByTestId("bottom-nav");
  // The slot row is the bar's only inline child (the More sheet is a portal
  // to document.body, never a slot); its direct children ARE the slots.
  const slots = bar.locator("div.flex.h-14 > *");
  // Fresh-DB gating is the environment under test: every domain gate off —
  // files_enabled defaults false (internal/store/settings_test.go pins it) —
  // so the registry yields Dashboard, Containers, Settings as bar
  // destinations, plus the always-contentful More trigger = 4 slots.
  // ("Exactly 5" holds only once files is enabled; the substance of the
  // SHELL-02 contract is the EXACTNESS — the bar renders the enabled
  // destinations + More and never a hand-added or leaked slot, per the ONE
  // nav registry's gate semantics documented in 05-05-SUMMARY.)
  await expect(slots).toHaveCount(4);
  await expect(bar.getByRole("link", { name: "Dashboard" })).toHaveCount(1);
  await expect(bar.getByRole("link", { name: "Containers" })).toHaveCount(1);
  await expect(bar.getByRole("link", { name: "Settings" })).toHaveCount(1);
  await expect(bar.getByRole("button", { name: "More" })).toHaveCount(1);
  // And nothing else: zero destination links beyond the three named above —
  // no gated destination (files among them) leaks into the bar while its
  // desktop Sidebar gate is off.
  await expect(bar.getByRole("link")).toHaveCount(3);
});

test("the More sheet opens with the fresh-DB registry and closes via all three paths", async ({ page }, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "mobile-only: the More trigger exists below the breakpoint");
  await page.goto("/dashboard");

  const bar = page.getByTestId("bottom-nav");
  const moreTrigger = bar.getByRole("button", { name: "More" });
  const sheet = page.getByTestId("more-sheet");

  // Open: the trigger is the bar's More slot; the sheet is the PRIM-01
  // BottomSheet carrying the SHELL-03 content root.
  await moreTrigger.click();
  await expect(sheet).toBeVisible();

  // Fresh-DB rows: every gate off, Recovery always-on, so the sheet holds
  // EXACTLY one destination link — and none of the bar destinations leak
  // into it (the duplicate-destination drift SHELL-03 forbids).
  await expect(sheet.getByRole("link", { name: "Recovery" })).toBeVisible();
  expect(await sheet.getByRole("link").count()).toBe(1);
  await expect(sheet.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
  await expect(sheet.getByRole("link", { name: "Settings" })).toHaveCount(0);

  // Close path 1 of 3: Escape (document-level, works wherever focus sits).
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);

  // Close path 2 of 3: a click on the scrim itself. The panel is
  // bottom-anchored, so the viewport's top-left corner is always scrim.
  await moreTrigger.click();
  await expect(sheet).toBeVisible();
  await page.locator(".glim-modal-backdrop").click({ position: { x: 10, y: 10 } });
  await expect(sheet).toHaveCount(0);

  // Close path 3 of 3: the header close button (distinct accessible name,
  // ConfirmDialog strict-mode discipline). Scoped to the dialog: pages may
  // carry their own "Close" controls (the dashboard's dismiss chip does).
  await moreTrigger.click();
  await expect(sheet).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await expect(sheet).toHaveCount(0);

  // Focus trap engagement: the primitive auto-focuses its close button on
  // open; Tab-walking the panel must never move focus outside the dialog,
  // no matter how many times it wraps.
  await moreTrigger.click();
  await expect(sheet).toBeVisible();
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  const focusInsideDialog = await page.evaluate(() => {
    const active = document.activeElement;
    return active instanceof Element && active.closest('[role="dialog"]') !== null;
  });
  expect(focusInsideDialog).toBe(true);
});

test("sign-out parity: the fresh DB shows the row on NEITHER chrome surface", async ({ page }, testInfo) => {
  await page.goto("/dashboard");
  if (MOBILE_PROJECTS.has(testInfo.project.name)) {
    // Mobile: open the sheet — with auth disabled the sign-out row must not
    // exist inside it (the emptiness-adjacent half of the same gate).
    await page.getByTestId("bottom-nav").getByRole("button", { name: "More" }).click();
    await expect(page.getByTestId("more-sheet")).toBeVisible();
  }
  // Both surfaces: zero "Sign out" controls anywhere in the page — the
  // desktop footer's gate and the sheet's gate resolve identically on this
  // environment (authEnabled=false).
  await expect(page.getByRole("button", { name: /sign out/i })).toHaveCount(0);
});

test("the bar stays bottom-docked in landscape", async ({ page }, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "mobile-only: landscape contract of the bottom bar");
  // A rotated phone BELOW the 48rem chrome breakpoint: orientation flipped,
  // still compact width, so the bottom bar is the mounted chrome and must
  // sit at the bottom. (At or above 48rem the ONE switch mounts the desktop
  // rail by the width-only query — a landscape phone at 844px CSS width is
  // "desktop" to it. The plan's 844x390 example therefore cannot show the
  // bar; documented in 05-05-SUMMARY as a deviation, with the breakpoint
  // semantics flagged for a product decision.)
  await page.setViewportSize({ width: 740, height: 360 });
  await page.goto("/dashboard");
  const box = await page.getByTestId("bottom-nav").boundingBox();
  expect(box).not.toBeNull();
  // Normal-flow sibling (never fixed): the browser reserves the bar's row at
  // the END of the flex column, so its bottom edge is the viewport's bottom
  // edge in this orientation too — no side rail, no floating bar. Allow a
  // 2px tolerance for subpixel rounding.
  expect(box!.y + box!.height).toBeGreaterThanOrEqual(358);
  expect(box!.y + box!.height).toBeLessThanOrEqual(360);
});

test("tapping the already-active bar slot scrolls the scroller back to the top", async ({ page }, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "mobile-only: tap-on-active contract of the bottom bar");
  await page.goto("/dashboard");
  // Make the scroller deterministically scrollable: the dashboard's content
  // height varies, the mechanism under test does not. Shrink the scroller,
  // push it down, tap the ACTIVE slot (we are on /dashboard), and the
  // Layout-owned scroll-to-top must fire instead of a re-navigation.
  await page.locator("#bv-main").evaluate((el) => {
    (el as HTMLElement).style.height = "200px";
    el.scrollTop = 300;
  });
  await expect
    .poll(() => page.locator("#bv-main").evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  await page.getByTestId("bottom-nav").getByRole("link", { name: "Dashboard" }).click();
  await expect
    .poll(() => page.locator("#bv-main").evaluate((el) => el.scrollTop))
    .toBe(0);
});
