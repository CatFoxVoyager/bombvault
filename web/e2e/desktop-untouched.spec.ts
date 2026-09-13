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
//
// Phase 6 (plan 07, Task 2) added a second, per-page half to this file: the
// three maquette pages (Dashboard, Containers, Files) additionally assert the
// ABSENCE of every phone-only surface that phase put below the breakpoint —
// the StickyActionBar chrome, the stacked container detail's back row, the
// filled full-width Save/New-backup trigger, the Save-bar count statement and
// the coverage-card list language. Same discipline as the 10-route loop:
// fresh-DB empty states, chrome not data (the staged-data desktop guards live
// in maquette-screens.spec.ts scenario 5 / home-trigger.spec.ts scenario 5).
// The /dashboard route (not the / redirect) keeps the loop's canonical form.
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

// ---------------------------------------------------------------------------
// Phase 6 max-md leakage pass — the three maquette pages at >=48rem assert
// that NOTHING the phone phase added exists in the desktop DOM. The battery
// below is asserted on ALL THREE routes: a leak on any page fails by name.
// Role/text-based wherever possible so a restyle of the mobile chrome cannot
// silently outdate the guard; the one class-signature check is the
// StickyActionBar's exact chrome combination, which no desktop element
// carries (verified app-wide when this pass landed — the only
// `sticky bottom-0 z-10 bg-carbon-sidebar` element in src/ is the bar).
// ---------------------------------------------------------------------------
const MAQUETTE_ROUTES = ["/dashboard", "/containers", "/files"];

for (const route of MAQUETTE_ROUTES) {
  test(`desktop untouched of phase 6 mobile chrome at ${route}`, async ({ page }, testInfo) => {
    test.skip(!DESKTOP_PROJECTS.has(testInfo.project.name), "desktop-only: the max-md leakage contract");
    await page.goto(route);

    // The sticky-in-flow action bar (D-03/D-06 chrome — Save bar, Home
    // trigger zone): its exact class signature exists nowhere on desktop.
    await expect(page.locator("div.sticky.bottom-0.z-10.bg-carbon-sidebar")).toHaveCount(0);
    // The filled full-width accent control — the mobile Save / New-backup
    // trigger's signature (Button tone="accent" over the caller's w-full
    // stage); no desktop control carries it.
    await expect(page.locator("button.w-full.bg-accent")).toHaveCount(0);
    // The Home thumb-zone trigger and the tree Save bar's action.
    await expect(page.getByRole("button", { name: "New backup" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save folders" })).toHaveCount(0);
    // The stacked container detail's back row (accessible name
    // "<container>, Back" — maquette-screens.spec.ts scenario 1's locator,
    // generalized past the fixture name).
    await expect(page.getByRole("button", { name: /, Back$/ })).toHaveCount(0);
    // The Save bar's live count statement (folders.handedToRestic).
    await expect(page.getByText(/folders handed to restic/)).toHaveCount(0);
    // The coverage-card list's deselect-floor rule (files.emptyRule).
    await expect(page.getByText(/at least one folder/)).toHaveCount(0);
  });
}

// Positive half for the Dashboard page: the desktop customizable grid is not
// merely free of mobile chrome — it is present. The customize pencil is
// max-md:hidden desktop-only chrome IN SERVICE of that grid (06-06), so it
// being visible proves the desktop page rendered rather than the phone's
// fixed Home block order (where the pencil has nothing to edit and is gated
// away entirely).
test("desktop dashboard keeps the customizable grid chrome", async ({ page }, testInfo) => {
  test.skip(!DESKTOP_PROJECTS.has(testInfo.project.name), "desktop-only: the desktop-invariance contract");
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Customize" })).toBeVisible();
});

// ---------------------------------------------------------------------------
// Phase 7 dual-direction battery (07-08 Task 2) — the six phase routes
// (/vms /flash /config /receiver /fleet /settings) held from BOTH sides of
// the 48rem chrome switch, the maquette template generalized:
//
//   desktop direction — besides the 10-route loop's shell asserts above, the
//   phase-7 mobile surfaces must have ZERO matches in the desktop DOM: the
//   Fab, the ListToolbar sticky bar, the mobile lists' Load-more control and
//   the Settings chip strip. The needles are the app-wide-unique signatures
//   (verified over src/ when this pass landed): `button.h-13` is the Fab
//   alone, `div.sticky.top-0.z-10.bg-carbon-sidebar` is the ListToolbar
//   alone (the StickyActionBar's bottom-0 twin is phase 6's, guarded above),
//   useLoadMore's button exists only in mobile lists, and the
//   settings.tabsNavigation strip ("Settings sections") mounts only in the
//   mobile Settings block. BottomSheet chrome is deliberately NOT needled
//   here: on the fresh-DB routes no sheet is ever open, so a count assert
//   would guard nothing — the Fab/toolbar signatures are the load-bearing
//   leak needles.
//
//   mobile direction — the inverse of the 10-route loop on the same six
//   routes: the desktop Sidebar has ZERO matches and the bottom nav is
//   visible. Positives stay chrome-only (the fresh-DB gates default OFF, so
//   the domain surfaces render their gate-off cards): the always-present
//   bottom nav, plus the Settings chip strip — chrome that renders whether
//   or not any domain is enabled. The staged-data mobile guards live in the
//   destination specs, same split as the phase 6 half above.
// ---------------------------------------------------------------------------
const PHASE7_ROUTES = ["/vms", "/flash", "/config", "/receiver", "/fleet", "/settings"];
const MOBILE_PROJECTS = new Set(["mobile-iphone", "mobile-android"]);

for (const route of PHASE7_ROUTES) {
  test(`desktop untouched of phase 7 mobile chrome at ${route}`, async ({ page }, testInfo) => {
    test.skip(!DESKTOP_PROJECTS.has(testInfo.project.name), "desktop-only: the max-md leakage contract");
    await page.goto(route);

    // The Fab (Discover / Backup now / …): unique h-13 button signature.
    await expect(page.locator("button.h-13")).toHaveCount(0);
    // The mobile list toolbar's sticky filter bar (LISTS-01, 07-06).
    await expect(page.locator("div.sticky.top-0.z-10.bg-carbon-sidebar")).toHaveCount(0);
    // The mobile lists' windowed Load-more control (07-03 useLoadMore).
    await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);
    // The Settings chip strip (MORE-01, 07-04): mobile-only section nav.
    await expect(page.getByRole("navigation", { name: "Settings sections" })).toHaveCount(0);
  });

  test(`mobile presents at ${route}`, async ({ page }, testInfo) => {
    test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "mobile-only: the inverse chrome-switch contract");
    await page.goto(route);

    // Desktop markers absent — the Layout switch never renders them.
    await expect(page.getByTestId("desktop-sidebar")).toHaveCount(0);
    // Mobile chrome present.
    await expect(page.getByTestId("bottom-nav")).toBeVisible();
    if (route === "/settings") {
      // The one data-independent positive beyond the nav: the Settings
      // section chip strip (MORE-01), reachable with every fresh-DB gate off.
      await expect(page.getByRole("navigation", { name: "Settings sections" })).toBeVisible();
    }
  });
}
