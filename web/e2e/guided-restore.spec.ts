// ---------------------------------------------------------------------------
// Guided-restore tracer e2e — 08-01 Task 3 (plan actions 2-3).
//
// The DOM twin (Recovery.mobile.dom.test.tsx) proves the double gate and the
// gating chain in jsdom; this spec proves the PHONE presentation on the real
// binary in real device emulation, end to end along the tracer's one vertical
// path: tap -> the same guarded handler the desktop card fires -> the staged
// route -> the step's honest readout. Choreography asserted, never restore
// outcomes (the harness has no Docker and no libvirt — see the harness
// honesty note).
//
// Harness honesty — what is staged and why (destination-vms-flash.spec.ts's
// recorded deviation, reused): the webServer is the real bombvault binary over
// a wiped fresh DB, so settings/vm-ssh/encryption-detect are real but EMPTY;
// the recovery-kit download would 403 fail-closed on a build without an
// exportable key, and a discover can never see a repository. The domains the
// flow reads are therefore fulfilled at the Playwright route layer with Go
// JSON shapes mirrored field-for-field from the FROZEN web/src/lib/api.ts —
// the SPA, its fetches and every route shape are real; only the payloads are
// fake. The display-prefs abort keeps the harness default English labels
// regardless of worker order (the boot-look cut, 05-06).
//
// API-call parity (the tracer's point): every staged handler RECORDS the
// method+path it served, and the choreography's tail asserts the recorded
// multiset is EXACTLY the desktop flow's call set — same endpoints (the probes
// still carrying ?probe=true, #44), same full-object PUT, and NO new calls:
// a mobile tap may not open a second fire path (D-02) onto new API surface
// (D-12). The counts are also what make a stray double-fetch loud.
//
// includeHidden:true semantics (destination-settings.spec.ts's rule): on a
// phone viewport the desktop stepper is MOUNTED but display:none
// (max-md:hidden), so it is OUT of the accessibility tree — role queries
// against it need the flag, and that is precisely how the D-01 "still
// mounted" half is asserted here. Plain (visible-only) locators are used for
// the mobile flow's own controls, where the flag would defeat the point.
// ---------------------------------------------------------------------------
import { expect, test, type Page } from "@playwright/test";

// The two device projects from playwright.config.ts; the leakage needles run
// on the desktop projects (desktop-untouched.spec.ts's branching pattern).
const MOBILE_PROJECTS = new Set(["mobile-iphone", "mobile-android"]);
const DESKTOP_PROJECTS = new Set(["desktop-1280", "desktop-768"]);

// All copy in this spec is the default-locale en; the pin keeps any future
// locale-negotiation change from silently re-wording the assertions.
test.use({ locale: "en-US" });

// --- staged Recovery domain (Go JSON shapes, api.ts — frozen) ----------------

/** GET /api/settings — the settings object mirrors the Settings interface
 *  field-for-field (the destination-vms-flash template); a fresh DB's honest
 *  shape, with the four backup paths pointing at harness paths so step 3's
 *  fields are the designed "unfilled-but-real" state. */
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

// The one record of what the flow actually put on the wire. Each staged
// handler appends "METHOD /path?query"; the choreography asserts the multiset.
type Call = { label: string; body?: unknown };

/**
 * Stages every domain the guided-restore flow reads, RECORDING each served
 * call. Zero-target everywhere: the tracer's path is the empty-repo disaster
 * box, and the kit gate (`restoreAllResult != null || (containers.length === 0
 * && vms.length === 0)`) must open for exactly that user.
 *
 * The runs list is staged empty for the shell's unack-badge fetch so the
 * parity multiset below stays a closed set — nothing the page fires during
 * this spec should ever reach the real binary's write paths.
 */
