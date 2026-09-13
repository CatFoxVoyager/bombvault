// ---------------------------------------------------------------------------
// Settings editor sheets e2e — the real-binary contract for the 07-07
// FLOW-02 sheet editors (the NotifyCard fullHeight re-host first; the offsite
// target CRUD/wizard sheets join in Task 2).
//
// The dom twins prove the desktop identity in jsdom (every Settings.*.dom
// suite keeps passing unchanged — jsdom answers desktop, so the mobile entry
// row and sheet never even mount there); this spec proves the PHONE
// presentation on the real binary in real device emulation:
//
//   1. the Notifications section's entry row opens the fullHeight editor
//      sheet (D-05) hosting the SAME three-Card form,
//   2. an edit inside the sheet fires setNotify with the edited field in the
//      POST body — and with NO secret value (blank-on-save keeps; the Set
//      badge comes from the staged has* flags),
//   3. closing the sheet without editing writes nothing (the stored config
//      is untouched — zero POSTs, and the summary survives a reload),
//   4. a failed save toasts AND shakes the exact field, reverting it to the
//      last-known-good value (the desktop revert+shake chain, carried into
//      the sheet).
//   (Task 3 adds the FLOW-01 sweep + desktop dual-direction scenarios.)
//
// Harness honesty — what is staged and why (the destination-settings Rule 3
// deviation, reused): the e2e webServer is the real bombvault binary over a
// wiped fresh DB, but /api/settings and /api/notify are staged field-for-
// field (the Go JSON shapes, api.ts) so a spec write can never reach the
// harness DB and the fixture values stay pinned regardless of Go defaults.
// The notify POSTs are captured for the body assertions and answered by the
// spec. The display-prefs route is METHOD-BRANCHED exactly as
// destination-settings.spec.ts stages it: the GET stays aborted (the
// boot-look cut, 05-06 — the harness default English labels regardless of
// worker order) while the PUT is answered OK.
//
// Locale pinning: `test.use({ locale: "en-US" })` — the same en copy the
// expectations below assert is what the i18n tables ship for the default
// fallback the aborted display-prefs reconciliation lands on.
// ---------------------------------------------------------------------------
import { expect, test, type Page } from "@playwright/test";

// The two device projects from playwright.config.ts; everything else is a
// desktop project (destination-config-receiver-fleet.spec.ts's branching
// pattern).
const MOBILE_PROJECTS = new Set(["mobile-iphone", "mobile-android"]);

// All copy in this spec is pinned to en-US (see the header note).
test.use({ locale: "en-US" });

// --- staged domains (Go JSON shapes, api.ts) --------------------------------

// GET /api/settings — mirrors the Settings interface field-for-field, the
// same fixture destination-settings.spec.ts stages for its own surfaces;
// the /settings page reads it whole on boot.
function settingsBody() {
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
    },
  };
}

// GET /api/notify — mirrors NotifyConfig field-for-field (api.ts) plus the
// two has* flags. BOTH secrets are staged as SET so every "blank field +
// Set badge" assertion below exercises the real write-only contract against
// a config that genuinely holds a secret, not an empty one; the stored
// values themselves are never sent (the server never sends them either).
function notifyBody() {
  return {
    ok: true,
    notify: {
      on: "failure",
      webhookEnabled: false,
      webhookUrl: "",
      webhookFormat: "generic",
      matrixEnabled: false,
      matrixHomeserver: "",
      matrixToken: "",
      matrixRoom: "",
      healthchecksUrl: "",
      healthchecksByDomain: {},
      unraid: false,
      smtpEnabled: false,
      smtpHost: "",
      smtpPort: 587,
      smtpUsername: "",
      smtpPassword: "",
      smtpFrom: "",
      smtpTo: "",
      smtpTls: "starttls",
      appriseEnabled: false,
      appriseUrl: "",
      appriseTags: "",
      scheduledSummary: false,
      notifyOnUpdate: false,
    },
    smtpPasswordSet: true,
    matrixTokenSet: true,
  };
}

