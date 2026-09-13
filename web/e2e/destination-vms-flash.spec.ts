// ---------------------------------------------------------------------------
// Destination e2e — the /vms and /flash mobile blocks (07-03, Task 3).
//
// The dom twins prove the D-01 desktop identity in jsdom (VMs.test.tsx /
// Flash.desktop.dom.test.tsx); this spec proves the PHONE presentation on the
// real binary in real device emulation. Six scenarios:
//
//   1. a populated /vms renders the card list with the summary counts line,
//      the ListToolbar search narrows it, and the 20/20 load-more window
//      extends to 40 and honestly disappears when exhausted (LISTS-01),
//   2. the card's trigger deep-links the correlated run into the component-
//      local RunDetailSheet (FLOW-03), and a dismissed sheet is never
//      re-opened by later polls of the same watch (the latch),
//   3. the schedule row opens the fullHeight CadenceBuilder sheet restricted
//      to the exact-cadence modes (#166) and the explicit apply PATCHes the
//      override for the VM's libvirtName,
//   4. a card whose override is active shows the SERVER-derived next-fire
//      chip (FLOW-01); a default-following card shows the domain badge and
//      no chip,
//   5. gate-off (vmsEnabled=false) shows the honest outline card + settings
//      link and NOTHING else — no toolbar, no cards, no Fab,
//   6. /flash: the hero card fields, the snapshot load-more window, and the
//      tonal (never accent) download entries; plus the desktop dual-direction
//      guard on BOTH desktop projects — no mobile chrome anywhere (D-01).
//
// Harness honesty — what is mocked and why (the maquette-screens.spec.ts /
// touch-tree.spec.ts deviation, Rule 3, reused): the e2e webServer is the
// real bombvault binary over a wiped fresh DB, but the harness has no Docker
// and no libvirt, so a fresh DB can never hold a VM and no flash snapshots
// exist. The VM, flash, settings, schedule-next and runs domains are
// therefore fulfilled at the Playwright route layer — the SPA, its fetches,
// the binary and every route shape are real; only the staged payloads are
// fake, mirroring the Go JSON shapes field-for-field (api.ts). The
// display-prefs abort keeps the harness default English labels regardless of
// worker order (the boot-look cut, 05-06).
//
// Locale pinning: `test.use({ locale: "en-US" })` fixes Intl in the browser
// so Node-side expectations can mirror the page's own toLocaleString output
// (same host timezone on both sides) for the hero's last-backup line and the
// schedule chip's next-fire text.
// ---------------------------------------------------------------------------
import { expect, test, type Page } from "@playwright/test";

// The two device projects from playwright.config.ts; everything else is a
// desktop project (desktop-untouched.spec.ts's branching pattern).
const MOBILE_PROJECTS = new Set(["mobile-iphone", "mobile-android"]);
const DESKTOP_PROJECTS = new Set(["desktop-1280", "desktop-768"]);

// All locale-dependent formatting in this spec is pinned to en-US (see the
// header note) so Node-side expectations match the browser byte-for-byte.
test.use({ locale: "en-US" });

// --- staged VM domain (Go JSON shapes, api.ts) ------------------------------

function vmPayload(i: number, overrides: Record<string, unknown> = {}) {
  return {
    name: `vm-${String(i).padStart(2, "0")}`,
    libvirtName: `id-${String(i).padStart(2, "0")}`,
    state: "running",
    method: "graceful",
    includeInSchedule: true,
    lastBackup: null,
    lastBackupStarted: null,
    ...overrides,
  };
}

// GET /api/settings — the settings object mirrors the Settings interface
// field-for-field (the same discipline the desktop dom tests' typed fixtures
// follow); callers override only the fields a scenario needs.
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
      // On: the per-card schedule sheet's apply path is a scenario here (#121).
      perItemSchedules: true,
      ...settingsOverrides,
    },
  };
}

