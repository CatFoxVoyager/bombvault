// ---------------------------------------------------------------------------
// List ergonomics e2e — LISTS-01 retrofits onto the EXISTING long lists
// (07-06; the VMs block's twin assertions live in destination-vms-flash.spec.ts
// scenario 1). Fifteen scenarios over all three retrofitted surfaces — the
// Containers mobile card list (the plan's tracer, Task 1), the Files sets
// list (Task 2, which additionally carries the 06-UI-REVIEW editor-header
// wrap fix under German labels), and the Dashboard activity log (Task 3,
// the foundation's first LIVE feed):
//
//   a. the ListToolbar search drives the page's ONE shared filter state —
//      narrowing, the honest no-match card when nothing survives, and the
//      window RESET when the search clears (useLoadMore's reset-on-identity),
//   b. the constant 20-row window → Load more → 40 → the button honestly
//      disappears when hasMore goes false,
//   c. NO auto-load: scrolling to the very bottom never appends rows — the
//      button is the only way the window grows (lib/useLoadMore.ts's ban on
//      observers/scroll listeners, proven from the outside here),
//   d. the toolbar is sticky-IN-FLOW (computed position "sticky", never
//      "fixed" — the StickyActionBar discipline) and its chips switch the
//      rendered section,
//   e. every rendered card clears the 44px touch floor (bounding-box proof,
//      not a class-name assertion).
//
// Harness honesty — the maquette-screens.spec.ts / touch-tree.spec.ts /
// destination-vms-flash.spec.ts deviation (Rule 3), reused: the e2e webServer
// is the real bombvault binary over a wiped fresh DB, but the harness has no
// Docker, so a fresh DB can never hold a container (and never holds file
// sets or backup history either). The container, file-set, dashboard and
// settings domains are fulfilled at the Playwright route layer — the SPA,
// its fetches, the binary and every route shape are real; only the staged
// payloads are fake, mirroring the Go JSON shapes field-for-field (api.ts).
// The display-prefs abort keeps the harness default English labels regardless
// of worker order (the boot-look cut, 05-06) — the ONE deliberate exception
// is the German describe below, whose carried-fix regression only bites on
// the de strings (mutation-checked).
//
// Mobile projects only: LISTS-01's desktop invariant ("byte-identical above
// 48rem") is proven in jsdom by the desktop dom suites, which see the SAME
// markup the ≥48rem browser renders (max-md hidden, not JSX-gated); the
// ActivityLog retrofit additionally carries its own desktop-1280/768
// dual-direction guard below (the mobile block is JSX-gated, so a desktop
// project must assert its ABSENCE from outside).
// ---------------------------------------------------------------------------
import { expect, test, type Page } from "@playwright/test";

// The two device projects from playwright.config.ts; everything else is a
// desktop project (desktop-untouched.spec.ts's branching pattern).
const MOBILE_PROJECTS = new Set(["mobile-iphone", "mobile-android"]);

// All locale-dependent expectations in this spec are pinned to en-US (see the
// header note) so Node-side strings match the page byte-for-byte.
test.use({ locale: "en-US" });

// --- staged container domain (Go JSON shapes, api.ts) ------------------------

function containerPayload(i: number, overrides: Record<string, unknown> = {}) {
  const name = `svc-${String(i).padStart(2, "0")}`;
  return {
    name,
    image: `local/${name}:latest`,
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
    ...overrides,
  };
}

function containerList(count: number, overrides: (i: number) => Record<string, unknown> = () => ({})) {
  return Array.from({ length: count }, (_, i) => containerPayload(i, overrides(i)));
}

