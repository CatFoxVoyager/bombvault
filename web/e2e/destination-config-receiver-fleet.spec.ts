// ---------------------------------------------------------------------------
// Destination e2e — the /config, /receiver and /fleet mobile blocks (07-04).
//
// The dom twins prove the D-01 desktop identity in jsdom (Config.autosave.dom
// .test.tsx, Fleet.peerCard.dom.test.tsx); this spec proves the PHONE
// presentation on the real binary in real device emulation, plus (Task 3)
// the desktop dual-direction guard on all three routes. Scenarios:
//
//   Config (Task 1):
//     1. the status card fields (status Badge, last-run line, trigger, toggle,
//        schedule entry + SERVER-derived next-fire chip),
//     2. the restore sheet renders the numbered guard chain BEFORE the
//        outcome-naming confirm, in DOM order (D-03/T-07-12), and the confirm
//        fires the same restoreConfig call the desktop trigger fires,
//     3. the configEnabled toggle round-trips with the PUT body carrying ONLY
//        the changed field merged onto the re-fetched baseline (T-07-13),
//     4. the schedule sheet applies configSchedule through the same chain and
//        the preview chip refreshes from the server payload (D-06),
//     5. gate-off (configEnabled=false) shows the honest outline card + settings
//        link and NOTHING else.
//
// Harness honesty — what is mocked and why (the destination-vms-flash.spec.ts
// deviation, Rule 3, reused): the e2e webServer is the real bombvault binary
// over a wiped fresh DB, but the harness can never hold a received repo, a
// fleet peer, or a config self-backup snapshot. The config, receiver, fleet,
// settings and schedule-next domains are therefore fulfilled at the Playwright
// route layer — the SPA, its fetches, the binary and every route shape are
// real; only the staged payloads are fake, mirroring the Go JSON shapes
// field-for-field (api.ts). The display-prefs abort keeps the harness default
// English labels regardless of worker order (the boot-look cut, 05-06).
//
// Locale pinning: `test.use({ locale: "en-US" })` fixes Intl in the browser
// so Node-side expectations can mirror the page's own toLocaleString output
// (same host timezone on both sides) for the last-run line and the schedule
// chip's next-fire text.
// ---------------------------------------------------------------------------
import { expect, test, type Page } from "@playwright/test";

// The two device projects from playwright.config.ts; everything else is a
// desktop project (destination-vms-flash.spec.ts's branching pattern).
const MOBILE_PROJECTS = new Set(["mobile-iphone", "mobile-android"]);
const DESKTOP_PROJECTS = new Set(["desktop-1280", "desktop-768"]);

// All locale-dependent formatting in this spec is pinned to en-US (see the
// header note) so Node-side expectations match the browser byte-for-byte.
test.use({ locale: "en-US" });

// --- staged domains (Go JSON shapes, api.ts) --------------------------------

// GET /api/settings — the settings object mirrors the Settings interface
// field-for-field (the same discipline destination-vms-flash.spec.ts follows);
// callers override only the fields a scenario needs.
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
      receiverEnabled: true,
      fleetEnabled: true,
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

function configSnapshot(i: number, timeIso: string) {
  return {
    id: `cfg${String(i).padStart(2, "0")}f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6`,
    time: timeIso,
    paths: ["/config"],
    tags: ["config"],
    hostname: "tower",
  };
}

/** The newest snapshot is exactly 30 minutes old — deep enough that its
 *  relative-age badge ("30 minutes ago") stays stable across the whole
 *  scenario's runtime, never straddling a unit boundary. */
function configSnapshots(nowMs: number) {
  return [
    configSnapshot(0, new Date(nowMs - 30 * 60_000).toISOString()),
    configSnapshot(1, new Date(nowMs - 26 * 60_000).toISOString()),
  ];
}

/** Route-level staging of the config domain. Registered list-first, then the
 *  specific write routes (Playwright consults the LAST matching handler
 *  first). The write routes are fulfilled so the harness DB stays untouched
 *  by a spec, exactly like the container/VM staging's write routes. */
async function stageConfigDomain(
  page: Page,
  opts: {
    settings?: Record<string, unknown>;
    snapshots?: ReturnType<typeof configSnapshot>[];
    scheduleNext?: unknown[];
  } = {},
) {
  await page.route("**/api/display-prefs*", (route) => route.abort());
  await page.route("**/api/config/snapshots*", (route) =>
    route.fulfill({ json: { ok: true, snapshots: opts.snapshots ?? [] } }),
  );
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: settingsBody(opts.settings) }),
  );
  await page.route("**/api/schedule/next", (route) =>
    route.fulfill({
      json: {
        ok: true,
        runs: opts.scheduleNext ?? [{ job: "config", domain: "config", next: "2026-09-14T03:00:00Z" }],
      },
    }),
  );
  await page.route("**/api/config/backup", (route) =>
    route.fulfill({ json: { ok: true, started: true } }),
  );
  await page.route("**/api/config/restore", (route) =>
    route.fulfill({ json: { ok: true, staged: true, autoRestart: false } }),
  );
}