/** Route-level staging of the VM domain. Registered list-first, then the
 *  specific write routes (Playwright consults the LAST matching handler
 *  first). The PATCHes are fulfilled so the harness DB stays untouched by a
 *  spec, exactly like the container staging's PATCHes. */
async function stageVmsDomain(
  page: Page,
  vms: ReturnType<typeof vmPayload>[],
  opts: { settings?: Record<string, unknown>; scheduleNext?: unknown[] } = {},
) {
  await page.route("**/api/display-prefs*", (route) => route.abort());
  await page.route("**/api/vms", (route) => route.fulfill({ json: { ok: true, vms } }));
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: settingsBody(opts.settings) }),
  );
  await page.route("**/api/schedule/next", (route) =>
    route.fulfill({ json: { ok: true, runs: opts.scheduleNext ?? [] } }),
  );
  await page.route(/\/api\/vms\/[^/]+$/, (route) => route.fulfill({ json: { ok: true } }));
  await page.route("**/api/vms/*/backup", (route) =>
    route.fulfill({ json: { ok: true, started: true } }),
  );
}

// --- staged flash domain (Go JSON shapes, api.ts) ---------------------------

function snapshotPayload(i: number, timeIso: string) {
  return {
    id: `snap${String(i).padStart(2, "0")}f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6`,
    time: timeIso,
    paths: ["/boot"],
    tags: ["flash"],
    hostname: "tower",
  };
}

/** 40 snapshots; the NEWEST is index 0, exactly 3 hours old — deep enough that
 *  the hero's relative-age badge ("3 hours ago") stays stable across the
 *  whole test's runtime, never straddling a unit boundary. */
function flashSnapshots(nowMs: number) {
  return Array.from({ length: 40 }, (_, i) =>
    snapshotPayload(i, new Date(nowMs - (180 + i * 60) * 60_000).toISOString()),
  );
}

async function stageFlashDomain(
  page: Page,
  snaps: ReturnType<typeof snapshotPayload>[],
  opts: { settings?: Record<string, unknown> } = {},
) {
  await page.route("**/api/display-prefs*", (route) => route.abort());
  await page.route("**/api/flash/snapshots*", (route) =>
    route.fulfill({ json: { ok: true, snapshots: snaps } }),
  );
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: settingsBody(opts.settings) }),
  );
}

// ---------------------------------------------------------------------------

test("mobile /vms: card list, search filter and the 20/40 load-more window", async ({ page }, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the phone card list is MORE-01a's surface",
  );
  await stageVmsDomain(page, Array.from({ length: 40 }, (_, i) => vmPayload(i)), {
    scheduleNext: [{ job: "vms", domain: "vms", next: "2026-09-14T03:00:00Z" }],
  });
  await page.goto("/vms");

  // The summary counts line: derived from the same list payload the desktop
  // reads (no new endpoint), all 40 live and scheduled.
  await expect(page.getByText("40 VMs · 40 Scheduled")).toBeVisible();
  // The ONE toolbar: lifted search state + chip filters.
  const searchBox = page.getByPlaceholder("Search VMs…").filter({ visible: true });
  await expect(searchBox).toBeVisible();

  // LISTS-01: the 20-row initial window — "Schedule override" is a per-card
  // surface with no desktop twin, so its count IS the card count.
  const scheduleRows = page.getByRole("button", { name: "Schedule override" });
  await expect(scheduleRows).toHaveCount(20);
  await expect(page.getByText("vm-39", { exact: true }).filter({ visible: true })).toHaveCount(0);
  const loadMore = page.getByRole("button", { name: "Load more" });
  await expect(loadMore).toBeVisible();
  await loadMore.tap();
  await expect(scheduleRows).toHaveCount(40);
  await expect(page.getByText("vm-39", { exact: true }).filter({ visible: true })).toBeVisible();
  // Exhausted: hasMore is the ONLY signal the button may gate on — no rows
  // beyond the window, no button.
  await expect(loadMore).toHaveCount(0);

  // Search narrows the same windowed list…
  await searchBox.fill("vm-00");
  await expect(scheduleRows).toHaveCount(1);
  await expect(loadMore).toHaveCount(0);
  // …and clearing it resets the window (useLoadMore's reset-on-identity).
  await searchBox.fill("");
  await expect(scheduleRows).toHaveCount(20);
  await expect(loadMore).toBeVisible();
});

