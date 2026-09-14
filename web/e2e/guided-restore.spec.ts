// ---------------------------------------------------------------------------
// Guided-restore e2e — the 08-01 tracer walk (Task 3) plus the 08-02
// config-step choreography (the restore body Plan 02 landed inside the flow).
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
// Plan 02's config tests stage two more domains on the same discipline: the
// restore POST (body parity — the frozen client posts {"snapshot":"latest"}
// for a local repo) and /api/health (the down-then-up sequence
// waitForAppBack's requireDownFirst default demands before it lets the
// mid-flow reload fire, Pitfall 7).
//
// Plan 03's populated tests (the step-5 choreography) stage the runs domain
// as a MUTABLE fixture: each restore POST serve flips its target's staged run
// to "running" and a ~700ms-later timer flips it terminal, so the sequential
// one-at-a-time proof below can demand "a /api/runs serve that ALREADY
// observed target N terminal BETWEEN POST N and POST N+1" — a state a
// same-tick parallel loop can never produce, because the terminal state does
// not exist until 700ms after the POST serve. The live-progress test also
// stages one SSE frame on /api/progress (an EventSource parses a completed
// fulfilled body, then its native reconnect re-serves it; the "retry:" field
// keeps the reconnect at ~1s so the entry stays fresh, never STALE_MS-stale).
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
async function stageRecoveryDomain(
  page: Page,
  // Live view, not a snapshot: the config choreography mutates this object
  // when the staged restore POST is served, so the page's POST-reload remount
  // genuinely reads the RESTORED values back (the reload re-entry below is
  // asserted with the fixture actually flipped, not with the original one).
  settingsOverrides: Record<string, unknown> = {},
): Promise<{ calls: Call[]; putBodies: unknown[] }> {
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
    return route.fulfill({ json: settingsBody(settingsOverrides) });
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
  // Step 2's skip: the zero-target walk keeps the skip resolution (the
  // restore body's confirm/restart choreography has its own tests below; skip
  // fires no settings write, which this walk's exact PUT count also pins).
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

// --- the config-step choreography (08-02, mobile projects) --------------------

test("mobile /recovery: the config restore choreography - narration above a confirm-gated restore, POST parity, restart + reload re-entry", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the config step's phone choreography",
  );
  // Mutated by the staged restore handler so the POST-reload remount reads
  // the restored values back (see stageRecoveryDomain's overrides param).
  const settingsOverrides: Record<string, unknown> = {};
  const { calls, putBodies } = await stageRecoveryDomain(page, settingsOverrides);

  const restoreBodies: unknown[] = [];
  let restoreStaged = false;
  let healthDownSeen = false;
  // Pins the recorded-call index where the confirm-triggered burst starts.
  // The POST handler snapshots the slice AT SERVE TIME: restoreOwnConfig's
  // sequential await chain has by then already recorded its baseline GET and
  // full-object PUT, and the post-reload remount traffic has not happened yet
  // (it lands after the reload, outside the slice).
  let before = 0;
  let parityLabels: string[] | null = null;

  // The config restore endpoint: held ~600ms so the saving phase's busy title
  // is observably on screen, then the success shape the handler branches on
  // (staged + autoRestart -> the restart/reload path). On serve it also flips
  // the settings fixture - the restored values the remount reads back.
  await page.route("**/api/config/restore", async (route) => {
    calls.push({ label: "POST /api/config/restore" });
    restoreBodies.push(route.request().postDataJSON());
    parityLabels = calls.slice(before).map((c) => c.label);
    Object.assign(settingsOverrides, { configPath: "/mnt/user/restored/config" });
    restoreStaged = true;
    await new Promise((r) => setTimeout(r, 600));
    return route.fulfill({ json: { ok: true, staged: true, autoRestart: true } });
  });
  // The health poll behind waitForAppBack (api.ts, frozen): 200 before the
  // restore; after it exactly ONE 503 - the "seen down" its requireDownFirst
  // default demands - then 200, which resolves the wait and fires the
  // mid-flow window.location.reload() (Pitfall 7: the reload is CORRECT).
  await page.route("**/api/health", (route) => {
    if (!restoreStaged) return route.fulfill({ json: { ok: true, version: "e2e" } });
    if (!healthDownSeen) {
      healthDownSeen = true;
      return route.fulfill({ status: 503, json: { ok: false, error: "restarting" } });
    }
    return route.fulfill({ json: { ok: true, version: "e2e" } });
  });

  await page.goto("/recovery");

  // Walk to the config step (the same gates as the tracer walk).
  await expect(page.getByText(chip(1))).toBeVisible();
  await barButton(page, "Check").tap();
  await expect(barButton(page, "Continue")).toBeVisible();
  await barButton(page, "Continue").tap();
  await expect(page.getByText(chip(2))).toBeVisible();

  // D-03 narration: the chain renders read-only ABOVE the restore control.
  // DOM order = reading order, the Config MobileRestoreSheet precedent -
  // asserted on the real document (visible elements only: the mounted-hidden
  // desktop half carries a same-named Restore button that must not qualify).
  const narrationFirst = await page.evaluate(() => {
    const visible = (el: Element) => el.offsetParent !== null;
    const ol = Array.from(document.querySelectorAll("ol")).find(
      (el) => visible(el) && (el.textContent ?? "").includes("restored from the repository"),
    );
    const restore = Array.from(document.querySelectorAll("button")).find(
      (b) =>
        visible(b) && (b.getAttribute("aria-label") ?? b.textContent ?? "").trim() === "Restore",
    );
    if (!ol || !restore) return false;
    return !!(ol.compareDocumentPosition(restore) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(narrationFirst).toBe(true);

  // Confirm gate, CANCEL path: the sheet presents with the destructive
  // control on top and the safe cancel at the thumb-default bottom;
  // cancelling dismisses it with zero restore calls on the wire.
  const restoreCallCount = () =>
    calls.filter((c) => c.label.startsWith("POST /api/config/restore")).length;
  const restoreRow = page.getByRole("button", { name: "Restore", exact: true });
  await restoreRow.tap();
  const sheet = page.getByRole("dialog", { name: "Confirm" });
  await expect(sheet).toBeVisible();
  const destructiveFirst = await sheet.evaluate((el) => {
    const buttons = Array.from(el.querySelectorAll("button"));
    const confirm = buttons.find((b) => (b.textContent ?? "").trim() === "Confirm");
    const cancel = buttons.find((b) => (b.textContent ?? "").trim() === "Cancel");
    if (!confirm || !cancel) return false;
    return !!(confirm.compareDocumentPosition(cancel) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(destructiveFirst).toBe(true);
  await sheet.getByRole("button", { name: "Cancel", exact: true }).tap();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByText(chip(2))).toBeVisible();
  expect(restoreCallCount()).toBe(0);
  expect(putBodies).toHaveLength(0);

  // Confirm path: exactly the desktop handler's request burst, in order.
  await restoreRow.tap();
  await expect(sheet).toBeVisible();
  before = calls.length;
  await sheet.getByRole("button", { name: "Confirm", exact: true }).tap();

  // Saving phase: the row goes dead while the staged restore is in flight.
  // The busy phrase (configRestoring) is the app's tip-bubble copy: Button
  // carries `title` via useTipBubble (aria-describedby + hover/focus bubble),
  // never the accessible name, so the row's name stays "Restore". The
  // disabled+tip case wraps the button in a hover-reachable span exactly so
  // a dead control's bubble still opens - hover it and the phrase is on
  // screen. The staged 600ms hold keeps this window observable (and the
  // phrase stays up through the restarting phase, whose title is the same).
  await expect(restoreRow).toBeDisabled();
  await restoreRow.hover();
  await expect(page.getByText("Restoring…").filter({ visible: true })).toBeVisible();

  // Restarting phase: the auto-restart narration, then the reload.
  await expect(mtext(page, /restarting to apply your settings/)).toBeVisible();

  // Pitfall 7 IS the contract: the reload resets the flow to step 1 (step
  // position is deliberately not preserved), and the remounted page reads
  // the restored settings fixture.
  await expect(page.getByText(chip(1))).toBeVisible({ timeout: 15_000 });

  // Parity, captured at POST-serve time: exactly the desktop config restore's
  // burst - baseline GET, FULL-object PUT, the one restore POST.
  const parity = parityLabels ?? [];
  expect(parity).toHaveLength(3);
  expect([...parity].sort()).toEqual(
    ["GET /api/settings", "POST /api/config/restore", "PUT /api/settings"].sort(),
  );
  expect(restoreBodies).toHaveLength(1);
  // Local repo: the frozen client posts {"snapshot":"latest"} (source omitted).
  expect(restoreBodies[0]).toEqual({ snapshot: "latest" });
  // The PUT is the full-object merge on the re-fetched baseline (Pitfall 6):
  // the typed path rides along, retention numbers ride along - never a patch.
  expect(putBodies).toHaveLength(1);
  const put = putBodies[0] as Record<string, unknown>;
  expect(put.configPath).toBe("/mnt/user/backups/config");
  expect(put.retentionKeepLast).toBe(7);
});

test("mobile /recovery: skip stays the sanctioned empty resolution - advance with zero settings writes", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the skip resolution is the no-backup path",
  );
  const { calls, putBodies } = await stageRecoveryDomain(page);
  // The restore endpoint records too, so a skip that (wrongly) fired one
  // would be loud here rather than silently swallowed.
  await page.route("**/api/config/restore", (route) => {
    calls.push({ label: "POST /api/config/restore" });
    return route.fulfill({ json: { ok: false, error: "skip must not restore" } });
  });
  await page.goto("/recovery");

  await expect(page.getByText(chip(1))).toBeVisible();
  await barButton(page, "Check").tap();
  await expect(barButton(page, "Continue")).toBeVisible();
  await barButton(page, "Continue").tap();
  await expect(page.getByText(chip(2))).toBeVisible();

  const restoreCallsBefore = calls.filter((c) =>
    c.label.startsWith("POST /api/config/restore"),
  ).length;
  const putsBefore = putBodies.length;
  await page.getByRole("button", { name: "Skip: I don't have a settings backup" }).tap();
  await expect(page.getByText(chip(3))).toBeVisible();
  // Skip advances WITHOUT any settings write or restore call intercepted.
  expect(calls.filter((c) => c.label.startsWith("POST /api/config/restore")).length).toBe(
    restoreCallsBefore,
  );
  expect(putBodies.length).toBe(putsBefore);
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
  // Plan 02: the config chain narration is mobile-only chrome too - its
  // unique signature (the chain title, rendered by no desktop card) is
  // absent at >=48rem.
  await expect(page.getByText("What happens when the config is restored")).toHaveCount(0);

  // The desktop stepper is present: the page heading and step 1's card.
  await expect(page.getByRole("heading", { level: 1, name: "Disaster recovery" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Can BombVault read your backups?" })).toBeVisible();
});

// --- the populated step-5 choreography (08-03, mobile projects) ----------------
//
// The tracer proved the zero-target walk; these prove the POPULATED step-5
// body Plan 03 landed: the restore-all row behind the shared handler's own
// ConfirmSheet, the re-hosted desktop rows, the per-target Badge strip, the
// verify row, the visibility-gated live section, and the completion copy.
// Every fixture stays field-for-field with the frozen api.ts shapes, and no
// assertion ever fabricates an outcome the wire did not carry.

/** GET /api/containers row — the Container interface field-for-field. */
function containerPayload(name: string) {
  return {
    name,
    image: `registry.example/${name}:latest`,
    state: "exited",
    status: "",
    ip: "",
    installed: false,
    includeInSchedule: true,
    lastBackup: Math.floor(Date.now() / 1000) - 3600,
    lastBackupStarted: null,
    preHook: "",
    postHook: "",
    stopContainers: [],
    excludes: [],
    updateAfterBackup: false,
    lastUpdateCheck: 0,
    lastUpdateResult: "",
    stack: "",
    scheduleCadence: "",
  };
}

/** GET /api/vms row — the VM interface field-for-field. Display name and
 *  libvirt name deliberately DIFFER: the parity assert proves the restore
 *  POST rides the RAW libvirt name (the only identifier the /api/vms/{name}
 *  routes accept), never the display name. */
function vmPayload(display: string, libvirt: string) {
  return {
    name: display,
    libvirtName: libvirt,
    state: "shut off",
    method: "graceful",
    includeInSchedule: true,
    lastBackup: Math.floor(Date.now() / 1000) - 7200,
    lastBackupStarted: null,
    scheduleCadence: "",
  };
}

/** Which staged restore run /api/runs currently reports per target. "none"
 *  = no run record exists yet (the honest pre-restore state). */
type StagedRunStatus = "none" | "running" | "success" | "failed" | "cancelled";

/** A staged Run record — the Run interface field-for-field. The VM's target
 *  is the RAW libvirt name: that is what the backend records and what
 *  fireAndWaitRun's matchRun correlates on (r.target === v.libvirtName). */
function stagedRestoreRun(target: string, domain: "container" | "vm", status: StagedRunStatus) {
  const ids: Record<string, string> = {
    plex: "1".repeat(32),
    jellyfin: "2".repeat(32),
    win11: "3".repeat(32),
  };
  const terminal = status === "success" || status === "failed" || status === "cancelled";
  return {
    id: ids[target],
    targetId: ids[target].toUpperCase(),
    kind: "restore",
    status,
    startedAt: Math.floor(Date.now() / 1000) - 120,
    finishedAt: terminal ? Math.floor(Date.now() / 1000) - 30 : null,
    snapshotId: "f".repeat(32),
    bytes: 0,
    error: "",
    acknowledged: false,
    target,
    domain,
  };
}

/** How long after a restore POST serve the staged run flips terminal. The
 *  delay IS the one-at-a-time proof: no /api/runs serve can report the
 *  target terminal until this window has passed, so a POST N+1 observed
 *  before a terminal-observing GET necessarily overlapped POST N. */
const STAGED_FLIP_MS = 700;

/**
 * The populated Recovery domain: 2 containers (plex, jellyfin) + 1 VM
 * (display "win11-vm", libvirt "win11") + 0 file sets, with a MUTABLE
 * /api/runs fixture the restore POST handlers advance. Recording happens on
 * TWO channels: `events` is the ordered wire narrative (POST labels + a
 * compact snapshot of every /api/runs serve — what the ordering assert
 * reads), `calls` the plain multiset the way stageRecoveryDomain records.
 */
async function stagePopulatedRecoveryDomain(page: Page): Promise<{
  calls: Call[];
  events: string[];
  restoreBodies: unknown[];
  runsGets: () => number;
  runState: Record<string, StagedRunStatus>;
}> {
  const calls: Call[] = [];
  const events: string[] = [];
  const restoreBodies: unknown[] = [];
  let runsGetCount = 0;
  const rec = (label: string) => calls.push({ label });

  const runState: Record<string, StagedRunStatus> = {
    plex: "none",
    jellyfin: "none",
    win11: "none",
  };

  await page.route("**/api/display-prefs*", (route) => route.abort());
  await page.route("**/api/settings", (route) => {
    if (route.request().method() === "PUT") {
      rec("PUT /api/settings");
      return route.fulfill({ json: { ok: true } });
    }
    rec("GET /api/settings");
    return route.fulfill({ json: settingsBody() });
  });

  const repo = (domain: string) => `/mnt/user/backups/${domain}`;
  await page.route("**/api/discover?probe=true", (route) => {
    rec("POST /api/discover?probe=true");
    return route.fulfill({ json: { ok: true, discovered: 2, repo: repo("containers") } });
  });
  await page.route("**/api/vms/discover?probe=true", (route) => {
    rec("POST /api/vms/discover?probe=true");
    return route.fulfill({ json: { ok: true, discovered: 1, repo: repo("vms") } });
  });
  await page.route("**/api/files/discover?probe=true", (route) => {
    rec("POST /api/files/discover?probe=true");
    return route.fulfill({ json: { ok: true, discovered: 0, repo: repo("files") } });
  });
  await page.route("**/api/discover", (route) => {
    rec("POST /api/discover");
    return route.fulfill({ json: { ok: true, discovered: 2, repo: repo("containers") } });
  });
  await page.route("**/api/vms/discover", (route) => {
    rec("POST /api/vms/discover");
    return route.fulfill({ json: { ok: true, discovered: 1, repo: repo("vms") } });
  });
  await page.route("**/api/files/discover", (route) => {
    rec("POST /api/files/discover");
    return route.fulfill({ json: { ok: true, discovered: 0, repo: repo("files") } });
  });

  // Populated lists — runDiscover's parity refetch reads these, and they are
  // what opens step 5's populated branch (anyDiscovered).
  await page.route("**/api/containers", (route) => {
    rec("GET /api/containers");
    return route.fulfill({
      json: { ok: true, containers: [containerPayload("plex"), containerPayload("jellyfin")] },
    });
  });
  await page.route("**/api/vms", (route) => {
    rec("GET /api/vms");
    return route.fulfill({ json: { ok: true, vms: [vmPayload("win11-vm", "win11")] } });
  });
  await page.route("**/api/files", (route) => {
    rec("GET /api/files");
    return route.fulfill({ json: { ok: true, fileSets: [] } });
  });

  // The staged runs feed — read by BOTH the component's step-5 poll and
  // fireAndWaitRun's terminal wait. Every serve narrates its snapshot into
  // `events` so the ordering assert can demand a serve that ALREADY observed
  // a target terminal between two POSTs.
  await page.route("**/api/runs", (route) => {
    runsGetCount++;
    const live = (["plex", "jellyfin", "win11"] as const).filter((t) => runState[t] !== "none");
    events.push(`runs(${live.map((t) => `${t}:${runState[t]}`).join(",")})`);
    return route.fulfill({
      json: {
        ok: true,
        runs: live.map((t) => stagedRestoreRun(t, t === "win11" ? "vm" : "container", runState[t])),
      },
    });
  });

  // The restore POSTs — the exact wire endpoints the frozen client calls
  // (restore / restoreVM). Serve = record + flip "running"; a timer flips
  // terminal STAGED_FLIP_MS later (see STAGED_FLIP_MS's why).
  const restoreRoute = (pattern: string, label: string, target: string) =>
    page.route(pattern, async (route) => {
      events.push(label);
      calls.push({ label });
      restoreBodies.push(route.request().postDataJSON());
      runState[target] = "running";
      setTimeout(() => {
        runState[target] = "success";
      }, STAGED_FLIP_MS);
      return route.fulfill({ json: { ok: true, started: true } });
    });
  await restoreRoute("**/api/containers/plex/restore", "POST plex", "plex");
  await restoreRoute("**/api/containers/jellyfin/restore", "POST jellyfin", "jellyfin");
  await restoreRoute("**/api/vms/win11/restore", "POST win11", "win11");

  await page.route("**/api/vm/ssh", (route) => {
    rec("GET /api/vm/ssh");
    return route.fulfill({ json: { ok: false } });
  });
  await page.route("**/api/encryption/detect", (route) => {
    rec("POST /api/encryption/detect");
    return route.fulfill({
      json: { ok: true, verdict: "unconfigured", applied: false, encryptionEnabled: false, repos: [] },
    });
  });

  return { calls, events, restoreBodies, runsGets: () => runsGetCount, runState };
}

/** The populated walk to step 5 — the tracer's gates with populated fixtures:
 *  Check → Continue, step 2's unconditional Continue, Connect & preview →
 *  Continue, Discover backups → Continue. Asserts the found-counts echo on
 *  the way (the populated readout) so a silently-empty list fails loudly
 *  here instead of in every assert below. */
async function walkToPopulatedStep5(page: Page): Promise<void> {
  await page.goto("/recovery");
  await expect(page.getByText(chip(1))).toBeVisible();
  await barButton(page, "Check").tap();
  await expect(barButton(page, "Continue")).toBeVisible();
  await barButton(page, "Continue").tap();
  await expect(page.getByText(chip(2))).toBeVisible();
  await barButton(page, "Continue").tap();
  await expect(page.getByText(chip(3))).toBeVisible();
  await barButton(page, "Connect & preview").tap();
  await expect(barButton(page, "Continue")).toBeVisible();
  await barButton(page, "Continue").tap();
  await expect(page.getByText(chip(4))).toBeVisible();
  await barButton(page, "Discover backups").tap();
  await expect(mtext(page, /Found 2 containers and 1/)).toBeVisible();
  await barButton(page, "Continue").tap();
  await expect(page.getByText(chip(5))).toBeVisible();
}

/** The one-at-a-time proof: some /api/runs serve between POST `a` and POST
 *  `b` ALREADY observed `a`'s target terminal. A parallel loop fires every
 *  POST in the same tick — no serve can sit between two of them, and none
 *  could report terminal inside the STAGED_FLIP_MS window anyway. */
function assertSequentialBetween(events: string[], a: string, b: string): void {
  const postA = events.indexOf(a);
  const postB = events.indexOf(b);
  expect(postA, `${a} never fired`).toBeGreaterThanOrEqual(0);
  expect(postB, `${b} never fired`).toBeGreaterThanOrEqual(0);
  expect(postA, `${a} served after ${b} — the desktop order is containers first, then VMs`).toBeLessThan(postB);
  const terminal = `${a.split(" ")[1]}:success`;
  const saw = events.findIndex(
    (e, i) => i > postA && i < postB && e.startsWith("runs(") && e.includes(terminal),
  );
  expect(
    saw,
    `no /api/runs serve between ${a} and ${b} had already observed ${terminal} — the restore requests ` +
      "overlapped instead of firing one at a time (D-02: the shared handler is sequential)",
  ).toBeGreaterThanOrEqual(0);
}

test("mobile /recovery: populated step 5 - ConfirmSheet anatomy + consequence copy, cancel fires nothing, per-row confirm names the target", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the populated step-5 phone choreography",
  );
  const staged = await stagePopulatedRecoveryDomain(page);
  await walkToPopulatedStep5(page);

  // The populated readouts: the found-counts echo, the restore-all row, the
  // SSH advisory note (vm-ssh answers ok:false), and the re-hosted rows —
  // visible-filtered because the mounted-hidden desktop half carries the
  // same row copy (D-01's other half).
  await expect(mtext(page, "Restore all (left stopped)")).toBeVisible();
  await expect(mtext(page, "VM restore needs the libvirt SSH link")).toBeVisible();
  await expect(mtext(page, "plex")).toBeVisible();
  await expect(mtext(page, "jellyfin")).toBeVisible();
  // The VM row shows the DISPLAY name; the wire only ever sees the libvirt
  // name (asserted by the POST path in the sequential test below).
  await expect(mtext(page, "win11-vm")).toBeVisible();
  // The kit gate holds while targets exist and no result is in: no Continue.
  await expect(barButton(page, "Continue")).toHaveCount(0);

  const restorePostCount = () => staged.events.filter((e) => e.startsWith("POST ")).length;
  const restoreAllRow = page.getByRole("button", { name: "Restore all (left stopped)" });

  // Restore-all: the confirm lives INSIDE the shared handler — the sheet it
  // opens below md is ConfirmSheet's anatomy (destructive on top, safe
  // cancel at the thumb-default bottom) with the desktop card's own
  // consequence copy, zero new confirm UI (D-03).
  await restoreAllRow.tap();
  const sheet = page.getByRole("dialog", { name: "Confirm" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Restore the LATEST backup of the selected containers?")).toBeVisible();
  const destructiveFirst = await sheet.evaluate((el) => {
    const buttons = Array.from(el.querySelectorAll("button"));
    const confirm = buttons.find((b) => (b.textContent ?? "").trim() === "Confirm");
    const cancel = buttons.find((b) => (b.textContent ?? "").trim() === "Cancel");
    if (!confirm || !cancel) return false;
    return !!(confirm.compareDocumentPosition(cancel) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(destructiveFirst).toBe(true);
  await sheet.getByRole("button", { name: "Cancel", exact: true }).tap();
  await expect(sheet).toHaveCount(0);
  expect(restorePostCount()).toBe(0);

  // Per-row: the re-hosted RestoreRow's badge opens its own ConfirmSheet with
  // the target's name substituted into the row copy (restoreRowConfirm).
  const plexBadge = page
    .getByRole("button", { name: "Restore", exact: true })
    .filter({ visible: true })
    .first();
  await plexBadge.tap();
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText(/of “plex” in place/)).toBeVisible();
  await sheet.getByRole("button", { name: "Cancel", exact: true }).tap();
  await expect(sheet).toHaveCount(0);
  expect(restorePostCount()).toBe(0);
});

test("mobile /recovery: restore-all confirm issues the sequential desktop order one at a time, then the completion copy + ok badges", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the sequential parity choreography",
  );
  const staged = await stagePopulatedRecoveryDomain(page);
  await walkToPopulatedStep5(page);

  const restoreAllRow = page.getByRole("button", { name: "Restore all (left stopped)" });
  await restoreAllRow.tap();
  const sheet = page.getByRole("dialog", { name: "Confirm" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Confirm", exact: true }).tap();
  await expect(sheet).toHaveCount(0);

  // Single-flight busy: the row is dead while the shared loop runs.
  await expect(restoreAllRow).toBeDisabled();

  // Completion copy with the STAGED counts (never a fabricated outcome —
  // every count came off the wire). Three targets at (poll 2s + flip 0.7s)
  // each: generous ceiling, still far under fireAndWaitRun's own deadline.
  await expect(
    mtext(page, "Restored 3, failed 0. Start them from the Containers/VMs tabs when ready."),
  ).toBeVisible({ timeout: 25_000 });

  // Desktop order, exactly once each, and the VM POST rode the RAW libvirt
  // name (win11) — never the display name.
  expect(staged.events.filter((e) => e.startsWith("POST "))).toEqual([
    "POST plex",
    "POST jellyfin",
    "POST win11",
  ]);
  // One at a time: between each consecutive pair, a /api/runs serve had
  // ALREADY observed the previous target terminal (see the helper's why).
  assertSequentialBetween(staged.events, "POST plex", "POST jellyfin");
  assertSequentialBetween(staged.events, "POST jellyfin", "POST win11");

  // POST body parity — the frozen client's restore payload, verbatim.
  expect(staged.restoreBodies).toHaveLength(3);
  for (const body of staged.restoreBodies) {
    expect(body).toEqual({ snapshotId: "latest", confirm: true, leaveStopped: true });
  }

  // The per-target Badge strip reconciled from the recorded runs: all three
  // targets show the ok bucket's TEXT label (VERIFY-05: text + hue).
  const stripRow = (name: string) =>
    page.locator("div.flex.items-center.justify-between.gap-2").filter({ hasText: name }).filter({ visible: true });
  for (const name of ["plex", "jellyfin", "win11"]) {
    await expect(stripRow(name)).toContainText("OK");
  }
});

test("mobile /recovery: the verify row - checking state, staged results as text + Badge, restore controls stay enabled", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the verify row's choreography",
  );
  const staged = await stagePopulatedRecoveryDomain(page);
  // The two check endpoints the locally-copied domain mapping resolves to.
  // The first serve is held ~700ms so the busy label is observably on
  // screen; the second answers the frozen client's fail shape with a
  // scrubbed-looking reason the result row must render VERBATIM.
  let containersHeld = false;
  await page.route("**/api/check/containers", async (route) => {
    staged.calls.push({ label: "POST /api/check/containers" });
    if (!containersHeld) {
      containersHeld = true;
      await new Promise((r) => setTimeout(r, 700));
    }
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/check/vms", (route) => {
    staged.calls.push({ label: "POST /api/check/vms" });
    return route.fulfill({ json: { ok: false, error: "simulated verify failure" } });
  });
  await walkToPopulatedStep5(page);

  const verifyRow = page.getByRole("button", { name: "Verify", exact: true });
  const restoreAllRow = page.getByRole("button", { name: "Restore all (left stopped)" });
  await expect(verifyRow).toBeVisible();

  // NON-BLOCKING by construction: while the checks run, the restore controls
  // stay live (nothing in step 5 consults verifyBusy).
  await verifyRow.tap();
  await expect(page.getByRole("button", { name: "Checking…" })).toBeVisible();
  await expect(restoreAllRow).toBeEnabled();

  // The staged results: the ok domain renders the Badge + "Healthy" pair,
  // the failed domain its Badge + the server reason verbatim. Scoped to the
  // RESULT ROWS — bare "Containers"/"VMs" text is ambiguous on this page
  // (the nav bar's own slot labels match too; observed as a 5-element
  // strict-mode violation in the first run).
  const resultRow = (text: string) =>
    page.locator("div.flex.items-start.gap-2.text-xs").filter({ hasText: text }).filter({ visible: true });
  await expect(mtext(page, "Healthy")).toBeVisible();
  await expect(resultRow("Healthy")).toContainText("Containers");
  await expect(mtext(page, "simulated verify failure")).toBeVisible();
  await expect(resultRow("simulated verify failure")).toContainText("VMs");
});

test("mobile /recovery: live progress + log during a staged long run, visibility gating pauses and reconciles from server records", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the D-04 live-section choreography",
  );
  const staged = await stagePopulatedRecoveryDomain(page);
  // A pre-seeded in-flight restore (the staged long run) + the one SSE frame
  // that keeps its progress entry alive: EventSource parses a completed
  // fulfilled body, errors, and natively reconnects — "retry: 1000" keeps
  // the reconnect at ~1s, so the entry's lastSeen refreshes forever and the
  // live line never goes STALE_MS-stale.
  staged.runState.plex = "running";
  await page.route("**/api/progress", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body:
        "retry: 1000\n\n" +
        'data: {"key":"container:plex","phase":"restore","percent":42,"active":true}\n\n',
    }),
  );
  await walkToPopulatedStep5(page);

  // The live section: the inline bar (determinate at the staged 42%) and the
  // live log tail through the ONE log style — plus the cancel control.
  const bar = page.getByRole("progressbar");
  await expect(bar).toBeVisible();
  await expect(bar).toHaveAttribute("aria-valuenow", "42");
  await expect(mtext(page, "Restoring plex")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel restore" }).filter({ visible: true })).toBeVisible();

  // The run that finished in the background arrives as its terminal RECORD —
  // never extrapolated (D-04). Hide: the section unmounts (mounting IS the
  // subscription) and the step-5 runs poll pauses.
  await setPageVisibility(page, "hidden");
  await expect(bar).toHaveCount(0);
  await page.waitForTimeout(300); // let any in-flight poll land before counting
  const before = staged.runsGets();
  await page.waitForTimeout(4_600);
  expect(
    staged.runsGets(),
    "the step-5 runs poll kept firing while the page was hidden — the visibility gate must pause it",
  ).toBe(before);

  // Reshow while still running: the section remounts and re-reads the
  // shared progress state, and the poll chain resumes promptly.
  await setPageVisibility(page, "visible");
  await expect(bar).toBeVisible();
  await expect(bar).toHaveAttribute("aria-valuenow", "42");
  await page.waitForTimeout(1_500);
  expect(staged.runsGets()).toBeGreaterThan(before);

  // Second hide, terminal flip WHILE HIDDEN, reshow: reconciliation comes
  // from the refetched server record — the ok badge + the history line, and
  // no live section for a run no longer in flight.
  await setPageVisibility(page, "hidden");
  await expect(bar).toHaveCount(0);
  staged.runState.plex = "success";
  const before2 = staged.runsGets();
  await setPageVisibility(page, "visible");
  await expect(
    page.locator("div.flex.items-center.justify-between.gap-2").filter({ hasText: "plex" }).filter({ visible: true }),
  ).toContainText("OK", { timeout: 5_000 });
  await expect(mtext(page, /plex restored/)).toBeVisible();
  await expect(bar).toHaveCount(0);
  expect(staged.runsGets()).toBeGreaterThan(before2);
});

test("mobile /recovery: a cancelled restore renders the NEUTRAL terminal badge, never a failure tone", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the cancelled-terminal rendering",
  );
  // One pre-existing cancelled restore (the user cancelled it earlier): the
  // newest-run strip must read it as the neutral "Cancelled" bucket, not a
  // failure tone — a cancel is a decision, not an error.
  const staged = await stagePopulatedRecoveryDomain(page);
  staged.runState.jellyfin = "cancelled";
  await walkToPopulatedStep5(page);

  const badge = page.getByText("Cancelled", { exact: true }).filter({ visible: true });
  await expect(badge).toBeVisible();
  const cls = await badge.evaluate((el) => el.className);
  expect(
    cls.includes("bg-carbon-surface2"),
    `the Cancelled badge is not the neutral tone (classes: ${cls})`,
  ).toBe(true);
  expect(
    cls.includes("bg-statusFailBg") || cls.includes("text-statusFail"),
    `the Cancelled badge carries a failure tone (classes: ${cls})`,
  ).toBe(false);
});