// GET /api/settings — mirrors the Settings interface field-for-field (the same
// discipline destination-vms-flash.spec.ts follows); callers override only the
// fields a scenario needs.
function settingsBody(settingsOverrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    hostMountRoot: "/mnt/user",
    platform: "generic",
    settings: {
      encryptionEnabled: false,
      containersEnabled: true,
      vmsEnabled: true,
      flashEnabled: true,
      configEnabled: true,
      filesEnabled: true,
      receiverEnabled: false,
      fleetEnabled: false,
      containersPath: "/mnt/user/backups/containers",
      vmsPath: "/mnt/user/backups/vms",
      flashPath: "/mnt/user/backups/flash",
      configPath: "/mnt/user/backups/config",
      filesPath: "/mnt/user/backups/files",
      restoreFolder: "/mnt/user/backups/restore",
      flashZipExportEnabled: false,
      flashZipExportPath: "",
      flashZipExportKeep: 0,
      exportEncryptEnabled: false,
      exportAgeRecipients: "",
      containersOffsite: "",
      vmsOffsite: "",
      flashOffsite: "",
      configOffsite: "",
      filesOffsite: "",
      containersOffsiteSchedule: "off",
      vmsOffsiteSchedule: "off",
      flashOffsiteSchedule: "off",
      configOffsiteSchedule: "off",
      filesOffsiteSchedule: "off",
      containersSchedule: "off",
      vmsSchedule: "off",
      flashSchedule: "off",
      configSchedule: "off",
      filesSchedule: "off",
      everythingSchedule: "off",
      everythingPreHook: "",
      everythingPostHook: "",
      everythingPreHookSet: false,
      everythingPostHookSet: false,
      defaultLanguage: "en",
      retentionKeepLast: 7,
      retentionKeepDaily: 7,
      retentionKeepWeekly: 4,
      retentionKeepMonthly: 6,
      offsiteRetentionKeepLast: 7,
      offsiteRetentionKeepDaily: 7,
      offsiteRetentionKeepWeekly: 4,
      offsiteRetentionKeepMonthly: 6,
      offsiteLimitUpload: 0,
      backupCores: 0,
      offsiteLimitDownload: 0,
      metricsEnabled: false,
      metricsToken: "",
      metricsTokenSet: false,
      widgetToken: "",
      widgetTokenSet: false,
      drillsEnabled: true,
      offsiteDrillsEnabled: true,
      drillsSchedule: "weekly Sun 04:30",
      drillsSubsetPct: 10,
      recoveryKitAck: true,
      containersOffsiteImmutable: false,
      vmsOffsiteImmutable: false,
      flashOffsiteImmutable: false,
      configOffsiteImmutable: false,
      filesOffsiteImmutable: false,
      offsiteGrowthBudgetGB: 0,
      tamperTestSchedule: "weekly Sun 05:30",
      drDrillTarget: "",
      drDrillTargetVm: "",
      instanceName: "e2e-harness",
      fleetToken: "",
      fleetTokenSet: false,
      pruneImageAfterUpdate: false,
      resticCacheMaxMB: 4096,
      digestEnabled: false,
      digestSchedule: "weekly Mon 08:00",
      catchUpMissed: true,
      watchdogEnabled: true,
      registryAuths: [],
      restartHealthWait: true,
      restartHealthTimeoutSec: 120,
      reconcileUnraidUpdateStatus: true,
      perItemSchedules: true,
      ...settingsOverrides,
    },
  };
}

/** Route-level staging of the container domain (the staging honesty rules of
 *  maquette-screens.spec.ts). Every rendered card fetches its mounts meta
 *  (MobileContainerCard's ticked-count line), so the mounts route is a
 *  wildcard fulfilled with an EMPTY mount set — "0 paths", honest, and no
 *  per-fixture route spam. The PATCH drain is fulfilled so the wiped harness
 *  DB never sees a spec-driven write. */
async function stageContainersDomain(
  page: Page,
  containers: ReturnType<typeof containerPayload>[],
) {
  await page.route("**/api/display-prefs*", (route) => route.abort());
  await page.route("**/api/containers", (route) => route.fulfill({ json: { ok: true, containers } }));
  await page.route("**/api/settings", (route) => route.fulfill({ json: settingsBody() }));
  await page.route("**/api/schedule/next", (route) => route.fulfill({ json: { ok: true, runs: [] } }));
  await page.route("**/api/containers/*/mounts*", (route) =>
    route.fulfill({
      json: {
        ok: true,
        mounts: [],
        custom: [],
        excluded: [],
        excludeCaches: {},
        hostMountRoot: "/mnt/user",
        hostSourceRoot: "/mnt",
      },
    }),
  );
  await page.route(/\/api\/containers\/[^/]+$/, (route) => route.fulfill({ json: { ok: true } }));
}

// --- locators ----------------------------------------------------------------

// BOTH search inputs (desktop FilterPopover + mobile ListToolbar) share the
// containers.searchPlaceholder key — the shared state IS the point — so the
// visible-only filter is what selects the phone's toolbar input.
function toolbarSearch(page: Page) {
  return page.getByPlaceholder("Search containers…").filter({ visible: true });
}

/** The ListToolbar root: the input's SECOND div ancestor (input → the toolbar's
 *  inner flex column → the sticky chrome div). Structural, not class-based —
 *  the position assertion below is exactly the thing a class lookup would
 *  prejudge. */
function toolbarRoot(page: Page) {
  return toolbarSearch(page).locator("xpath=ancestor::div[2]");
}