test("mobile /vms: trigger deep-links the correlated run and a dismissed sheet is never re-opened", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the FLOW-03 deep-link + latch is the phone contract",
  );
  await stageVmsDomain(page, [vmPayload(0)]);

  // Flips the staged runs list as the story advances — [] is the pre-fire
  // baseline, running is the correlated watch, done is the terminal record
  // (run-detail-visibility.spec.ts's phase machine).
  const RUN_ID = "5f4e3d2c1b0a99887766554433221100";
  const startedAt = Math.floor(Date.now() / 1000) - 60;
  let runsPhase: "empty" | "running" | "done" = "empty";
  await page.route("**/api/runs", (route) =>
    route.fulfill({
      json: {
        ok: true,
        runs:
          runsPhase === "empty"
            ? []
            : [
                {
                  id: RUN_ID,
                  targetId: "aaaa0000bbbb1111cccc2222dddd3333",
                  kind: "backup",
                  status: runsPhase === "running" ? "running" : "success",
                  startedAt,
                  finishedAt: runsPhase === "done" ? startedAt + 45 : null,
                  snapshotId: runsPhase === "done" ? RUN_ID : "",
                  bytes: runsPhase === "done" ? 5_000_000_000 : 0,
                  error: "",
                  acknowledged: false,
                  // The backend records the run's target as the identifier the
                  // action sent — the RAW libvirt name (VMs.test.tsx's whole
                  // point), never the display name — and matchRun correlates
                  // on exactly that (r.target === libvirtName).
                  target: "id-00",
                  domain: "vm",
                },
              ],
      },
    }),
  );

  await page.goto("/vms");
  const trigger = page.getByRole("button", { name: "Back up now" }).filter({ visible: true });
  await expect(trigger).toBeVisible();

  // fire(): the pre-fire runs baseline lands BEFORE the POST (baseline-id
  // correlation, never a client clock).
  const posted = page.waitForRequest(
    (r) => r.method() === "POST" && /\/api\/vms\/id-00\/backup$/.test(r.url()),
  );
  await trigger.tap();
  await posted;
  runsPhase = "running";

  // The watch's first poll correlates the NEW run id → the component-local
  // RunDetailSheet stacks in over the list (kind + target title grammar —
  // the target text is the run's recorded identifier, the libvirt name).
  const sheet = page.getByRole("dialog", { name: "Backup · id-00" });
  await expect(sheet).toBeVisible();

  // Dismiss. Later polls of the SAME watch still refresh the record — the
  // latch must keep the sheet closed through them. (Scoped to the sheet: the
  // close affordance is the sheet's own, never a page-level query.)
  await sheet.getByRole("button", { name: "Close" }).tap();
  await expect(sheet).toHaveCount(0);
  runsPhase = "done"; // the run finishes behind the closed sheet

  // The terminal poll provably landed (the button's success toast carries the
  // recorded snapshot id's mono slice) — yet the sheet stays closed.
  await expect(page.getByText(`Done · ${RUN_ID.slice(0, 8)}`)).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Backup · id-00" })).toHaveCount(0);
});