/** Route-level staging of the /settings boot reads + the notify domain.
 *  Every notify POST body is captured into the returned array (the body
 *  assertions read it) and answered by `respond` — the default resolves the
 *  save OK; the failing-save scenario overrides per body. */
async function stageNotifyDomain(
  page: Page,
  respond: (body: Record<string, unknown>) => { ok: boolean; error?: string } = () => ({ ok: true }),
): Promise<Array<Record<string, unknown>>> {
  const posts: Array<Record<string, unknown>> = [];
  await page.route("**/api/display-prefs*", (route) =>
    // Method-branched (see the header note): GET aborts for the boot-look
    // cut; PUT answers OK so pref saves never error the scenario.
    route.request().method() === "GET"
      ? route.abort()
      : route.fulfill({ json: { ok: true } }),
  );
  await page.route("**/api/settings", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: settingsBody() })
      : route.fulfill({ json: { ok: true } }),
  );
  await page.route("**/api/notify", (route) => {
    const req = route.request();
    if (req.method() === "GET") return route.fulfill({ json: notifyBody() });
    posts.push(req.postDataJSON() as Record<string, unknown>);
    return route.fulfill({ json: respond(posts[posts.length - 1]!) });
  });
  return posts;
}

// --- shared locators ---------------------------------------------------------

// The Notifications section's entry row: its accessible name joins the
// section title and the live summary span, so the regex anchors on the
// space that only the summary produces — the chip strip's own
// "Notifications" tab button (exact name, no summary) can never match.
function notifyEntryRow(page: Page) {
  return page.getByRole("button", { name: /^Notifications / });
}

// The fullHeight editor sheet: role=dialog carrying the h-dvh variant class
// (the D-05 full-screen editor contract — the same signature
// destination-settings.spec.ts counts to zero on desktop).
function editorSheet(page: Page) {
  return page.locator('[role="dialog"].h-dvh');
}

// Boot /settings on the Notifications tab in advanced mode (advanced so the
// sheet's channels + Healthchecks Cards — the SAME form JSX — are mounted
// and assertable).
async function openNotificationsTab(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem("bombvault.advanced", "1"));
  await page.goto("/settings");
  await page
    .getByRole("navigation", { name: "Settings sections" })
    .getByRole("button", { name: "Notifications", exact: true })
    .tap();
}

// ---------------------------------------------------------------------------

test("mobile /settings: the notify entry row opens the fullHeight editor sheet hosting the same form", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the FLOW-02 sheet editor is the phone surface",
  );
  await stageNotifyDomain(page);
  await openNotificationsTab(page);

  // No sheet exists before the entry row is used — the phone shows ONE tonal
  // row, not the stacked desktop cards.
  await expect(editorSheet(page)).toHaveCount(0);

  const row = notifyEntryRow(page);
  // The summary span only renders once the staged GET has landed, so
  // visibility here doubles as the wait for the section's loaded state.
  await expect(row).toBeVisible();
  await expect(row).toContainText("Only on failure");
  await row.tap();

  const sheet = editorSheet(page);
  await expect(sheet).toBeVisible();
  // Full-height editor sheet (D-05): the h-dvh class the locator matched is
  // the variant itself — assert it explicitly so a regression to the 85dvh
  // cap fails here rather than silently re-matching a non-fullHeight sheet.
  await expect(sheet).toHaveClass(/h-dvh/);

  // The SAME form inside: the "Notify" Selector live (the staged on=failure
  // config selected), the three settings toggles, and — advanced is on — the
  // channels + Healthchecks Cards with their own headings. The sheet did not
  // fork the form; it re-hosts it.
  await expect(sheet.getByRole("tab", { name: "Only on failure" })).toHaveAttribute("aria-selected", "true");
  await expect(sheet.getByRole("switch", { name: "Summarise scheduled runs" })).toBeVisible();
  await expect(sheet.getByRole("switch", { name: "Unraid notifications" })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Send test" })).toBeVisible();
  await expect(sheet.getByText("Notification channels")).toBeVisible();
  await expect(sheet.getByText("Healthchecks", { exact: true })).toBeVisible();
});