// Every rendered card is a button whose accessible name starts with the
// container name (MobileContainerCard); the fillers are named svc-NN.
function cards(page: Page) {
  return page.getByRole("button", { name: /^svc-/ });
}

async function scrollMainToBottom(page: Page) {
  await page.locator("#bv-main").evaluate((el) => el.scrollTo(0, el.scrollHeight));
}

// --- the five scenarios ------------------------------------------------------

test("toolbar search filters the shared state, shows the no-match card, and resets the window", async ({
  page,
}, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "LISTS-01 mobile presentation only");
  await stageContainersDomain(page, containerList(40));
  await page.goto("/containers");

  const search = toolbarSearch(page);
  await expect(search).toBeVisible();

  // "svc-1" matches svc-10..svc-19 → 10 rows, and the window offers nothing
  // more (a 10-of-40 result is under the constant 20 threshold).
  await search.fill("svc-1");
  await expect(cards(page)).toHaveCount(10);
  await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);

  // Zero matches: the honest no-match card — the SAME filter.noMatch copy the
  // desktop hint renders — never a blank column, and the toolbar stays
  // reachable so the filter is clearable. The visible-only filter is what
  // picks the mobile card over the (display:none-below-md) desktop hint with
  // the same copy.
  await search.fill("zzz-nothing");
  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByText("No items match the current filters.").filter({ visible: true })).toBeVisible();
  await expect(search).toBeVisible();

  // Clearing resets the window to the constant 20 (useLoadMore's identity
  // reset) and the Load more affordance returns.
  await search.fill("");
  await expect(cards(page)).toHaveCount(20);
  await expect(page.getByRole("button", { name: "Load more" })).toBeVisible();
});

test("load-more window: 20 rows, Load more extends to 40, then the button is honestly gone", async ({
  page,
}, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "LISTS-01 mobile presentation only");
  await stageContainersDomain(page, containerList(40));
  await page.goto("/containers");

  // The summary line survives the retrofit (same derived copy as before).
  await expect(page.getByText("40 Containers · 40 Scheduled")).toBeVisible();

  // Initial constant window: 20 of 40; the tail is NOT in the DOM.
  await expect(cards(page)).toHaveCount(20);
  await expect(page.getByText("svc-39", { exact: true }).filter({ visible: true })).toHaveCount(0);

  const loadMore = page.getByRole("button", { name: "Load more" });
  await expect(loadMore).toBeVisible();
  await loadMore.tap();

  await expect(cards(page)).toHaveCount(40);
  await expect(page.getByText("svc-39", { exact: true }).filter({ visible: true })).toBeVisible();
  // Exhausted: hasMore is the ONLY signal the button may gate on — no rows
  // beyond the window, no button.
  await expect(loadMore).toHaveCount(0);
});

test("no auto-load: scrolling to the bottom never grows the window", async ({ page }, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "LISTS-01 mobile presentation only");
  await stageContainersDomain(page, containerList(40));
  await page.goto("/containers");
  await expect(cards(page)).toHaveCount(20);

  // Bottom of the scroller, three times, with settle time — the pattern an
  // IntersectionObserver-driven list would have answered with rows 21+.
  for (let i = 0; i < 3; i++) {
    await scrollMainToBottom(page);
    await page.waitForTimeout(300);
  }

  // Still 20, and the button is still the ONLY way forward.
  await expect(cards(page)).toHaveCount(20);
  await expect(page.getByRole("button", { name: "Load more" })).toBeVisible();
});