test("mobile /vms: the schedule row opens the CadenceBuilder sheet and applies the override", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the per-card schedule sheet is the phone contract",
  );
  await stageVmsDomain(page, [
    vmPayload(0, { name: "vm-override", libvirtName: "id-override" }),
  ]);
  await page.goto("/vms");

  const row = page.getByRole("button", { name: "Schedule override" });
  await expect(row).toBeVisible();

  // fullHeight sheet (D-05/D-06) hosting the SAME CadenceBuilder the desktop
  // override editor renders.
  await row.tap();
  const sheet = page.getByRole("dialog", { name: "Schedule override" });
  await expect(sheet).toBeVisible();
  // EXACT_CADENCE_MODES (#166): the backend refuses everyN on per-item VM
  // overrides, so the builder must not even offer it here.
  await expect(sheet.getByRole("tab", { name: "Off" })).toHaveAttribute("aria-selected", "true");
  await expect(sheet.getByRole("tab", { name: "Daily" })).toBeVisible();
  await expect(sheet.getByRole("tab", { name: "Weekly" })).toBeVisible();
  await expect(sheet.getByRole("tab", { name: "Cron" })).toBeVisible();
  await expect(sheet.getByRole("tab", { name: "Every N days" })).toHaveCount(0);

  await sheet.getByRole("tab", { name: "Daily" }).tap();

  // The sheet owns its explicit apply: the PATCH carries the override keyed by
  // the RAW libvirt name (never the display name), with a non-everyN cadence.
  const patched = page.waitForRequest(
    (r) => r.method() === "PATCH" && /\/api\/vms\/id-override$/.test(r.url()),
  );
  await sheet.getByRole("button", { name: "Done" }).tap();
  const body = (await patched).postDataJSON() as { scheduleCadence?: string };
  expect(typeof body.scheduleCadence).toBe("string");
  expect(body.scheduleCadence).not.toBe("");
  expect(body.scheduleCadence).not.toContain("every");

  await expect(page.getByText("Override saved")).toBeVisible();
  await expect(sheet).toHaveCount(0);
});

test("mobile /vms: the server-derived next-fire chip follows an active override", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the per-card schedule preview chip is the phone contract",
  );
  await stageVmsDomain(
    page,
    [
      vmPayload(0, { name: "vm-chip", libvirtName: "id-chip", scheduleCadence: "daily 03:00" }),
      vmPayload(1, { name: "vm-plain", libvirtName: "id-plain" }),
    ],
    { scheduleNext: [{ job: "vms", domain: "vms", next: "2026-09-14T03:00:00Z" }] },
  );
  await page.goto("/vms");

  await expect(page.getByRole("button", { name: "Schedule override" })).toHaveCount(2);

  // FLOW-01: the accent-soft preview chip renders ONLY on the active
  // override's row, and its text is the SERVER's next fire (domain-granular
  // ScheduleNext), formatted — never client cadence math. Node mirrors the
  // browser's toLocaleString byte-for-byte (en-US + same host timezone).
  const chip = page
    .locator("span.rounded-pill.bg-accentSoft.text-accentText")
    .filter({ visible: true });
  await expect(chip).toHaveCount(1);
  await expect(chip).toHaveText(new Date("2026-09-14T03:00:00Z").toLocaleString("en-US"));

  // The default-following card says so and shows no chip.
  await expect(page.getByText("Uses the domain schedule")).toBeVisible();
});

test("mobile /vms: gate-off shows the honest outline card and nothing else", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the destinations-gate mobile face",
  );
  await stageVmsDomain(page, [vmPayload(0)], { settings: { vmsEnabled: false } });
  await page.goto("/vms");

  // A gated surface shows nothing else: no toolbar, no cards, no Fab, no
  // trigger rows — the VMs domain's own hint + the settings row that turns
  // it back on.
  await expect(
    page.getByText("Back up and restore virtual machines over SSH via libvirt."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Schedule override" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Back up now" }).filter({ visible: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Discover backups" }).filter({ visible: true })).toHaveCount(
    0,
  );
  await expect(page.getByText("1 VMs · 1 Scheduled")).toHaveCount(0);

  // The gate card's one action: the settings row that turns VMs on. Scoped to
  // the main scroller — the mobile bottom-nav's own Settings tab would
  // otherwise make this a strict-mode collision, and the gate card's row is
  // the surface under test, not the app chrome.
  const settingsLink = page
    .locator("#bv-main")
    .getByRole("link", { name: "Settings" })
    .filter({ visible: true });
  await expect(settingsLink).toBeVisible();
  await settingsLink.tap();
  await expect(page).toHaveURL(/\/settings$/);
});