// ---------------------------------------------------------------------------

test("mobile /config: status card, toggle, schedule entry with the server-derived next-fire chip", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the Config card block is MORE-01b's surface",
  );
  const snaps = configSnapshots(Date.now());
  await stageConfigDomain(page, {
    snapshots: snaps,
    settings: { configSchedule: "daily 03:00" },
    scheduleNext: [{ job: "config", domain: "config", next: "2026-09-14T03:00:00Z" }],
  });
  await page.goto("/config");

  // Status card: the last-run line renders the NEWEST snapshot (a max over
  // parsed times, never an order assumption) — Node mirrors the browser's
  // toLocaleString byte-for-byte (en-US + same host timezone) — and the
  // status Badge carries the newest snapshot's relative age.
  const newestIso = snaps[1].time;
  await expect(page.getByText(`Last backup: ${new Date(newestIso).toLocaleString("en-US")}`)).toBeVisible();
  await expect(page.getByText("30 minutes ago")).toBeVisible();

  // The page's ONE accent reservation is the self-backup trigger (the Fab is
  // the same action through fireRef) — both carry the label on material.
  await expect(
    page.getByRole("button", { name: "Back up settings now" }).filter({ visible: true }),
  ).toHaveCount(2);

  // The configEnabled autosave toggle — the desktop settings card's own row,
  // re-hosted on the card language.
  await expect(
    page.getByRole("switch", { name: "Back up BombVault's settings" }),
  ).toBeVisible();

  // The schedule entry row with the SERVER-derived next-fire chip (D-06):
  // the chip's text is the staged /api/schedule/next config entry, formatted
  // — never client cadence math.
  const scheduleRow = page.getByRole("button", { name: "Self-backup schedule" });
  await expect(scheduleRow).toBeVisible();
  const chip = page
    .locator("span.rounded-pill.bg-accentSoft.text-accentText")
    .filter({ visible: true });
  await expect(chip).toHaveText(new Date("2026-09-14T03:00:00Z").toLocaleString("en-US"));

  // The restore entry is a tonal row (never accent) — the entry carries no
  // accent class while the trigger above does.
  const restoreRow = page.getByRole("button", { name: "Restore BombVault's own settings" });
  await expect(restoreRow).toBeVisible();
  const restoreCls = (await restoreRow.getAttribute("class")) ?? "";
  expect(restoreCls).toContain("bg-carbon-surface2");
  expect(restoreCls).not.toContain("bg-accent");
});

test("mobile /config: the restore sheet renders the guard chain before the outcome-naming confirm", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the D-03 guard-chain narration is the phone contract (T-07-12)",
  );
  await stageConfigDomain(page);
  await page.goto("/config");

  const row = page.getByRole("button", { name: "Restore BombVault's own settings" });
  await expect(row).toBeVisible();
  await row.tap();

  const sheet = page.getByRole("dialog", { name: "Restore BombVault's own settings" });
  await expect(sheet).toBeVisible();

  // The chain: title + all five ordered steps, readable — never collapsed
  // behind a single confirm.
  await expect(sheet.getByText("What happens when the config is restored")).toBeVisible();
  const steps = sheet.locator("ol > li");
  await expect(steps).toHaveCount(5);
  await expect(sheet.getByText("Your current settings choice is saved first.")).toBeVisible();
  await expect(
    sheet.getByText("If the APP_KEY does not match the snapshot, you are asked before anything else happens."),
  ).toBeVisible();

  // D-03 DOM-ORDER contract: the chain precedes the outcome-naming confirm
  // control (the desktop's own config-restore copy) in document order.
  const chainFirst = await sheet.evaluate((el) => {
    const ol = el.querySelector("ol");
    const confirm = Array.from(el.querySelectorAll("button")).find((b) =>
      (b.textContent ?? "").trim() === "Restore",
    );
    if (!ol || !confirm) return false;
    return !!(ol.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(chainFirst).toBe(true);

  // The confirm fires the SAME call the desktop trigger fires
  // (restoreConfig("latest")) — the sheet narrates the frozen chain, it does
  // not re-implement restore logic.
  const posted = page.waitForRequest(
    (r) => r.method() === "POST" && /\/api\/config\/restore$/.test(r.url()),
  );
  await sheet.getByRole("button", { name: "Restore", exact: true }).tap();
  const body = (await posted).postDataJSON() as { snapshot?: string };
  expect(body.snapshot).toBe("latest");

  // The staged response answers autoRestart:false → the manual-restart state
  // (Recovery's own copy) renders — deterministic, no health polling.
  await expect(
    sheet.getByText("Your settings are staged. Restart the BombVault container"),
  ).toBeVisible();
});

test("mobile /config: the toggle PUT merges only configEnabled onto the re-fetched baseline", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the T-07-13 write-chain contract is the phone surface",
  );
  await stageConfigDomain(page, {
    // Distinctive baseline values: the PUT body must carry THESE (the
    // re-fetched server state), never a mutated local snapshot.
    settings: { configSchedule: "weekly Mon 05:00", configOffsite: "rest:http://repo.example/backup" },
  });
  await page.goto("/config");

  const toggle = page.getByRole("switch", { name: "Back up BombVault's settings" });
  await expect(toggle).toBeVisible();

  const put = page.waitForRequest((r) => r.method() === "PUT" && /\/api\/settings$/.test(r.url()));
  await toggle.tap();
  const body = (await put).postDataJSON() as Record<string, unknown>;

  // The changed field carries the NEW value…
  expect(body.configEnabled).toBe(false);
  // …and EVERYTHING else is the re-fetched baseline verbatim — a full-object
  // PUT, yes, but one whose object is the server's own last-confirmed state
  // plus exactly one merged field (the sanctioned shape; a captured
  // mount-time snapshot would re-assert stale schedules/off-site paths).
  expect(body.configSchedule).toBe("weekly Mon 05:00");
  expect(body.configOffsite).toBe("rest:http://repo.example/backup");
  expect(body.configPath).toBe("/mnt/user/backups/config");
  expect(body.instanceName).toBe("e2e-harness");

  // Success toast (the standing rule; failure would have reverted + shaken).
  await expect(page.getByText("Settings saved")).toBeVisible();
});