test("toolbar is sticky-in-flow (never fixed) and its chips switch the rendered section", async ({
  page,
}, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "LISTS-01 mobile presentation only");
  // Mixed staging: three installed + four orphans, so the installed/not-
  // installed chips have two real sections to switch between.
  const mixed = [
    containerPayload(0, { name: "plex" }),
    containerPayload(1, { name: "jellyfin" }),
    containerPayload(2, { name: "sonarr" }),
    ...containerList(4, (i) => ({ name: `ghost-${i}`, installed: false, state: "missing" })),
  ];
  await stageContainersDomain(page, mixed);
  await page.goto("/containers");

  // Sticky-IN-FLOW: the computed position is "sticky" — never "fixed", which
  // would fight the visualViewport keyboard mechanism (the StickyActionBar
  // discipline ListToolbar documents).
  const toolbar = toolbarRoot(page);
  await expect(toolbar).toHaveCSS("position", "sticky");

  // Fresh context → the persisted installed-toggle defaults to "all": seven
  // cards across both sections. The mixed fixtures carry SPEAKING names
  // (plex/jellyfin/sonarr/ghost-N), so the count locator spans all four.
  const allCards = page.getByRole("button", { name: /^(plex|jellyfin|sonarr|ghost-\d+)/ });
  await expect(allCards).toHaveCount(7);
  await expect(page.getByRole("button", { name: /^ghost-/ })).toHaveCount(4);

  // Chip tap switches the section — same state, two presentations (the chips
  // are the page's OWN FilterControl, not a parallel mobile copy).
  await toolbar.getByRole("tab", { name: "Not installed" }).tap();
  await expect(page.getByRole("button", { name: /^ghost-/ })).toHaveCount(4);
  await expect(page.getByRole("button", { name: /^plex/ })).toHaveCount(0);
  // The section heading via its Badge text: the h2 itself is the zero-geometry
  // positioning box of the overlapping Badge-heading pattern (phase-6 SCRN-02
  // markup), which Playwright computes as hidden even though the Badge shows.
  // Desktop's same-name heading is display:none here — visible-only picks the
  // phone's.
  await expect(page.getByText("Not installed (backups only)").filter({ visible: true })).toBeVisible();

  await toolbar.getByRole("tab", { name: "Installed", exact: true }).tap();
  await expect(page.getByRole("button", { name: /^ghost-/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^plex/ })).toHaveCount(1);

  // Scoped to the installed-toggle's own tablist — the Schedule/Backup chip
  // groups each carry their own "All" tab with the same role.
  await toolbar
    .getByRole("tablist", { name: "Filter" })
    .getByRole("tab", { name: "All", exact: true })
    .tap();
  await expect(allCards).toHaveCount(7);
});

test("every rendered card clears the 44px touch floor", async ({ page }, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "LISTS-01 mobile presentation only");
  await stageContainersDomain(page, containerList(40));
  await page.goto("/containers");

  const loadMore = page.getByRole("button", { name: "Load more" });
  await loadMore.tap();
  await expect(cards(page)).toHaveCount(40);

  // Bounding-box proof over the whole window (min-h-[2.75rem] is the class,
  // 44 real pixels is the contract).
  const minHeight = await cards(page).evaluateAll((els) =>
    Math.min(...els.map((el) => el.getBoundingClientRect().height)),
  );
  expect(minHeight).toBeGreaterThanOrEqual(44);
});

test("toolbar chips and reorder arrows clear the 44px touch floor", async ({ page }, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "LISTS-01 mobile presentation only");
  // THREE orderable containers, no more: the panel lists every orderable
  // container (the explicitly ordered ones first, the rest appended
  // alphabetically — BackupOrderPanel's hydration effect), so the staged
  // list size IS the arrow count. The chips need no cards at all.
  await stageContainersDomain(page, containerList(3));
  // Registered AFTER the domain staging on purpose: Playwright lets the LAST
  // matching route win, and `/api/containers/backup-order` also matches the
  // `/api/containers/{name}$` catch-all above — the panel needs the order
  // payload, not the generic ok envelope. Shape mirrors getBackupOrder's
  // ContainerOrder[] (api.ts) and the Go handler field-for-field (the
  // header's staging rule): {container, order} pairs, not bare names.
  await page.route("**/api/containers/backup-order", (route) =>
    route.fulfill({
      json: {
        ok: true,
        order: [
          { container: "svc-00", order: 0 },
          { container: "svc-01", order: 1 },
          { container: "svc-02", order: 2 },
        ],
      },
    }),
  );
  // The reorder card lives inside <Advanced> (default OFF, persisted in
  // localStorage — lib/advanced.tsx), so the harness visitor opts in before
  // boot; the display-prefs abort the sibling tests rely on stays untouched.
  await page.addInitScript(() => localStorage.setItem("bombvault.advanced", "1"));
  await page.goto("/containers");

  // Chips: the tap area is the ::after bleed pseudo, NOT the host box — a
  // bounding-box read like the card test's above would measure the 24px host
  // and miss the whole point, which is why this reads the pseudo's USED
  // height per element instead (a bleed that regresses to nothing reads 0px
  // here, not 24px).
  const tabs = toolbarRoot(page).getByRole("tab");
  await expect(
    tabs,
    "the mobile toolbar's four chip groups (filter/schedule/backup/sort, 3 segments each) must render for this floor proof",
  ).toHaveCount(12);
  const minChipBleed = await tabs.evaluateAll((els) =>
    Math.min(...els.map((el) => parseFloat(getComputedStyle(el, "::after").height))),
  );
  expect(minChipBleed).toBeGreaterThanOrEqual(44);

  // Reorder arrows: 20px hosts, so 12px of bleed on both vertical sides is
  // exactly the 44px floor — no headroom, which is the point. Three rows
  // staged, so the counts are asserted before the min (an empty evaluateAll
  // would take Math.min of nothing and pass vacuously).
  const arrowBleeds = async (name: string) => {
    const btns = page.getByRole("button", { name });
    await expect(btns, `three "${name}" rows must render`).toHaveCount(3);
    return btns.evaluateAll((els) =>
      els.map((el) => parseFloat(getComputedStyle(el, "::after").height)),
    );
  };
  const ups = await arrowBleeds("Move up");
  const downs = await arrowBleeds("Move down");
  expect(Math.min(...ups, ...downs)).toBeGreaterThanOrEqual(44);
});

