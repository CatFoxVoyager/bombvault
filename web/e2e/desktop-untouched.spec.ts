// ---------------------------------------------------------------------------
// Desktop-untouched — VERIFY-01 success criterion 4, per-page desktop
// invariance (phase 05 plan 06, Task 1).
//
// The phase's headline guarantee, made executable: for EVERY one of the ten
// routed destinations, on BOTH desktop projects (desktop-768 = the 48rem
// breakpoint boundary, desktop-1280 = comfortable desktop), today's shell is
// exactly what renders — the desktop Sidebar is visible, the mobile bottom
// bar has ZERO matches in the DOM (not CSS-hidden: the Layout chrome switch
// never renders it), and the `bv-main` scroller is present.
//
// Parameterized as a 10-route loop rather than spot checks: a future route
// added to the frozen router without joining this loop is a visible gap in
// the report, and any desktop-layout regression on any single destination
// fails the gate by name.
//
// The assertions deliberately run on the fresh-DB empty states the harness
// boots (playwright.config.ts): this is a chrome/layout contract, never a
// data contract. Gated destinations (/vms, /flash, ...) render their pages'
// empty states — the route tree is not gated, only the nav entries are, so
// every destination is directly reachable by goto (the Go SPA fallback,
// internal/api/spa.go, serves index.html for client routes).
// ---------------------------------------------------------------------------
import { expect, test } from "@playwright/test";

// The two desktop projects from playwright.config.ts (>= the 48rem chrome
// switch). Branching on the project name — the mobile-shell.spec.ts pattern —
// keeps every assertion honest about WHICH contract each project verifies.
const DESKTOP_PROJECTS = new Set(["desktop-1280", "desktop-768"]);

// The ten canonical route paths, verbatim from the frozen route table
// (web/src/app/router.tsx). The redirect routes (/, /jobs) and the unlisted
// /glyphs contact sheet are not destinations and are deliberately absent.
const ROUTES = [
  "/dashboard",
  "/recovery",
  "/containers",
  "/vms",
  "/flash",
  "/files",
  "/config",
  "/receiver",
  "/fleet",
  "/settings",
];

for (const route of ROUTES) {
  test(`desktop untouched at ${route}`, async ({ page }, testInfo) => {
    test.skip(!DESKTOP_PROJECTS.has(testInfo.project.name), "desktop-only: the desktop-invariance contract");
    await page.goto(route);
    await expect(page.getByTestId("desktop-sidebar")).toBeVisible();
    await expect(page.getByTestId("bottom-nav")).toHaveCount(0);
    await expect(page.locator("#bv-main")).toHaveCount(1);
  });
}
