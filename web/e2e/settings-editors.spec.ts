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
//
// Task 2 adds the offsite half of FLOW-02 on the same contract:
//
//   5. an offsite target's entry row opens the fullHeight editor sheet
//      re-hosting the SAME target form (and "Einrichten" opens the SAME
//      wizard steps in a fullHeight sheet),
//   6. create and edit ride createOffsiteTarget/updateOffsiteTarget — the
//      POST body carries only the form's fields (no captured id/createdAt);
//      a mid-edit concurrent server change never leaks into the submit (the
//      PUT carries the user's captured draft, not the concurrent values),
//   7. the sheet carries NO secret surface on first open AND on reopen after
//      an edit — an OffsiteTarget has no secret fields at all (api.ts:
//      "Carries NO secret fields"; credentials are SELECTED, never typed),
//      so the write-only contract is asserted structurally: zero password
//      inputs, credentials as a name-only select, across reopen cycles,
//   8. delete rides useConfirm → ConfirmSheet (the hook's own mobile half)
//      with the existing offsite.targets.* outcome-naming copy, then
//      deleteOffsiteTarget,
//   9. test connection rides testOffsiteTarget and reports through the
//      existing toast surface.
//
// Task 3 closes the plan with the two parity directions:
//
//   10. the FLOW-01 sweep — every schedule-bearing section previews the
//       staged settings fixture through the shared derivations (ScheduleRow's
//       resolved badge): a staged ACTIVE cadence resolves, a staged "off"
//       reads "Not scheduled", across the Schedules / Integrity /
//       Notifications tabs,
//   11. desktop dual-direction — at desktop widths the same sections render
//       their INLINE forms and the DOM carries ZERO fullHeight editor sheets
//       (the sheets are phone-only, not additive).
//
// Harness honesty — what is staged and why (the destination-settings Rule 3
// deviation, reused): the e2e webServer is the real bombvault binary over a
// wiped fresh DB, but /api/settings, /api/notify and the offsite target CRUD
// are staged field-for-field (the Go JSON shapes, api.ts) so a spec write can
// never reach the harness DB and the fixture values stay pinned regardless of
// Go defaults. The notify POSTs and the offsite POST/PUT/DELETE calls are
// captured for the body assertions and answered by the spec. The display-prefs
// route is METHOD-BRANCHED exactly as destination-settings.spec.ts stages it:
// the GET stays aborted (the boot-look cut, 05-06 — the harness default
// English labels regardless of worker order) while the PUT is answered OK.
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
function settingsBody(overrides: Record<string, unknown> = {}) {
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
      // Task 3's sweep passes cadence overrides (an ACTIVE containers cadence
      // + the digest toggle) so the schedule previews have something to
      // preview; every other caller stages the all-"off" default unchanged.
      ...overrides,
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
 *  save OK; the failing-save scenario overrides per body. The Task 3 sweep
 *  reuses this helper purely for the boot reads and passes cadence
 *  `settingsOverrides` (its notify capture stays unused). */
async function stageNotifyDomain(
  page: Page,
  respond: (body: Record<string, unknown>) => { ok: boolean; error?: string } = () => ({ ok: true }),
  settingsOverrides: Record<string, unknown> = {},
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
      ? route.fulfill({ json: settingsBody(settingsOverrides) })
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

// GET /api/offsite/targets?domain=containers — one staged ADDITIONAL target
// (sortOrder 1). OffsiteTarget carries NO secret fields (api.ts, verbatim:
// "Carries NO secret fields"): credsRef SELECTS a stored credential set, it
// never holds one, so there is no has* flag to stage and no secret value the
// server could send — the shape below is the whole truth of the row.
function offsiteTargetsBody() {
  return {
    ok: true,
    targets: [
      {
        id: "staged-target-id-1",
        domain: "containers",
        name: "Offsite copy B2",
        repo: "rest:http://192.168.1.50:8000/bombvault",
        credsRef: "",
        storageClass: "STANDARD_IA",
        immutable: true,
        schedule: "",
        retentionKeepLast: 7,
        retentionKeepDaily: 7,
        retentionKeepWeekly: 4,
        retentionKeepMonthly: 6,
        limitUpload: 0,
        limitDownload: 0,
        growthBudgetGb: 0,
        enabled: true,
        createdAt: 1726000000,
        sortOrder: 1,
      },
    ],
  };
}

// Route-level staging of the /settings boot reads + the OFFSITE domain. The
// targets GET is BRANCHED on the domain query param: only the containers
// section carries the staged row, so the row locator stays strict-mode-unique
// while the other four per-domain sections (all mounted on the tab) resolve
// empty. POST/PUT bodies land in `writes`, DELETE paths in `deletes` — the
// body assertions read them; every write is answered OK by the spec.
async function stageOffsiteDomain(page: Page): Promise<{
  writes: Array<Record<string, unknown>>;
  deletes: string[];
  /** Re-point the staged list mid-test — the concurrent-change fixture. The
   *  route closure reads the variable at request time, so every re-fetch
   *  after the swap serves the new payload. */
  setTargets: (payload: ReturnType<typeof offsiteTargetsBody>) => void;
}> {
  const writes: Array<Record<string, unknown>> = [];
  const deletes: string[] = [];
  let targetsPayload = offsiteTargetsBody();
  await page.route("**/api/display-prefs*", (route) =>
    route.request().method() === "GET"
      ? route.abort()
      : route.fulfill({ json: { ok: true } }),
  );
  await page.route("**/api/settings", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: settingsBody() })
      : route.fulfill({ json: { ok: true } }),
  );
  await page.route("**/api/cloud/creds-sets", (route) =>
    route.fulfill({ json: { ok: true, sets: [] } }),
  );
  // REGEX, not a glob: the id-bearing write paths (/api/offsite/targets/{id},
  // /api/offsite/targets/{id}/test) contain slashes, and a Playwright glob `*`
  // never crosses one — a glob here silently lets the PUT/DELETE/test POST
  // fall through to the REAL binary (seen live: the PUT 404'd server-side
  // while the GET/create-POST staged fine).
  await page.route(/\/api\/offsite\/targets/, (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === "GET") {
      return route.fulfill({
        json: url.searchParams.get("domain") === "containers" ? targetsPayload : { ok: true, targets: [] },
      });
    }
    if (req.method() === "DELETE") {
      deletes.push(url.pathname);
      return route.fulfill({ json: { ok: true } });
    }
    if (url.pathname.endsWith("/test")) {
      // The per-target probe: reachable + initialised in one answer.
      return route.fulfill({ json: { ok: true, reachable: true, initialized: true } });
    }
    // The remaining POST is the create (PUT is the update): both captured.
    writes.push(req.postDataJSON() as Record<string, unknown>);
    return route.fulfill({ json: { ok: true } });
  });
  return {
    writes,
    deletes,
    setTargets: (payload) => {
      targetsPayload = payload;
    },
  };
}