test("mobile /flash: hero card, snapshot pagination, tonal download entries", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the flash hero + snapshot block is the phone contract",
  );
  const snaps = flashSnapshots(Date.now());
  await stageFlashDomain(page, snaps);
  await page.goto("/flash");

  // Hero card fields: title, the last-backup line (formatTs of the NEWEST
  // snapshot — a max over parsed times, never an order assumption), and the
  // relative-age status badge.
  await expect(page.getByText("Back up the flash").filter({ visible: true })).toBeVisible();
  await expect(
    page.getByText(`Last backup: ${new Date(snaps[0].time).toLocaleString("en-US")}`),
  ).toBeVisible();
  await expect(page.getByText("3 hours ago")).toBeVisible();

  // The page's ONE accent reservation is the flash backup — the hero trigger
  // and the Fab are the SAME action (the Fab fires the shared watcher through
  // fireRef), so both carry the label on material.
  await expect(
    page.getByRole("button", { name: "Back up flash now" }).filter({ visible: true }),
  ).toHaveCount(2);

  // Snapshot rows: the 20-row window → Load more → 40, exhausted.
  const downloads = page.getByRole("button", { name: "Download (.zip)" }).filter({ visible: true });
  await expect(downloads).toHaveCount(20);
  const loadMore = page.getByRole("button", { name: "Load more" });
  await expect(loadMore).toBeVisible();
  await loadMore.tap();
  await expect(downloads).toHaveCount(40);
  await expect(loadMore).toHaveCount(0);

  // Restore/download entries are NEVER accent — the hero trigger owns this
  // surface's one reservation. Tonal = the surface2 token; the accent class
  // must not appear on the entry.
  const first = downloads.first();
  const cls = (await first.getAttribute("class")) ?? "";
  expect(cls).toContain("bg-carbon-surface2");
  expect(cls).not.toContain("bg-accent");

  // The zip-export entry row is the block's mobile-only tonal chrome (its
  // toggle sheet rides the same settings write chain the desktop card uses).
  await expect(
    page.getByRole("button", { name: "Flash zip export" }).filter({ visible: true }),
  ).toBeVisible();
});

test("desktop dual-direction: no mobile chrome on /vms or /flash on either desktop project", async ({
  page,
}, testInfo) => {
  test.skip(
    !DESKTOP_PROJECTS.has(testInfo.project.name),
    "desktop-only: the D-01 >=48rem dual-direction guard (desktop-768 boundary + desktop-1280)",
  );
  const snaps = flashSnapshots(Date.now());

  // /vms: today's desktop page, with the list NOT windowed — all 40 rows
  // render, which is the counter-proof of the mobile block's 20-row window.
  await stageVmsDomain(page, Array.from({ length: 40 }, (_, i) => vmPayload(i)));
  await page.goto("/vms");
  await expect(page.getByTestId("desktop-sidebar")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Virtual Machines" })).toBeVisible();
  await expect(page.getByText("vm-00", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText("vm-39", { exact: true }).filter({ visible: true })).toBeVisible();
  // NOTHING the mobile block adds exists in the desktop DOM: no per-card
  // schedule rows, no window chrome, no summary line, no Fab.
  await expect(page.getByRole("button", { name: "Schedule override" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);
  await expect(page.getByText("40 VMs · 40 Scheduled")).toHaveCount(0);
  await expect(page.locator("button.h-13.bg-accent")).toHaveCount(0);

  // /flash: same guard — the desktop cards, an unwrapped 40-row list, and no
  // mobile hero block, entry rows, window chrome or Fab.
  await stageFlashDomain(page, snaps);
  await page.goto("/flash");
  await expect(page.getByTestId("desktop-sidebar")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Flash Backup" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Virtual Machines" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download (.zip)" })).toHaveCount(40);
  await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Flash zip export" })).toHaveCount(0);
  await expect(page.locator("button.h-13.bg-accent")).toHaveCount(0);
});