test("mobile /settings: an edit in the notify sheet fires setNotify with the edit and no secret value; the token field is blank with the Set badge", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the FLOW-02 sheet editor is the phone surface",
  );
  const posts = await stageNotifyDomain(page);
  await openNotificationsTab(page);

  const row = notifyEntryRow(page);
  await expect(row).toBeVisible();
  await row.tap();
  const sheet = editorSheet(page);
  await expect(sheet).toBeVisible();

  // Enable the Matrix channel: one discrete click, one immediate setNotify
  // (no debounce) — the ONE write chain, ridden from inside the sheet.
  await sheet.getByRole("switch", { name: "Matrix" }).tap();

  // The channel's fields appear (fields hide while off, the desktop
  // pattern); the Access token — a staged-SET secret — renders BLANK with
  // the Set badge placeholder (T-07-24: never echoed, never prefilled).
  const token = sheet.getByLabel("Access token");
  await expect(token).toBeVisible();
  await expect(token).toHaveValue("");
  await expect(token).toHaveAttribute("placeholder", "saved (leave blank to keep)");

  // The POST body: the edited field carries the edit; both secrets travel
  // blank — blank-on-save keeps the stored value server-side, so the sheet
  // never PUTs a captured secret back (it never had one to capture).
  await expect.poll(() => posts.length).toBe(1);
  expect(posts[0]!.matrixEnabled).toBe(true);
  expect(posts[0]!.matrixToken).toBe("");
  expect(posts[0]!.smtpPassword).toBe("");

  // The save resolved through the real chain: the shared save toast.
  await expect(page.getByText("Settings saved")).toBeVisible();
});

test("mobile /settings: closing the notify sheet without editing writes nothing", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the FLOW-02 sheet editor is the phone surface",
  );
  const posts = await stageNotifyDomain(page);
  await openNotificationsTab(page);

  const row = notifyEntryRow(page);
  await expect(row).toBeVisible();
  await row.tap();
  const sheet = editorSheet(page);
  await expect(sheet).toBeVisible();

  // Cancel = the header close: no draft exists to discard (the form is
  // autosave), so closing must not have sent anything.
  await sheet.getByRole("button", { name: "Close" }).tap();
  await expect(editorSheet(page)).toHaveCount(0);
  expect(posts).toHaveLength(0);

  // The stored config is untouched: after a reload the entry row's summary
  // still reads the staged on=failure policy (the re-fetch assertion — the
  // staged GET stands in for the server's unchanged truth).
  await page.reload();
  await expect(notifyEntryRow(page)).toContainText("Only on failure");
});

test("mobile /settings: a failed notify save toasts AND shakes, reverting the field", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the FLOW-02 sheet editor is the phone surface",
  );
  // Fail exactly the typed-field save (its body carries a non-blank
  // webhookUrl); the channel toggle's own save resolves, so the field stays
  // mounted to receive the typed edit.
  const posts = await stageNotifyDomain(page, (body) =>
    body.webhookUrl ? { ok: false, error: "notify staging failure" } : { ok: true },
  );
  await openNotificationsTab(page);

  const row = notifyEntryRow(page);
  await expect(row).toBeVisible();
  await row.tap();
  const sheet = editorSheet(page);
  await expect(sheet).toBeVisible();

  await sheet.getByRole("switch", { name: "Webhook" }).tap();
  const url = sheet.getByLabel("Webhook URL");
  await expect(url).toBeVisible();
  await url.fill("https://discord.com/api/webhooks/staged");

  // The debounced save fires, fails, and the field gets the full desktop
  // treatment inside the sheet: the failure toast, the shake, and the
  // revert to the last-known-good (blank) value.
  await expect.poll(() => posts.length).toBe(2);
  await expect(page.getByText("notify staging failure")).toBeVisible();
  await expect(url).toHaveClass(/glim-shake/);
  await expect(url).toHaveValue("");
});