// Boot /settings on the Off-site tab (first-class flow — not advanced-only,
// so no initScript; the same chip-strip navigation as openNotificationsTab).
async function openOffsiteTab(page: Page): Promise<void> {
  await page.goto("/settings");
  await page
    .getByRole("navigation", { name: "Settings sections" })
    .getByRole("button", { name: "Off-site", exact: true })
    .tap();
}

// The wizard stepper's radio labels are the label text itself; the backend
// radio for rest-server is the wizard's step-1 landmark.
const WIZARD_REST_RADIO = /rest-server \(recommended/;

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

// ---------------------------------------------------------------------------

test("mobile /settings: an offsite target's entry row opens the fullHeight sheet hosting the same target form", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the FLOW-02 sheet editor is the phone surface",
  );
  await stageOffsiteDomain(page);
  await openOffsiteTab(page);

  await expect(editorSheet(page)).toHaveCount(0);
  const row = page.getByRole("button", { name: /Offsite copy B2/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText("rest:http://192.168.1.50:8000/bombvault");
  await expect(row).toContainText("append-only"); // the row's status language
  await row.tap();

  const sheet = editorSheet(page);
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveClass(/h-dvh/);
  await expect(sheet.getByText("Additional off-site targets")).toBeVisible();

  // The SAME form the desktop editor renders — no fork: name, repo URL, the
  // credentials select, the storage-class select, the immutable toggle and
  // the retention grid all carry the staged row's values.
  await expect(sheet.getByLabel("Name (optional)")).toHaveValue("Offsite copy B2");
  await expect(sheet.getByLabel("Off-site repository URL")).toHaveValue(
    "rest:http://192.168.1.50:8000/bombvault",
  );
  await expect(sheet.getByLabel("Credentials")).toBeVisible();
  await expect(sheet.getByRole("switch", { name: "Immutable (append-only)" })).toBeChecked();
  await expect(sheet.getByText("Retention (0 = keep all)")).toBeVisible();

  // Existing-target actions ride the existing surfaces: the test probe and
  // the useConfirm delete entry, plus the pinned apply/cancel bar.
  await expect(sheet.getByRole("button", { name: "Test", exact: true })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Remove", exact: true })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Save target" })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Cancel" })).toBeVisible();

  // The write-only contract is STRUCTURAL here (T-07-24): an OffsiteTarget
  // has no secret fields at all — credentials are a select of stored-set
  // NAMES — so the whole sheet must carry zero password inputs.
  await expect(sheet.locator('input[type="password"]')).toHaveCount(0);
});