test("mobile /config: the schedule sheet applies configSchedule and the chip refreshes from the server", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the D-05/D-06 schedule sheet is the phone contract",
  );
  await stageConfigDomain(page, {
    settings: { configSchedule: "daily 03:00" },
    scheduleNext: [{ job: "config", domain: "config", next: "2026-09-14T03:00:00Z" }],
  });
  // The staged next fire flips when the save lands, so the chip's refresh is
  // provably SERVER-derived (the payload moved, the chip follows).
  let nextFire = "2026-09-14T03:00:00Z";
  await page.route("**/api/schedule/next", (route) =>
    route.fulfill({ json: { ok: true, runs: [{ job: "config", domain: "config", next: nextFire }] } }),
  );
  await page.goto("/config");

  const chip = page
    .locator("span.rounded-pill.bg-accentSoft.text-accentText")
    .filter({ visible: true });
  await expect(chip).toHaveText(new Date(nextFire).toLocaleString("en-US"));

  // fullHeight sheet (D-05) hosting the SAME CadenceBuilder the desktop
  // Settings › Schedules card renders — every mode offered (a domain
  // schedule accepts everyN; #166's restriction is per-item overrides only).
  await page.getByRole("button", { name: "Self-backup schedule" }).tap();
  const sheet = page.getByRole("dialog", { name: "Self-backup schedule" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("tab", { name: "Daily" })).toHaveAttribute("aria-selected", "true");
  await expect(sheet.getByRole("tab", { name: "Every N days" })).toBeVisible();

  // Explicit apply: the PUT merges ONLY configSchedule onto the re-fetched
  // baseline (same T-07-13 contract as the toggle).
  const put = page.waitForRequest((r) => r.method() === "PUT" && /\/api\/settings$/.test(r.url()));
  await sheet.getByRole("button", { name: "Done" }).tap();
  const body = (await put).postDataJSON() as Record<string, unknown>;
  expect(body.configSchedule).toBe("daily 03:00");
  expect(body.configEnabled).toBe(true);

  // D-06: closing the sheet validates the edit — the chip re-reads
  // /api/schedule/next and follows the server payload, never a client clock.
  nextFire = "2026-09-15T03:00:00Z";
  await expect(page.getByText("Settings saved")).toBeVisible();
  await expect(chip).toHaveText(new Date(nextFire).toLocaleString("en-US"));
  await expect(sheet).toHaveCount(0);
});

test("mobile /config: gate-off shows the honest outline card and nothing else", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the destinations-gate mobile face",
  );
  await stageConfigDomain(page, { settings: { configEnabled: false } });
  await page.goto("/config");

  // A gated surface shows nothing else: no status card, no toggle, no entry
  // rows, no Fab — the gate hint + the settings row that turns it back on.
  await expect(
    page.getByText(
      "Back up BombVault's own settings, targets, and credentials, so a fresh install can restore its configuration too (self-backup).",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("switch", { name: "Back up BombVault's settings" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Self-backup schedule" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Restore BombVault's own settings" }),
  ).toHaveCount(0);

  // The gate card's one action: the settings row that turns self-backup on.
  // Scoped to the main scroller — the mobile bottom-nav's own Settings tab
  // would otherwise make this a strict-mode collision (the VMs precedent).
  const settingsLink = page
    .locator("#bv-main")
    .getByRole("link", { name: "Settings" })
    .filter({ visible: true });
  await expect(settingsLink).toBeVisible();
  await settingsLink.tap();
  await expect(page).toHaveURL(/\/settings$/);
});