async function stageRecoveryDomain(page: Page): Promise<{ calls: Call[]; putBodies: unknown[] }> {
  const calls: Call[] = [];
  const putBodies: unknown[] = [];
  const rec = (label: string) => calls.push({ label });

  await page.route("**/api/display-prefs*", (route) => route.abort());
  await page.route("**/api/runs", (route) => route.fulfill({ json: { ok: true, runs: [] } }));

  // Settings: GET answers the fixture; PUT records the FULL body the flow
  // sends (parity: the desktop card's merge-onto-fresh-baseline PUT) and
  // fulfills ok — the harness DB stays untouched by a spec.
  await page.route("**/api/settings", (route) => {
    if (route.request().method() === "PUT") {
      putBodies.push(route.request().postDataJSON());
      rec("PUT /api/settings");
      return route.fulfill({ json: { ok: true } });
    }
    rec("GET /api/settings");
    return route.fulfill({ json: settingsBody() });
  });

  // The readability probes (GET-like POSTs, #44's read-only check): ok with
  // zero discovered and the primary path each domain read — the readSources
  // readout's fixture.
  const repo = (domain: string) => `/mnt/user/backups/${domain}`;
  await page.route("**/api/discover?probe=true", (route) => {
    rec("POST /api/discover?probe=true");
    return route.fulfill({ json: { ok: true, discovered: 0, repo: repo("containers") } });
  });
  await page.route("**/api/vms/discover?probe=true", (route) => {
    rec("POST /api/vms/discover?probe=true");
    return route.fulfill({ json: { ok: true, discovered: 0, repo: repo("vms") } });
  });
  await page.route("**/api/files/discover?probe=true", (route) => {
    rec("POST /api/files/discover?probe=true");
    return route.fulfill({ json: { ok: true, discovered: 0, repo: repo("files") } });
  });

  // The REAL discover (step 4's explicit action): still zero targets — the
  // zero-recovery box the kit gate exists for.
  await page.route("**/api/discover", (route) => {
    rec("POST /api/discover");
    return route.fulfill({ json: { ok: true, discovered: 0, repo: repo("containers") } });
  });
  await page.route("**/api/vms/discover", (route) => {
    rec("POST /api/vms/discover");
    return route.fulfill({ json: { ok: true, discovered: 0, repo: repo("vms") } });
  });
  await page.route("**/api/files/discover", (route) => {
    rec("POST /api/files/discover");
    return route.fulfill({ json: { ok: true, discovered: 0, repo: repo("files") } });
  });

  // The list refetch after Discover (runDiscover's parity trio) — empty.
  await page.route("**/api/containers", (route) => {
    rec("GET /api/containers");
    return route.fulfill({ json: { ok: true, containers: [] } });
  });
  await page.route("**/api/vms", (route) => {
    rec("GET /api/vms");
    return route.fulfill({ json: { ok: true, vms: [] } });
  });
  await page.route("**/api/files", (route) => {
    rec("GET /api/files");
    return route.fulfill({ json: { ok: true, fileSets: [] } });
  });

  // Advisory probes: libvirt SSH not wired (a note, never a block) and the
  // encryption probe answering "unconfigured" for the empty paths.
  await page.route("**/api/vm/ssh", (route) => {
    rec("GET /api/vm/ssh");
    return route.fulfill({ json: { ok: false } });
  });
  await page.route("**/api/encryption/detect", (route) => {
    rec("POST /api/encryption/detect");
    return route.fulfill({
      json: {
        ok: true,
        verdict: "unconfigured",
        applied: false,
        encryptionEnabled: false,
        repos: [],
      },
    });
  });

  // The kit itself: a 200 text/markdown body is the SUCCESS shape the client
  // downloads (a JSON body would be the fail-closed refusal). The body is a
  // harness placeholder — a real kit holds the master APP_KEY, which this
  // repo never carries.
  await page.route("**/api/recovery-kit", (route) => {
    rec("GET /api/recovery-kit");
    return route.fulfill({
      status: 200,
      contentType: "text/markdown",
      body: "# BombVault recovery kit (e2e staged placeholder)\n\nA real kit holds the master APP_KEY and the restic commands. This harness body carries no secret.",
    });
  });

  return { calls, putBodies };
}