test("mobile /settings: Einrichten opens the SAME offsite wizard steps inside the fullHeight sheet", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the FLOW-02 sheet editor is the phone surface",
  );
  await stageOffsiteDomain(page);
  await openOffsiteTab(page);

  // Five per-domain cards each carry the icon-only setup toggle; the first
  // is the containers card this spec stages.
  await page.getByRole("button", { name: "Set up" }).first().tap();

  const sheet = editorSheet(page);
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveClass(/h-dvh/);
  // The sheet title reuses the Card's own section key.
  await expect(sheet.getByText("Off-site copy Containers")).toBeVisible();

  // The SAME wizard steps, in-panel: backend picker (step 1), repo URL +
  // credentials + connection test (step 3), append-only protection (step 4).
  await expect(sheet.getByText("1 · Choose a backend")).toBeVisible();
  await expect(sheet.getByRole("radio", { name: WIZARD_REST_RADIO })).toBeVisible();
  await expect(sheet.getByText("3 · Repository URL + credentials")).toBeVisible();
  await expect(sheet.getByLabel("Off-site repository URL")).toHaveValue("");
  await expect(sheet.getByText("4 · Enable append-only protection")).toBeVisible();

  // Closing the sheet = the same setOffsiteWizard(null) path as the toggle.
  await sheet.getByRole("button", { name: "Close" }).tap();
  await expect(editorSheet(page)).toHaveCount(0);
});

test("mobile /settings: creating a target rides createOffsiteTarget with only the form's fields", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the FLOW-02 sheet editor is the phone surface",
  );
  const { writes } = await stageOffsiteDomain(page);
  await openOffsiteTab(page);

  // The add row calls the SAME openNew() the desktop "Ziel hinzufügen"
  // button does — one add flow, presented as a sheet on the phone. The
  // containers card is the first of the five per-domain cards.
  await page.getByRole("button", { name: "Add target" }).first().tap();
  const sheet = editorSheet(page);
  await expect(sheet).toBeVisible();
  // A new draft has no id: no test, no remove — only the form + bar.
  await expect(sheet.getByRole("button", { name: "Test", exact: true })).toHaveCount(0);
  await expect(sheet.getByRole("button", { name: "Remove", exact: true })).toHaveCount(0);

  await sheet.getByLabel("Name (optional)").fill("Staged new target");
  await sheet.getByLabel("Off-site repository URL").fill("s3:s3.eu-central-1.amazonaws.com/staged-bucket");
  await sheet.getByRole("button", { name: "Save target" }).tap();

  // The ONE write chain: createOffsiteTarget, carrying exactly the form's
  // fields — id and createdAt are server-minted and must NOT be captured,
  // and sortOrder is assigned above the staged additional target's 1 so it
  // can never be mistaken for the primary.
  await expect.poll(() => writes.length).toBe(1);
  const body = writes[0]!;
  expect(body.domain).toBe("containers");
  expect(body.name).toBe("Staged new target");
  expect(body.repo).toBe("s3:s3.eu-central-1.amazonaws.com/staged-bucket");
  expect(body.sortOrder).toBe(2);
  expect(body.id).toBeUndefined();
  expect(body.createdAt).toBeUndefined();

  await expect(page.getByText("Settings saved")).toBeVisible();
  await expect(editorSheet(page)).toHaveCount(0);
});

