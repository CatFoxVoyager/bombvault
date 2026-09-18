// ---------------------------------------------------------------------------
// Desktop-untouched — the per-page desktop invariance contract.
//
// The headline guarantee, made executable: for EVERY one of the ten routed
// destinations, on BOTH desktop projects (desktop-768 = the 48rem breakpoint
// boundary, desktop-1280 = comfortable desktop), today's shell is exactly
// what renders — the desktop Sidebar is visible, the mobile bottom bar has
// ZERO matches in the DOM (not CSS-hidden: the Layout chrome switch never
// renders it), and the `bv-main` scroller is present.
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
// The second, per-page half: each page that has been given a phone face
// (/dashboard in the shell PR, /containers in the containers PR, /vms in this
// one) additionally asserts the ABSENCE of every phone-only surface its PR
// put below the breakpoint — the StickyActionBar chrome and the filled
// full-width primary triggers. Same discipline as the 10-route loop:
// fresh-DB empty states, chrome not data. The page routes (not the /
// redirect) keep the loop's canonical form.
//
// SCOPE NOTE: on the fork branch this file also carries per-page leakage
// batteries for the Files, Settings-family and Recovery mobile surfaces
// (their Fab/ListToolbar/Load-more/chip-strip/wizard needles and the
// inverse mobile-direction halves). Those pages' mobile treatments are not
// part of this PR, so their asserts travel with those pages' PRs —
// asserting against surfaces that do not exist in this tree would guard
// nothing on the desktop side and fail outright on the mobile side. The
// Containers battery landed with the Containers PR (below); the VMs battery
// lands with this one.
// ---------------------------------------------------------------------------
import { expect, test, type Page } from "@playwright/test";

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
// The geometry half of "untouched": presence is not invariance. The shell's
// desktop chrome must not only EXIST on every destination, it must sit at
// the SAME geometry — a regression that nudges the sidebar or the scroller
// (a new margin, a width stage, a mobile rule leaking past the breakpoint)
// changes the numbers while everything still renders and the presence checks
// above keep passing. Boxes are captured on /dashboard; every other route
// must reproduce them within a 1px tolerance (subpixel rounding across
// engines). jsdom computes no layout, so this guard only runs where layout
// is real.
// ---------------------------------------------------------------------------
const GEOMETRY_TOLERANCE_PX = 1;

/** The shell's two structural boxes — the sidebar rail and the `bv-main`
 *  scroller — as x/width only: y/height legitimately vary per page content,
 *  horizontal geometry may not. */
async function shellGeometry(page: Page) {
  return page.evaluate(() => {
    const box = (el: Element | null) => {
      if (!el) throw new Error("shell element missing");
      const r = el.getBoundingClientRect();
      return { x: r.x, width: r.width };
    };
    return {
      sidebar: box(document.querySelector('[data-testid="desktop-sidebar"]')),
      main: box(document.querySelector("#bv-main")),
    };
  });
}

test("desktop shell geometry is identical across every routed destination", async ({ page }, testInfo) => {
  test.skip(
    !DESKTOP_PROJECTS.has(testInfo.project.name),
    "desktop-only: the geometry half of the desktop-invariance contract"
  );
  await page.goto("/dashboard");
  // The SPA mounts after the document loads, and evaluate() does not
  // auto-wait — anchor both elements first, exactly like the presence
  // checks above, or the measure races the mount and finds nothing.
  await expect(page.getByTestId("desktop-sidebar")).toBeVisible();
  await expect(page.locator("#bv-main")).toBeVisible();
  const baseline = await shellGeometry(page);
  for (const route of ROUTES) {
    await page.goto(route);
    await expect(page.getByTestId("desktop-sidebar")).toBeVisible();
    await expect(page.locator("#bv-main")).toBeVisible();
    const boxes = await shellGeometry(page);
    for (const key of ["sidebar", "main"] as const) {
      expect(
        Math.abs(boxes[key].x - baseline[key].x),
        `${route}: the ${key} rail's x drifted from the /dashboard baseline`
      ).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);
      expect(
        Math.abs(boxes[key].width - baseline[key].width),
        `${route}: the ${key} rail's width drifted from the /dashboard baseline`
      ).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);
    }
  }
});

// ---------------------------------------------------------------------------
// The >=48rem leakage pass for /dashboard: the one page this PR gives a
// phone face asserts that NOTHING its phone half adds exists in the desktop
// DOM. Role/text-based wherever possible so a restyle of the mobile chrome
// cannot silently outdate the guard; the one class-signature check is the
// StickyActionBar's exact chrome combination, which no desktop element
// carries (verified app-wide when this pass landed — the only
// `sticky bottom-0 z-10 bg-carbon-sidebar` element in src/ is the bar).
// ---------------------------------------------------------------------------
const DASHBOARD_ROUTES = ["/dashboard"];