// --- the Files sets list (Task 2) --------------------------------------------
//
// The sets list has NO desktop search state to bind (the page's `filter` is
// the restore browser's), so its toolbar owns the ONE new mobile-bound search
// state, keyed with the pre-seeded shared common.search placeholder ("Search").

// --- staged file-set domain (Go JSON shapes, api.ts; the maquette-screens
// staging discipline) ---------------------------------------------------------

function fileSetPayload(i: number, overrides: Record<string, unknown> = {}) {
  const name = `set-${String(i).padStart(2, "0")}`;
  return {
    // 32-char hex-style id, unique per fixture (the expanded row and the Save
    // bar key off it).
    id: String(i).padStart(2, "0").repeat(16),
    name,
    path: `data/${name}`,
    excludes: [],
    enabled: true,
    lastBackup: 0,
    pathExists: true,
    selectedPaths: [`data/${name}`],
    ...overrides,
  };
}

function fileSetList(count: number) {
  return Array.from({ length: count }, (_, i) => fileSetPayload(i));
}

/** Route-level staging of the file-set domain (maquette-screens.spec.ts's
 *  stageFilesDomain, parameterized over the fixture list and extended with the
 *  snapshots route the expanded row's restore disclosure reads). */
async function stageFilesDomain(page: Page, sets: ReturnType<typeof fileSetPayload>[]) {
  await page.route("**/api/display-prefs*", (route) => route.abort());
  await page.route("**/api/settings", (route) => route.fulfill({ json: settingsBody() }));
  await page.route("**/api/files/sets/preset*", (route) =>
    route.fulfill({ json: { ok: true, offered: false, name: "", path: "", excludes: [] } }),
  );
  await page.route("**/api/snapshots*", (route) => route.fulfill({ json: { ok: true, snapshots: [] } }));
  await page.route("**/api/files", (route) => route.fulfill({ json: { ok: true, fileSets: sets } }));
  await page.route(/\/api\/files\/sets\/[^/]+$/, (route) => route.fulfill({ json: { ok: true } }));
}

function setCards(page: Page) {
  return page.getByRole("button", { name: /^set-/ });
}

test("sets search filters the list, zero-match shows the empty card, clearing resets the window", async ({
  page,
}, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "LISTS-01 mobile presentation only");
  await stageFilesDomain(page, fileSetList(40));
  await page.goto("/files");

  const search = page.getByPlaceholder("Search").filter({ visible: true });
  await expect(search).toBeVisible();
  await expect(setCards(page)).toHaveCount(20);

  // "set-1" matches set-10..set-19 → 10 rows, under the constant threshold →
  // no Load more.
  await search.fill("set-1");
  await expect(setCards(page)).toHaveCount(10);
  await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);

  // Zero-match: the explicit empty card, never a blank column; the toolbar
  // stays reachable.
  await search.fill("zzz-nothing");
  await expect(setCards(page)).toHaveCount(0);
  await expect(page.getByText("No items match the current filters.").filter({ visible: true })).toBeVisible();
  await expect(search).toBeVisible();

  // Clearing resets the window to the constant 20 and restores the affordance.
  await search.fill("");
  await expect(setCards(page)).toHaveCount(20);
  await expect(page.getByRole("button", { name: "Load more" })).toBeVisible();
});