test("mobile /settings: an edit PUTs the captured draft (no concurrent leak); reopen still shows no secret surface", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the FLOW-02 sheet editor is the phone surface",
  );
  const { writes, setTargets } = await stageOffsiteDomain(page);
  await openOffsiteTab(page);

  const row = page.getByRole("button", { name: /Offsite copy B2/ });
  await expect(row).toBeVisible();
  await row.tap();
  let sheet = editorSheet(page);
  await expect(sheet).toBeVisible();
  // FIRST OPEN: no password input, credentials are a name-only select —
  // there is no secret value in the row to echo (T-07-24, structural).
  await expect(sheet.locator('input[type="password"]')).toHaveCount(0);
  await expect(sheet.getByLabel("Credentials")).toBeVisible();

  await sheet.getByLabel("Name (optional)").fill("Renamed by spec");
  // Mid-edit, "another device" re-points the repo and renames the row. The
  // sheet's draft was captured at open; the concurrent payload must never
  // leak into what the user submits.
  setTargets({
    ok: true,
    targets: [
      {
        ...offsiteTargetsBody().targets[0]!,
        name: "Concurrently renamed",
        repo: "rest:http://10.0.0.9:8000/moved",
      },
    ],
  });
  await sheet.getByRole("button", { name: "Save target" }).tap();

  // The PUT is updateOffsiteTarget's full-replace of the USER'S captured
  // draft: the rename rides along, the repo is the captured one, and the
  // concurrent repo/name appear NOWHERE in the body.
  await expect.poll(() => writes.length).toBe(1);
  const put = writes[0]!;
  expect(put.name).toBe("Renamed by spec");
  expect(put.repo).toBe("rest:http://192.168.1.50:8000/bombvault");
  expect(JSON.stringify(put)).not.toContain("10.0.0.9");
  expect(JSON.stringify(put)).not.toContain("Concurrently renamed");

  await expect(page.getByText("Settings saved")).toBeVisible();
  await expect(editorSheet(page)).toHaveCount(0);

  // REOPEN after the edit cycle (the flagged-assumption re-assertion): the
  // sheet re-hosts the form from a fresh read and STILL carries no secret
  // surface — same zero password inputs, same name-only credentials select.
  const reopenedRow = page.getByRole("button", { name: /Concurrently renamed/ });
  await expect(reopenedRow).toBeVisible();
  await reopenedRow.tap();
  sheet = editorSheet(page);
  await expect(sheet).toBeVisible();
  await expect(sheet.getByLabel("Name (optional)")).toHaveValue("Concurrently renamed");
  await expect(sheet.locator('input[type="password"]')).toHaveCount(0);
  await expect(sheet.getByLabel("Credentials")).toBeVisible();
});

test("mobile /settings: removing a target runs the ConfirmSheet with the outcome-naming copy, then deleteOffsiteTarget", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the FLOW-02 sheet editor is the phone surface",
  );
  const { deletes } = await stageOffsiteDomain(page);
  await openOffsiteTab(page);

  await page.getByRole("button", { name: /Offsite copy B2/ }).tap();
  const sheet = editorSheet(page);
  await expect(sheet).toBeVisible();

  await sheet.getByRole("button", { name: "Remove", exact: true }).tap();
  // useConfirm's mobile half (ConfirmSheet): the message + confirm label are
  // the existing offsite.targets.* two-click copy, the destructive control
  // sits on top, nothing destructive default-focused.
  const confirmSheet = page.locator('[role="dialog"]:not(.h-dvh)');
  await expect(confirmSheet).toBeVisible();
  await expect(confirmSheet.getByText("Confirm remove")).toBeVisible();
  await expect(confirmSheet.getByRole("button", { name: "Remove", exact: true })).toBeVisible();

  await confirmSheet.getByRole("button", { name: "Remove", exact: true }).tap();
  await expect.poll(() => deletes.length).toBe(1);
  expect(deletes[0]).toBe("/api/offsite/targets/staged-target-id-1");
  // The removed target closes its own editor sheet.
  await expect(editorSheet(page)).toHaveCount(0);
});