for (const route of DASHBOARD_ROUTES) {
  test(`desktop untouched of the Dashboard phone chrome at ${route}`, async ({ page }, testInfo) => {
    test.skip(!DESKTOP_PROJECTS.has(testInfo.project.name), "desktop-only: the >=48rem leakage contract");
    await page.goto(route);

    // The sticky-in-flow action bar (the thumb-zone trigger's host): its
    // exact class signature exists nowhere on desktop.
    await expect(page.locator("div.sticky.bottom-0.z-10.bg-carbon-sidebar")).toHaveCount(0);
    // The filled full-width accent control — the Backup Everything trigger's
    // signature (Button tone="accent" over the caller's w-full stage); no
    // desktop control carries it.
    await expect(page.locator("button.w-full.bg-accent")).toHaveCount(0);
    // The Home thumb-zone trigger.
    await expect(page.getByRole("button", { name: "Backup Everything" })).toHaveCount(0);
  });
}

// ---------------------------------------------------------------------------
// The >=48rem leakage pass for /containers: the page the containers PR gave
// a phone face (the card list, the stacked detail, the Save bar). Same
// discipline as the Dashboard pass above.
//
// The files.emptyRule needle from the same upstream battery deliberately
// does NOT travel with this file: its subject matter is the Files page's
// mobile treatment, which lands with the Files PR.
// ---------------------------------------------------------------------------
const CONTAINER_ROUTES = ["/containers"];

for (const route of CONTAINER_ROUTES) {
  test(`desktop untouched of the Containers phone chrome at ${route}`, async ({ page }, testInfo) => {
    test.skip(!DESKTOP_PROJECTS.has(testInfo.project.name), "desktop-only: the >=48rem leakage contract");
    await page.goto(route);

    // The sticky-in-flow Save bar (the stacked detail's footer): its exact
    // class signature exists nowhere on desktop.
    await expect(page.locator("div.sticky.bottom-0.z-10.bg-carbon-sidebar")).toHaveCount(0);
    // The filled full-width accent control — the mobile Save / New-backup
    // trigger's signature (Button tone="accent" over the caller's w-full
    // stage); no desktop control carries it.
    await expect(page.locator("button.w-full.bg-accent")).toHaveCount(0);
    // The Home thumb-zone trigger and the tree Save bar's action.
    await expect(page.getByRole("button", { name: "New backup" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save folders" })).toHaveCount(0);
    // The stacked container detail's back row (accessible name
    // "<container>, Back" — touch-tree.spec.ts's entry locator, generalized
    // past the fixture name).
    await expect(page.getByRole("button", { name: /, Back$/ })).toHaveCount(0);
    // The Save bar's live count statement (folders.handedToRestic).
    await expect(page.getByText(/folders handed to restic/)).toHaveCount(0);
  });
}

// ---------------------------------------------------------------------------
// The >=48rem leakage pass for /vms: the page this PR gives a phone face
// (the card list, the per-card schedule sheets, the Fab). Same discipline as
// the Dashboard and Containers passes above. The needles are the phone
// face's exact class signatures, each verified to exist ONLY on the mobile
// side when this pass landed: `button.h-13` is the Fab's 52px stage (the
// only h-13 button in src/), `div.sticky.top-0.z-10.bg-carbon-sidebar` is
// the ListToolbar's sticky search strip (no desktop element carries it —
// the Desktop pass's own 10-route loop proves the sidebar twin separately),
// and the two role/name queries are the mobile-only surfaces proper (the
// per-card schedule rows, the load-more window chrome).
// ---------------------------------------------------------------------------
const VM_ROUTES = ["/vms"];

for (const route of VM_ROUTES) {
  test(`desktop untouched of the VMs phone chrome at ${route}`, async ({ page }, testInfo) => {
    test.skip(!DESKTOP_PROJECTS.has(testInfo.project.name), "desktop-only: the >=48rem leakage contract");
    await page.goto(route);

    // The Fab — the phone face's 52px filled primary trigger.
    await expect(page.locator("button.h-13")).toHaveCount(0);
    // The ListToolbar's sticky search strip.
    await expect(page.locator("div.sticky.top-0.z-10.bg-carbon-sidebar")).toHaveCount(0);
    // The mobile-only surfaces proper: the load-more window chrome and the
    // per-card schedule rows.
    await expect(page.getByText("Load more")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Schedule override" })).toHaveCount(0);
  });
}

// Positive half for the Dashboard page: the desktop customizable grid is not
// merely free of mobile chrome — it is present. The customize pencil is
// desktop-only chrome IN SERVICE of that grid (it mounts only at md+), so it
// being visible proves the desktop page rendered rather than the phone's
// fixed Home block order (where the pencil has nothing to edit and is gated
// away entirely).
test("desktop dashboard keeps the customizable grid chrome", async ({ page }, testInfo) => {
  test.skip(!DESKTOP_PROJECTS.has(testInfo.project.name), "desktop-only: the desktop-invariance contract");
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Customize" })).toBeVisible();
});