test("sets load-more window: 20 rows, one extension to 40, then the button is gone", async ({
  page,
}, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "LISTS-01 mobile presentation only");
  await stageFilesDomain(page, fileSetList(40));
  await page.goto("/files");

  await expect(setCards(page)).toHaveCount(20);
  await expect(page.getByText("set-39", { exact: true }).filter({ visible: true })).toHaveCount(0);

  const loadMore = page.getByRole("button", { name: "Load more" });
  await expect(loadMore).toBeVisible();
  await loadMore.tap();

  await expect(setCards(page)).toHaveCount(40);
  await expect(page.getByText("set-39", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(loadMore).toHaveCount(0);
});

test("sets list never auto-loads on scroll", async ({ page }, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "LISTS-01 mobile presentation only");
  await stageFilesDomain(page, fileSetList(40));
  await page.goto("/files");
  await expect(setCards(page)).toHaveCount(20);

  for (let i = 0; i < 3; i++) {
    await scrollMainToBottom(page);
    await page.waitForTimeout(300);
  }

  await expect(setCards(page)).toHaveCount(20);
  await expect(page.getByRole("button", { name: "Load more" })).toBeVisible();
});

// The carried 06-UI-REVIEW regression runs under GERMAN labels — the narrow-
// viewport sweep's longest strings ("Im Zeitplan einschließen") are the case
// that actually overflows at 360px; the English labels fit even unfixed, so
// only the de run bites on a regression (mutation-checked: reverting the fix
// fails this test, restoring it passes).
test.describe("with German labels", () => {
  test.use({ locale: "de-DE" });

  test("the expanded set's editor header wraps at 360px with no clipped control (carried 06-UI-REVIEW fix)", async ({
    page,
  }, testInfo) => {
    test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "LISTS-01 mobile presentation only");
    await stageFilesDomain(page, [fileSetPayload(0)]);
    await page.goto("/files");

    // Expand the set — the tap IS the disclosure (SCRN-04) — which renders the
    // FULL FileSetRow below the card, header row included. jdp's 2026-09-11
    // rename put the bare house verb (common.edit) on the tile and demoted
    // "Ordner-Set bearbeiten" to the dialog heading and tooltip, so the probe
    // follows the tile's accessible name.
    await setCards(page).first().tap();
    const edit = page.getByRole("button", { name: "Bearbeiten" }).filter({ visible: true });
    await expect(edit).toBeVisible();

    // The carried-fix regression assertion: every header-row control sits fully
    // inside the 360px viewport — nothing clips past the right edge. exact:
    // names — "Jetzt sichern" is a SUBSTRING of the bulk bar's "Alle jetzt
    // sichern" further up the page, and a substring match binds the assertion
    // to the wrong control (found on mobile-iphone, where that misplaced probe
    // masked a real page-pan bug — the header action row's shrink-0 overflow —
    // fixed in Files.tsx alongside this spec).
    const viewportWidth = page.viewportSize()?.width ?? 360;
    // Same rename as above: the tiles carry the bare verbs now (common.edit /
    // common.delete); "Jetzt sichern" keeps its exact-match guard against the
    // bulk bar's "Alle jetzt sichern".
    const controlNames = ["Bearbeiten", "Löschen", "Jetzt sichern"];
    for (const name of controlNames) {
      const box = await page
        .getByRole("button", { name, exact: true })
        .filter({ visible: true })
        .first()
        .boundingBox();
      expect(box, `${name} should have a bounding box`).not.toBeNull();
      expect(box!.x, `${name} left edge`).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, `${name} right edge`).toBeLessThanOrEqual(viewportWidth);
    }
    // The schedule toggle gets the same proof (the shared Toggle's control
    // exposes role="switch" with the row's label as its accessible name).
    const toggleBox = await page
      .getByRole("switch", { name: "Im Zeitplan einschließen" })
      .filter({ visible: true })
      .first()
      .boundingBox();
    expect(toggleBox).not.toBeNull();
    expect(toggleBox!.x).toBeGreaterThanOrEqual(0);
    expect(toggleBox!.x + toggleBox!.width).toBeLessThanOrEqual(viewportWidth);
  });
});

// -----------------------------------------------------------------------------
// Dashboard activity log (07-06 Task 3) — the LISTS-01 retrofit reaching the
// log via the Dashboard mobile block. The log is the foundation's first LIVE
// consumer: its merged list re-merges on a 10s runs poll, SSE pushes and the
// idle-countdown tick, which is exactly the refresh pattern the
// preserveKey extension of useLoadMore exists for — the load-more scenario
// below pages the window and then HOLDS it across at least one poll boundary.
// -----------------------------------------------------------------------------

const NOW = () => Math.floor(Date.now() / 1000);

/** A full DomainStatus record (home-trigger.spec.ts's shape) — the Dashboard
 *  repo-health card renders from it; the log scenarios only need the page to
 *  mount cleanly. */