test("mobile /settings: a target's test connection rides testOffsiteTarget and reports through the existing toast surface", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the FLOW-02 sheet editor is the phone surface",
  );
  await stageOffsiteDomain(page);
  await openOffsiteTab(page);

  await page.getByRole("button", { name: /Offsite copy B2/ }).tap();
  const sheet = editorSheet(page);
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Test", exact: true }).tap();
  // The staged probe answers reachable + initialised; the verdict is the
  // SAME toast the desktop row's Test badge pushes (offsite.testOk).
  await expect(page.getByText("reachable + initialised")).toBeVisible();
});

// --- Task 3: the FLOW-01 sweep + the desktop dual-direction ------------------

// FLOW-01 sweep: walk the schedule-bearing sections and assert every preview
// is a rendering of a value the SERVER holds — the staged settings fixture
// read through the shared derivations (ScheduleRow's resolved badge, the
// effective-schedule lines), in BOTH directions: a staged ACTIVE cadence
// renders its resolved label, a staged "off" renders "Not scheduled", and
// nothing on the page derives a fire time on the client (there is no client
// clock math to catch — that absence is what FLOW-01's code sweep recorded).
test("mobile /settings: every schedule-bearing section previews the staged fixture (and 'Not scheduled' where the fixture has no entry)", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the phone presentation is the surface this sweep walks",
  );
  // containersSchedule ACTIVE (the "present" direction) + the digest toggle
  // on so its stored cadence is live (ScheduleRow's `enabled` gate); the
  // drills and tamper-test cadences stay at their base-fixture weekly values,
  // every other domain cadence stays "off" (the "absent" direction).
  await stageNotifyDomain(page, undefined, {
    containersSchedule: "daily 03:00",
    digestEnabled: true,
  });
  await page.goto("/settings");

  const chips = page.getByRole("navigation", { name: "Settings sections" });

  // Schedules tab: the containers Card previews the staged daily cadence
  // through ScheduleRow; the untouched domains all preview "Not scheduled"
  // (several rows qualify — first() is the honest assertion here).
  await chips.getByRole("button", { name: "Schedules", exact: true }).tap();
  await expect(page.getByText("Daily at 03:00")).toBeVisible();
  await expect(page.getByText("Not scheduled").first()).toBeVisible();

  // Integrity tab: the drill + tamper-test badges resolve the SAME fixture's
  // weekly cadences through the SAME shared badge grammar.
  await chips.getByRole("button", { name: "Integrity", exact: true }).tap();
  await expect(page.getByText("Weekly (Sun) at 04:30")).toBeVisible();
  await expect(page.getByText("Weekly (Sun) at 05:30")).toBeVisible();

  // Notifications tab: the digest Card's badge honours the staged toggle —
  // enabled here, so the stored weekly cadence resolves instead of greying.
  await chips.getByRole("button", { name: "Notifications", exact: true }).tap();
  await expect(page.getByText("Weekly (Mon) at 08:00")).toBeVisible();
});

// Desktop dual-direction (the other half of the D-01/D-05 gate): at desktop
// widths the SAME sections render their INLINE forms — the notify form's
// Cards and the offsite target rows sit directly on the page — and the DOM
// carries ZERO fullHeight editor sheets. Every scenario above proves the
// sheets open on the phone; this proves they are phone-only, not additive.
test("desktop /settings: the notify form and the offsite target rows render inline and no fullHeight editor sheet exists", async ({
  page,
}, testInfo) => {
  test.skip(
    MOBILE_PROJECTS.has(testInfo.project.name),
    "desktop-only: proves the sheets never mount at desktop widths",
  );
  // Advanced on so the notify form's channels Card is mounted and assertable
  // (the same boot state openNotificationsTab stages for the mobile sheet).
  await page.addInitScript(() => localStorage.setItem("bombvault.advanced", "1"));
  await stageNotifyDomain(page);
  await stageOffsiteDomain(page);

  // Notifications tab via the URL hash (the tab state restores from it on
  // boot — the same hash the strips write on switch): the notify form
  // renders INLINE, outside any dialog.
  await page.goto("/settings#notifications");
  await expect(page.getByText("Notification channels")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send test" })).toBeVisible();
  await expect(editorSheet(page)).toHaveCount(0);

  // Off-site tab: the desktop section renders the staged target's row inline
  // — still zero fullHeight sheets anywhere in the DOM.
  await page.goto("/settings#offsite");
  await expect(page.getByText("Offsite copy B2")).toBeVisible();
  await expect(editorSheet(page)).toHaveCount(0);
});