// setPageVisibility — run-detail-visibility.spec.ts's helper, copied verbatim
// (with its source named): useVisibilityGate reads document.visibilityState
// through useSyncExternalStore, and a configurable property + dispatched
// visibilitychange event is exactly the browser-native signal it subscribes
// to — no page reload, no clock spoofing.
async function setPageVisibility(page: Page, state: "visible" | "hidden"): Promise<void> {
  await page.evaluate((s) => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => s });
    document.dispatchEvent(new Event("visibilitychange"));
  }, state);
}

// --- desktop leakage needles, step-5 signature (desktop projects) --------------

test("desktop /recovery: the POPULATED step-5 card renders with zero mobile step-5 chrome at >=48rem", async ({
  page,
}, testInfo) => {
  test.skip(
    !DESKTOP_PROJECTS.has(testInfo.project.name),
    "desktop-only: the populated step-5 leakage contract",
  );
  // Unlike the boot-time leakage test above, this WALKS the desktop stepper
  // into the populated step 5 (one Discover tap — the same shared handler)
  // so the mobile-only step-5 signatures have a populated page to leak onto.
  // The needles are genuinely mobile-only DOM: the verify row (the desktop
  // card has no checkDomain control — verify lives on the Settings integrity
  // tab) and the live-progress bar (a desktop RestoreProgress bar renders
  // only while its OWN watch is pending, which nothing here starts).
  await stagePopulatedRecoveryDomain(page);
  await page.goto("/recovery");

  // click, not tap: the desktop projects carry no hasTouch context option.
  await page.getByRole("button", { name: "Discover backups" }).click();
  await expect(page.getByText("plex")).toBeVisible();
  await expect(page.getByRole("button", { name: "Restore all (left stopped)" })).toBeVisible();

  await expect(page.getByRole("button", { name: "Verify", exact: true })).toHaveCount(0);
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByText(chip(5))).toHaveCount(0);
});