function domainStatus(overrides: Record<string, unknown>) {
  return {
    domain: "containers",
    enabled: true,
    schedule: "every day",
    coveredBy: "",
    lastSuccess: NOW() - 3600,
    periodSeconds: 86400,
    status: "ok",
    lastVerified: 0,
    lastVerifiedOK: false,
    verifiedDetail: "",
    drillDetail: "",
    offsiteConfigured: false,
    offsiteImmutable: false,
    lastTamperAt: 0,
    lastTamperOK: false,
    lastReplicationAt: 0,
    lastReplicationOK: false,
    lastDrDrillAt: 0,
    lastDrDrillOK: false,
    lastOffsiteSubsetAt: 0,
    lastOffsiteSubsetOK: false,
    offsiteDrillScheduled: false,
    protection: "green",
    tamperState: "",
    replicationState: "",
    drillState: "",
    encryptionOn: true,
    pruneStrategySet: true,
    ...overrides,
  };
}

function stagedDomains() {
  return [
    domainStatus({}),
    domainStatus({ domain: "files", schedule: "every 3 days", periodSeconds: 3 * 86400 }),
    domainStatus({ domain: "vms", enabled: false, schedule: "", status: "off", protection: "" }),
    domainStatus({ domain: "flash", enabled: false, schedule: "", status: "off", protection: "" }),
  ];
}

async function yOf(locator: ReturnType<Page["locator"]>): Promise<number> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!.y;
}

/** A finished backup run (api.ts:341, field-for-field) — one merged log line
 *  per run via lib/activityLog.ts's buildLogLines. Distinct ids: the merge
 *  dedupes on id, and the load-more math assumes one line per run. */
function logRun(i: number) {
  const startedAt = NOW() - (i + 1) * 3600;
  return {
    id: String(i).padStart(2, "0").padEnd(32, "a"),
    targetId: String(i).padStart(2, "0").padEnd(32, "b"),
    kind: "backup",
    status: "success",
    startedAt,
    finishedAt: startedAt + 60,
    snapshotId: "f".repeat(32),
    bytes: 1_000_000,
    error: "",
    acknowledged: false,
    target: `svc-${String(i).padStart(2, "0")}`,
    domain: "container",
  };
}

/** Route-level staging of the Dashboard read models (home-trigger.spec.ts's
 *  stageHome, minus the write path): status/schedule/runs/stats. The
 *  schedule/next list is deliberately EMPTY — buildIdleLine then emits no
 *  idle line over a non-empty history, so N staged runs are exactly N lines
 *  and the load-more math stays clean. */
async function stageDashboard(page: Page, runs: ReturnType<typeof logRun>[]) {
  await page.route("**/api/display-prefs*", (route) => route.abort());
  await page.route("**/api/status", (route) => route.fulfill({ json: { ok: true, domains: stagedDomains() } }));
  await page.route("**/api/schedule/next", (route) => route.fulfill({ json: { ok: true, runs: [] } }));
  await page.route("**/api/runs", (route) => route.fulfill({ json: { ok: true, runs } }));
  await page.route("**/api/stats*", (route) =>
    route.fulfill({
      json: {
        ok: true,
        latest: { domain: "containers", source: "local", at: NOW(), rawSize: 1_050_000_000_000, restoreSize: 260_000_000_000, snapshots: 3 },
      },
    })
  );
}

/** The log's card, VISIBLE only: on a phone TWO instances exist in the DOM —
 *  the desktop grid's (max-md:hidden) and the mobile block's — so the hidden
 *  twin must never satisfy a locator. */
function logCard(page: Page) {
  return page.locator("div.glim-notch-card").filter({ hasText: "Activity Log" }).filter({ visible: true });
}

/** The mobile presentation's flat rows: the divide-y list's direct children. */
function logRows(page: Page) {
  return logCard(page).locator("div.divide-y > div");
}

test("the activity log reaches mobile below repo health, with the sticky toolbar and flat rows", async ({
  page,
}, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "LISTS-01 mobile presentation only");
  await stageDashboard(page, [logRun(0), logRun(1), logRun(2)]);
  await page.goto("/");

  const card = logCard(page);
  await expect(card).toBeVisible();

  // Contracted order: below the repo-health (Storage) block.
  const storageY = await yOf(page.getByRole("heading", { name: "Storage", exact: true }));
  const logY = (await card.boundingBox())!.y;
  expect(logY).toBeGreaterThan(storageY);

  // The sticky-in-flow toolbar with the log's own placeholder; the day chip
  // and the two filter comboboxes re-present the desktop bar's exact shared
  // filter state. GlimStone rule 18 (noNativeSelect) replaced the bar's two
  // native <select>s with SelectField, whose trigger is a role="combobox"
  // button — the assertion follows the control, not the tag it used to wear.
  const search = card.getByPlaceholder("Filter… (e.g. plex, failed, off-site)").filter({ visible: true });
  await expect(search).toBeVisible();
  await expect(card.getByRole("combobox")).toHaveCount(2);

  // Flat rows for the three staged runs — and the desktop scrollbox is NOT
  // the mobile presentation (it stays mounted for the D-01 gate, but hidden).
  await expect(logRows(page)).toHaveCount(3);
  await expect(card.locator("div.max-h-96").filter({ visible: true })).toHaveCount(0);
});