// --- locators ----------------------------------------------------------------

/** The position chip's text, t("recovery.mobile.stepOf") with the fill. */
const chip = (n: number) => `Step ${n} of 6`;

/** The mobile flow's bar action by name. The bar is the page's ONLY sticky
 *  bottom element, and on a phone viewport the desktop half's same-named
 *  buttons are display:none (out of the a11y tree), so a plain role query
 *  resolves to the mobile control uniquely — that uniqueness IS the
 *  includeHidden rule applied from the other side. */
function barButton(page: Page, name: string) {
  return page.getByRole("button", { name });
}

/** On-screen text only. The desktop stepper stays MOUNTED at phone widths
 *  (D-01's other half) and renders most of the same copy — readFrom, the
 *  source paths, foundNone, noneDiscovered, kitHint all exist in both halves
 *  off the shared handler state — so a raw getByText resolves two elements on
 *  a phone and strict mode would fail every assert. The visibility filter
 *  (destination-vms-flash's pattern) keeps exactly the phone's one; role
 *  queries above never needed it because display:none is out of the a11y
 *  tree. */
function mtext(page: Page, text: string | RegExp) {
  return page.getByText(text).filter({ visible: true });
}

// --- the tracer choreography (mobile projects) --------------------------------

test("mobile /recovery: the zero-target walk 1..6 with API parity on every step", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the guided-restore phone flow is the tracer's surface",
  );
  const { calls, putBodies } = await stageRecoveryDomain(page);
  await page.goto("/recovery");

  // Step 1: chrome first — chip + the unanswered Check.
  await expect(page.getByText(chip(1))).toBeVisible();
  await expect(barButton(page, "Check")).toBeVisible();

  // The check fires the READ-ONLY probes (#44) — the same call the desktop
  // card's Check makes. Zero targets -> the honest warn answer, with the
  // folders the probe actually read named (#196).
  await barButton(page, "Check").tap();
  await expect(mtext(page, "Couldn't reach your backups yet. Attach the location below, then re-check.")).toBeVisible();
  await expect(mtext(page, /Read from:/)).toBeVisible();
  await expect(mtext(page, "/mnt/user/backups/containers")).toBeVisible();
  // (e) answered -> the bar action flips to Continue without re-firing.
  await expect(barButton(page, "Continue")).toBeVisible();

  await barButton(page, "Continue").tap();
  await expect(page.getByText(chip(2))).toBeVisible();
  // Step 2's sanctioned skip (the full config body is Plan 02).
  await page.getByRole("button", { name: "Skip: I don't have a settings backup" }).tap();
  await expect(page.getByText(chip(3))).toBeVisible();

  // Step 3: attach. The SAME connectPreview: a fresh GET baseline, then the
  // FULL-object PUT (parity asserted below), then re-detect + re-probe.
  await expect(barButton(page, "Connect & preview")).toBeVisible();
  await barButton(page, "Connect & preview").tap();
  await expect(barButton(page, "Continue")).toBeVisible();
  await barButton(page, "Continue").tap();
  await expect(page.getByText(chip(4))).toBeVisible();

  // Step 4: the real discover (no probe param — the rebuild), the list
  // refetch, and the honest empty answer with its remedy copy.
  await barButton(page, "Discover backups").tap();
  await expect(mtext(page, /Nothing found yet\. Check the connection and attachment above\./)).toBeVisible();
  await expect(barButton(page, "Continue")).toBeVisible();
  await barButton(page, "Continue").tap();

  // Step 5: the empty branch — zero targets reach the kit (never stranded).
  await expect(page.getByText(chip(5))).toBeVisible();
  await expect(mtext(page, "Run Discover above first.")).toBeVisible();
  await expect(barButton(page, "Continue")).toBeVisible();
  await barButton(page, "Continue").tap();

  // Step 6: the kit. The download is the SAME fetch the desktop card makes
  // (GET /api/recovery-kit -> a text/markdown body streams as the download).
  await expect(page.getByText(chip(6))).toBeVisible();
  await expect(barButton(page, "Download recovery kit")).toBeVisible();
  const kit = page.waitForEvent("download");
  await barButton(page, "Download recovery kit").tap();
  expect((await kit).suggestedFilename()).toBe("bombvault-recovery-kit.md");

  // D-01 mounted half: the desktop stepper is still in the DOM (hidden), so
  // its heading resolves ONLY with includeHidden — destination-settings' rule.
  await expect(
    page.getByRole("heading", { name: "Can BombVault read your backups?", includeHidden: true }),
  ).toHaveCount(1);

  // --- API-call parity: the recorded multiset IS the desktop flow's set -----
  //
  // mount: settings GET + encryption detect + vm-ssh probe;  Check: the three
  // ?probe=true reads;  attach: baseline GET + the FULL PUT + detect + the
  // three probes again;  discover: the three unprobed discovers + the three
  // list GETs;  kit: the one download GET. The two extra settings GETs are
  // the SHELL's own chrome traffic, not the flow's (verified by call order):
  // Layout fetches /api/settings at page mount and re-fetches when
  // bv:settings-changed fires — which connectPreview dispatches once — and
  // the desktop page drives the identical shell, so parity holds. Nothing
  // else: no new endpoint, no second fire path (D-02/D-12); the counts also
  // make a stray double-fetch loud.
  const sorted = calls.map((c) => c.label).sort();
  expect(sorted).toEqual(
    [
      "GET /api/settings",
      "GET /api/settings",
      "GET /api/settings",
      "GET /api/settings",
      "GET /api/vm/ssh",
      "POST /api/encryption/detect",
      "POST /api/encryption/detect",
      "POST /api/discover?probe=true",
      "POST /api/discover?probe=true",
      "POST /api/vms/discover?probe=true",
      "POST /api/vms/discover?probe=true",
      "POST /api/files/discover?probe=true",
      "POST /api/files/discover?probe=true",
      "POST /api/discover",
      "POST /api/vms/discover",
      "POST /api/files/discover",
      "GET /api/containers",
      "GET /api/vms",
      "GET /api/files",
      "GET /api/recovery-kit",
      "PUT /api/settings",
    ].sort(),
  );

  // The PUT is the desktop card's merge shape: a FULL settings object on the
  // freshly re-fetched baseline (retention numbers ride along), never a
  // per-field patch.
  expect(putBodies).toHaveLength(1);
  const put = putBodies[0] as Record<string, unknown>;
  expect(put.containersPath).toBe("/mnt/user/backups/containers");
  expect(put.retentionKeepLast).toBe(7);
  expect(put.encryptionEnabled).toBe(false);
});

// --- desktop leakage needles (desktop projects) --------------------------------

test("desktop /recovery: no mobile chrome leaks at >=48rem, the stepper is present", async ({
  page,
}, testInfo) => {
  test.skip(
    !DESKTOP_PROJECTS.has(testInfo.project.name),
    "desktop-only: the max-md leakage contract",
  );
  await stageRecoveryDomain(page);
  await page.goto("/recovery");

  // The mobile chrome is not merely hidden — the block mounts behind
  // !isDesktop, so none of it is in the DOM at all: no position chip and no
  // sticky bar (the phase-6 chrome signature). The copy needles are
  // deliberately NOT used here: the two halves share most strings
  // (noneDiscovered renders in the DESKTOP step-5 card too), so only the
  // chip text and the bar class are genuinely mobile-only DOM signatures.
  await expect(page.getByText(chip(1))).toHaveCount(0);
  await expect(page.locator("div.sticky.bottom-0.z-10.bg-carbon-sidebar")).toHaveCount(0);

  // The desktop stepper is present: the page heading and step 1's card.
  await expect(page.getByRole("heading", { level: 1, name: "Disaster recovery" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Can BombVault read your backups?" })).toBeVisible();
});
