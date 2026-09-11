// ---------------------------------------------------------------------------
// Mobile shell smoke — the first end-to-end assertions for the mobile chrome
// (VERIFY-01, phase 05 plan 05 Task 1, the phase's tracer slice).
//
// One test, branched on the Playwright project, asserting exactly the
// chrome-switch contract Layout owns: at phone width the bottom bar renders
// (exactly once) and the desktop Sidebar is NOT in the DOM at all — absent,
// never CSS-hidden, so its subscriptions and dialogs never run below the
// breakpoint — while at desktop width today's shell renders untouched and
// the bar appears zero times. `#bv-main` is present in both branches: it is
// the stable scroll target every chrome surface addresses.
//
// This spec is the mobile-chrome SMOKE. It is expanded later in plan 05-05
// (Task 2) with the sheet behaviors — open/close via all three paths, focus
// trap, sign-out gate parity — and the landscape bottom-dock assertion.
// ---------------------------------------------------------------------------
import { expect, test } from "@playwright/test";

// The two device projects from playwright.config.ts. Everything else is a
// desktop project; branching on the name (rather than a viewport probe in the
// test) keeps the assertion honest about WHICH contract each project verifies.
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