test("log toolbar filters narrow the merged list; zero match shows the honest empty card", async ({
  page,
}, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "LISTS-01 mobile presentation only");
  await stageDashboard(page, [
    { ...logRun(0), domain: "container", target: "svc-00" },
    { ...logRun(1), domain: "files", target: "svc-01" },
    { ...logRun(2), domain: "vm", target: "svc-02" },
  ]);
  await page.goto("/");
  await expect(logRows(page)).toHaveCount(3);

  // The domain filter is the desktop bar's control re-presented — same
  // options, same shared state. SelectField opens a portal listbox on tap,
  // so picking is trigger tap then option tap; the listbox renders outside
  // the card, so the option resolves from the page, not the card.
  const domainTrigger = logCard(page).getByRole("combobox").first();
  await domainTrigger.tap();
  await page.getByRole("option", { name: "Folders" }).tap();
  await expect(logRows(page)).toHaveCount(1);

  // Text search on top of the domain filter; zero match renders the EXISTING
  // filter.noMatch copy as a card, never a blank card.
  const search = logCard(page).getByPlaceholder("Filter… (e.g. plex, failed, off-site)").filter({ visible: true });
  await search.fill("zzz-no-match");
  await expect(logCard(page).getByText("No items match the current filters.").filter({ visible: true })).toBeVisible();
  await expect(logRows(page)).toHaveCount(0);

  // Clearing the search (domain filter still on) restores the window.
  await search.fill("");
  await expect(logRows(page)).toHaveCount(1);
});

test("log load-more window: 40 lines, one extension to 40, then the button is gone — and the page HOLDS across a poll", async ({
  page,
}, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "LISTS-01 mobile presentation only");
  await stageDashboard(page, Array.from({ length: 40 }, (_, i) => logRun(i)));
  await page.goto("/");
  await expect(logRows(page)).toHaveCount(20);

  const loadMore = logCard(page).getByRole("button", { name: "Load more" });
  await expect(loadMore).toBeVisible();
  await loadMore.tap();
  await expect(logRows(page)).toHaveCount(40);
  await expect(loadMore).toHaveCount(0);

  // The live-feed half of the contract: the 10s runs poll re-merges the list
  // (a NEW array identity every time). The reader's paged window must HOLD
  // across at least one poll boundary — useLoadMore's preserveKey, not a
  // reset-to-20 that would yank rows out from under the reader.
  await page.waitForTimeout(10_500);
  await expect(logRows(page)).toHaveCount(40);
});

test("every log row clears the 44px touch floor", async ({ page }, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "LISTS-01 mobile presentation only");
  await stageDashboard(page, Array.from({ length: 22 }, (_, i) => logRun(i)));
  await page.goto("/");
  await expect(logRows(page)).toHaveCount(20);

  const heights = await logRows(page).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  expect(heights.length).toBeGreaterThan(0);
  for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
});

test("desktop keeps the scrollbox log — no mobile rows, no sticky toolbar", async ({ page }, testInfo) => {
  test.skip(MOBILE_PROJECTS.has(testInfo.project.name), "desktop-only byte-identity guard");
  await stageDashboard(page, [logRun(0), logRun(1), logRun(2)]);
  await page.goto("/");

  // Exactly ONE log card on desktop (the mobile block is JSX-gated away).
  const card = page.locator("div.glim-notch-card").filter({ hasText: "Activity Log" });
  await expect(card).toHaveCount(1);

  // The unchanged desktop presentation: the scrollbox, NO divide-y rows, NO
  // sticky toolbar, NO load-more.
  await expect(card.locator("div.max-h-96").filter({ visible: true })).toBeVisible();
  await expect(card.locator("div.divide-y")).toHaveCount(0);
  await expect(card.locator(".sticky")).toHaveCount(0);
  await expect(card.getByRole("button", { name: "Load more" })).toHaveCount(0);
});
