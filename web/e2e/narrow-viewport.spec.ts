// ---------------------------------------------------------------------------
// Narrow-viewport backstop — the operationalized UI-SPEC UI Considerations
// long-text row (phase 05 plan 06, Task 2).
//
// UI-SPEC's one backstop state, made executable evidence: German and French
// chrome must fit 320-360px — the de compound words ("Einstellungen",
// "Wiederherstellung") and fr accented long labels ("Paramètres",
// "Récupération") are the stress cases. For every combination of {de, fr} x
// {320px, 360px}, every bottom-bar slot caption and every More-sheet row
// label stays on a SINGLE line box and the bar container shows NO horizontal
// overflow — the min-w-0 + truncate CSS contract's visible outcome.
//
// Geometry, not screenshots (fast + non-flaky): each caption's height is
// measured against an explicitly normalized 20px line box — with the
// truncate contract intact (white-space: nowrap) a caption IS one line box;
// a dropped contract lets a long label wrap into a second box (~40px),
// which is the exact failure mode the 1.5x bound cannot pass. Overflow is
// scrollWidth vs clientWidth on the bar itself. Both measurements tolerate
// subpixel rounding (+0.5/+1px) and nothing else.
//
// The locale is seeded the way a returning visitor's browser carries it —
// the persisted `bv-lang` localStorage key (web/src/lib/i18n.ts STORAGE_KEY;
// not exported, kept in sync by hand) — via addInitScript BEFORE the first
// page script runs. The mobile chrome has no language control this phase
// (the switcher lives in the desktop-only Sidebar controls), so there is no
// UI-driven path; seeding is the only honest way to boot the page in de/fr.
//
// The boot-time display-prefs reconciliation is cut (see bootSeededPage):
// the server is the truth for the look (#191), so a stored bv-lang on the
// harness DB would silently overwrite this page's seed — and with de/fr
// workers running in parallel, each page would see whichever locale booted
// first, not its own.
// ---------------------------------------------------------------------------
import { expect, test, type Page } from "@playwright/test";

// The two device projects from playwright.config.ts — the backstop targets
// the mobile chrome, which only exists below the 48rem switch.
const MOBILE_PROJECTS = new Set(["mobile-iphone", "mobile-android"]);

// Persisted-locale localStorage key (i18n.ts STORAGE_KEY) + the localized
// "More" trigger label per locale. Waiting on the localized trigger before
// measuring proves the locale TABLE is live (de ships inline; fr arrives via
// its async locale chunk) — measuring before that would silently assert the
// English fallback instead of the stress-case strings.
const LOCALE_STORAGE_KEY = "bv-lang";
const MORE_LABEL = { de: "Mehr", fr: "Plus" } as const;
// The sheet's fresh-DB stress-case row: the always-on Recovery destination.
const RECOVERY_LABEL = { de: "Wiederherstellung", fr: "Récupération" } as const;

// Explicit single-line box used for the height arithmetic (see header).
const LINE_BOX = 20;

// Boot the page with THIS test's locale standing, immune to the server-side
// look and to the other workers: seed the persisted key before any page
// script runs (a returning visitor's localStorage), then abort the
// boot-time display-prefs reconciliation. sync()'s fetch failing is the
// app's own documented degradation path ("offline: the cache is the look",
// displayPrefs.ts / #191), so the seeded locale renders — and nothing is
// PUT back to the shared harness server, which is what makes parallel de/fr
// workers deterministic (a booted de page otherwise seeds bv-lang=de on the
// server and every later fr boot adopts it — observed live in this phase).
async function bootSeededPage(
  page: Page,
  locale: string,
  width: number,
  path = "/dashboard",
  // Landscape dimensions (the D-09 boundary tests) pass a real phone-landscape
  // height; the portrait sweep keeps the original 700.
  height = 700,
): Promise<void> {
  await page.route("**/api/display-prefs*", (route) => route.abort());
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [LOCALE_STORAGE_KEY, locale] as const,
  );
  await page.setViewportSize({ width, height });
  await page.goto(path);
}

const locales = ["de", "fr"] as const;
const widths = [320, 360];

for (const locale of locales) {
  for (const width of widths) {
    test(`narrow viewport ${locale} @ ${width}px: bar and sheet labels single-line, bar never overflows`, async ({ page }, testInfo) => {
      test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "mobile-only: the backstop targets the mobile chrome");
      await bootSeededPage(page, locale, width);

      // The locale table is live: the trigger carries its localized label.
      const bar = page.getByTestId("bottom-nav");
      const moreTrigger = bar.getByRole("button", { name: MORE_LABEL[locale] });
      await expect(moreTrigger).toBeVisible();

      // Single-line contract, bar captions: every slot caption is one
      // normalized line box (+subpixel), never two (~2x). Two full line
      // boxes need >= 2 * LINE_BOX, so the 1.5x bound is strict about the
      // two-line failure mode while tolerating subpixel rounding.
      const captionStats = await bar
        .locator("span.truncate")
        .evaluateAll(
          (els, box) =>
            els.map((el) => {
              el.style.lineHeight = `${box}px`;
              const height = el.getBoundingClientRect().height;
              el.style.lineHeight = "";
              return { text: (el.textContent ?? "").trim(), height };
            }),
          LINE_BOX,
        );
      expect(
        captionStats.length,
        "the bar must carry caption labels to assert against",
      ).toBeGreaterThan(0);
      for (const s of captionStats) {
        expect(s.height, `caption "${s.text}" must stay on one line`).toBeGreaterThan(0);
        expect(
          s.height,
          `caption "${s.text}" wrapped to a second line (height ${s.height}px vs one ${LINE_BOX}px line box)`,
        ).toBeLessThanOrEqual(LINE_BOX * 1.5 + 0.5);
      }

      // No-overflow contract: the bar never scrolls horizontally — with
      // min-w-0 + truncate the slots shrink/ellipsis instead of pushing the
      // bar wider than the viewport. (+1px subpixel tolerance.)
      const barOverflow = await bar.evaluate((el) => ({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }));
      expect(
        barOverflow.scrollWidth,
        `the bar overflows horizontally at ${width}px (${barOverflow.scrollWidth} > ${barOverflow.clientWidth})`,
      ).toBeLessThanOrEqual(barOverflow.clientWidth + 1);

      // Same single-line contract inside the More sheet: open it and measure
      // every destination row's label span (the long de/fr Recovery label is
      // the fresh-DB stress case; the sheet is where >1 row lands later).
      await moreTrigger.click();
      const sheet = page.getByTestId("more-sheet");
      await expect(sheet).toBeVisible();
      await expect(sheet.getByRole("link", { name: RECOVERY_LABEL[locale] })).toBeVisible();

      const rowStats = await sheet
        .getByRole("link")
        .locator("span.truncate")
        .evaluateAll(
          (els, box) =>
            els.map((el) => {
              el.style.lineHeight = `${box}px`;
              const height = el.getBoundingClientRect().height;
              el.style.lineHeight = "";
              return { text: (el.textContent ?? "").trim(), height };
            }),
          LINE_BOX,
        );
      expect(
        rowStats.length,
        "the sheet must carry row labels to assert against",
      ).toBeGreaterThan(0);
      for (const s of rowStats) {
        expect(s.height, `sheet row "${s.text}" must stay on one line`).toBeGreaterThan(0);
        expect(
          s.height,
          `sheet row "${s.text}" wrapped to a second line (height ${s.height}px)`,
        ).toBeLessThanOrEqual(LINE_BOX * 1.5 + 0.5);
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Phase-7 surfaces (07-08 Task 3) — the sweep matrix grown from the chrome
// (bar + More sheet above) to every phase-7 destination surface: {de, fr} x
// {320px, 360px} over the six routes, the Dashboard log block, and the Files
// editor header (the carried 06-UI-REVIEW overflow fix's named home).
//
// Three contracts, all geometry not screenshots:
//   1. the PAGE never scrolls horizontally — checked on documentElement AND
//      on #bv-main, because the app scrolls inside #bv-main and the 07-06
//      page-pan bug was exactly that scroller growing a horizontal axis;
//   2. every rendered control sits inside the viewport, unless it lives in a
//      genuinely scrollable INLINE container (the chip strips: reachable by
//      scrolling them — the UI-SPEC overflow row's sanctioned case). The
//      exemption requires overflow-x: auto/scroll with overflow-y still
//      visible: #bv-main scrolls vertically, so a horizontal overflow there
//      is the bug, never a sanctioned scroller;
//   3. the named regressions hold: the Settings chip strip stays ONE line
//      while remaining scrollable, and the Files editor header's controls
//      stay inside the viewport with the flex-wrap fix in place.
//
// Data honesty: the six-route family rides the REAL fresh-DB server (the
// desktop-untouched split — fresh gates render their gate-off cards, which
// is exactly the layout the sweep must fit). The Files and Dashboard
// families stage their read models at the route layer (Go JSON shapes
// field-for-field, the list-ergonomics.spec.ts staging discipline): the
// Files header needs filesEnabled TRUE plus a set to expand — impossible on
// a fresh DB — and the log block needs runs to render rows.
//
// Phase-8 additions (08-03 Task 3): the sweep grows to /recovery — the
// POPULATED guided-restore step 5 is the densest mobile surface phase 8
// ships (restore-all row + the SSH advisory note + per-target rows with
// their Badges + the verify row), so it joins the {de, fr} x {320, 360}
// matrix with its read model staged populated (2 containers + 1 VM) and the
// flow WALKED in the seeded locale to step 5 before the geometry contracts
// run. After the matrix: the D-09 landscape boundary proof — the 48rem
// chrome switch is WIDTH-ONLY ("min-width: 48rem"), so a 740px-wide
// landscape phone gets the mobile chrome while 844x390 (>=768px CSS width)
// gets the DESKTOP chrome; that is the user-resolved 05 decision, asserted
// as the contract rather than reported as a leak.
// ---------------------------------------------------------------------------
const PHASE7_ROUTES = ["/vms", "/flash", "/config", "/receiver", "/fleet", "/settings"];

// Localized labels the sweep locates by (settings.tabsNavigation,
// settings.tab.general, activityLog.title; the Files header controls are
// files.editSet / files.deleteSet / containers.backupNow / files.enabled).
const STRIP_LABEL = { de: "Einstellungsbereiche", fr: "Sections de paramètres" } as const;
const GENERAL_TAB = { de: "Allgemein", fr: "Général" } as const;
const LOG_TITLE = { de: "Aktivitätsprotokoll", fr: "Journal d'activité" } as const;
// jdp's 2026-09-11 rename (absorbed by the resync) put the bare house verbs
// on the set's edit/remove tiles — common.edit / common.delete, the words the
// rest of the app already speaks — and demoted the long "Ordner-Set …" pair
// to the dialog heading and the title tooltip. The sweep probes accessible
// names, so it follows the verbs.
const FILES_HEADER = {
  de: { edit: "Bearbeiten", remove: "Löschen", backup: "Jetzt sichern", toggle: "Im Zeitplan einschließen" },
  fr: { edit: "Modifier", remove: "Supprimer", backup: "Sauvegarder maintenant", toggle: "Inclure dans le planning" },
} as const;

/** Let layout settle before any geometry read, in three steps: web-font swap
 *  changes text metrics for a frame; the entrance/tab-slide animations
 *  translate their hosts (glim-tab-slide alone is an 18px X slide) so a
 *  mid-animation read invents phantom pans (observed live: /settings
 *  measured +2..+18px wide mid-slide, /flash +3 mid-fade); then two rAFs
 *  flush the post-animation layout. Infinite animations (busy spinners)
 *  are excluded and the wait is capped so a perpetually-moving page can
 *  never wedge the sweep. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(() => {
    const finite = document
      .getAnimations()
      .filter((a) => a.effect?.getTiming().iterations !== Infinity);
    const drained = Promise.all(finite.map((a) => a.finished.catch(() => {})));
    const capped = new Promise((resolve) => setTimeout(resolve, 750));
    return Promise.race([drained, capped])
      .then(() => document.fonts.ready)
      .then(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
  });
}

/** Contract 1: neither documentElement nor #bv-main grows a horizontal axis
 *  (+1px subpixel tolerance, nothing else). A failing #bv-main names the
 *  widest offenders so the fix knows where to look. */
async function assertNoHorizontalPan(page: Page, label: string): Promise<void> {
  await settle(page);
  const m = await page.evaluate(() => {
    const main = document.querySelector("#bv-main");
    const wide: string[] = [];
    if (main && main.scrollWidth > main.clientWidth + 1) {
      const limit = main.getBoundingClientRect().right;
      for (const el of Array.from(main.querySelectorAll("*"))) {
        const cs = window.getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.right <= limit + 1) continue;
        const cls = typeof el.className === "string" ? el.className : "";
        wide.push(
          `${el.tagName.toLowerCase()}.${cls.split(" ").slice(0, 3).join(".")} "${(el.textContent ?? "").trim().slice(0, 30)}" right=${Math.round(rect.right)}`,
        );
        if (wide.length >= 5) break;
      }
    }
    return {
      doc: { sw: document.documentElement.scrollWidth, cw: window.innerWidth },
      main: main ? { sw: main.scrollWidth, cw: main.clientWidth } : null,
      wide,
    };
  });
  expect(m.doc.sw, `${label}: documentElement scrolls horizontally`).toBeLessThanOrEqual(m.doc.cw + 1);
  expect(
    m.main,
    `${label}: #bv-main is missing — the sweep must run against the real app shell`,
  ).not.toBeNull();
  expect(
    m.main!.sw,
    `${label}: #bv-main scrolls horizontally (the 07-06 page-pan bug class); widest: ${m.wide.join(" | ")}`,
  ).toBeLessThanOrEqual(m.main!.cw + 1);
}

/** Contract 2: no control clips a viewport edge unless a real inline
 *  x-scroller (overflow-x auto/scroll AND actually overflowing) contains it
 *  — those are reachable by scrolling, the ListToolbar chips-row doctrine.
 *  There is no overflow-y condition: CSS resolves `overflow-y: visible` to
 *  `auto` whenever overflow-x is non-visible, so every sanctioned scroller
 *  computes overflow-y: auto too (observed live on the Settings strip and
 *  the log toolbar in this sweep's first run). The page-level pan is
 *  contract 1's job, so exempting scroller content here masks nothing. */
async function assertNothingClipped(page: Page, label: string): Promise<void> {
  await settle(page);
  const offenders = await page.evaluate(() => {
    const vw = window.innerWidth;
    const found: string[] = [];
    const controls = document.querySelectorAll("button, a, input, select, textarea, [role='switch']");
    for (const el of Array.from(controls)) {
      const cs = window.getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      let inInlineScroller = false;
      for (let anc = el.parentElement; anc; anc = anc.parentElement) {
        const axs = window.getComputedStyle(anc).overflowX;
        if ((axs === "auto" || axs === "scroll") && anc.scrollWidth > anc.clientWidth + 1) {
          inInlineScroller = true;
          break;
        }
      }
      if (inInlineScroller) continue;
      if (rect.right > vw + 1 || rect.left < -1) {
        const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40);
        found.push(
          `${el.tagName.toLowerCase()} "${name}" left=${Math.round(rect.left)} right=${Math.round(rect.right)} viewport=${vw}`,
        );
      }
    }
    return found;
  });
  expect(offenders, `${label}: controls clip the viewport edge`).toEqual([]);
}

/** Contract 3a: the Settings chip strip renders its always-on tab and wraps
 *  its chips into rows inside its own box — the Selector's flex-wrap
 *  contract (upstream round 8 dropped the flex-nowrap "well" that genuinely
 *  spilled a 7-tab strip past the page edge). The strip itself never
 *  overflows horizontally, so nothing ever pans — page-wide (the sweep's
 *  global assertions) or strip-local (here). */
async function assertChipStrip(page: Page, label: string, navName: string, generalLabel: string): Promise<void> {
  const strip = page.getByRole("navigation", { name: navName });
  await expect(strip).toBeVisible();
  await expect(strip.getByText(generalLabel).first()).toBeVisible();
  await settle(page);

  const stats = await strip.evaluate((el) => ({
    chips: Array.from(el.querySelectorAll("button, a")).filter((k) => {
      const r = k.getBoundingClientRect();
      return r.width > 0 || r.height > 0;
    }).length,
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(stats.chips, `${label}: the chip strip rendered no tabs`).toBeGreaterThan(0);
  expect(
    stats.scrollWidth,
    `${label}: the chip strip overflowed horizontally (scrollWidth ${stats.scrollWidth} > clientWidth ${stats.clientWidth} — chips must wrap into rows, not pan)`,
  ).toBeLessThanOrEqual(stats.clientWidth);
}

// --- staged read models (list-ergonomics.spec.ts's shapes, field-for-field) --

function sweepSettingsBody() {
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
    },
  };
}

function sweepFileSetPayload(i: number) {
  const name = `set-${String(i).padStart(2, "0")}`;
  return {
    id: String(i).padStart(2, "0").repeat(16),
    name,
    path: `data/${name}`,
    excludes: [],
    enabled: true,
    lastBackup: 0,
    pathExists: true,
    selectedPaths: [`data/${name}`],
  };
}

/** The Files domain for the header sweep: gates on, one set to expand. The
 *  PATCH/preset drains are fulfilled so the wiped harness DB stays clean. */
async function stageFilesForSweep(page: Page): Promise<void> {
  await page.route("**/api/settings", (route) => route.fulfill({ json: sweepSettingsBody() }));
  await page.route("**/api/files/sets/preset*", (route) =>
    route.fulfill({ json: { ok: true, offered: false, name: "", path: "", excludes: [] } }),
  );
  await page.route("**/api/snapshots*", (route) => route.fulfill({ json: { ok: true, snapshots: [] } }));
  await page.route("**/api/files", (route) =>
    route.fulfill({ json: { ok: true, fileSets: [sweepFileSetPayload(0)] } }),
  );
  await page.route(/\/api\/files\/sets\/[^/]+$/, (route) => route.fulfill({ json: { ok: true } }));
}

/** The Dashboard read models for the log sweep: a couple of finished runs so
 *  the merged log renders rows, empty schedule/next so the idle line stays
 *  out (list-ergonomics.spec.ts's stageDashboard rationale). */
async function stageDashboardForSweep(page: Page): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const run = (i: number) => ({
    id: String(i).padStart(2, "0").padEnd(32, "a"),
    targetId: String(i).padStart(2, "0").padEnd(32, "b"),
    kind: "backup",
    status: "success",
    startedAt: now - (i + 1) * 3600,
    finishedAt: now - (i + 1) * 3600 + 60,
    snapshotId: "f".repeat(32),
    bytes: 1_000_000,
    error: "",
    acknowledged: false,
    target: `svc-${String(i).padStart(2, "0")}`,
    domain: "container",
  });
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: {
        ok: true,
        domains: [
          {
            domain: "containers",
            enabled: true,
            schedule: "every day",
            coveredBy: "",
            lastSuccess: now - 3600,
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
          },
        ],
      },
    }),
  );
  await page.route("**/api/schedule/next", (route) => route.fulfill({ json: { ok: true, runs: [] } }));
  await page.route("**/api/runs", (route) => route.fulfill({ json: { ok: true, runs: [run(0), run(1)] } }));
  await page.route("**/api/stats*", (route) =>
    route.fulfill({
      json: {
        ok: true,
        latest: { domain: "containers", source: "local", at: now, rawSize: 1_050_000_000_000, restoreSize: 260_000_000_000, snapshots: 3 },
      },
    }),
  );
}

// --- the populated /recovery domain for the step-5 sweep (08-03 Task 3) -------
//
// guided-restore.spec.ts's populated staging, compacted and DUPLICATED here
// per the house rule (importing across spec files executes the other spec's
// test() registrations — the per-spec staging duplication pattern this file
// already follows with sweepSettingsBody vs its guided-restore twin).

/** GET /api/containers row — the Container interface field-for-field. */
function sweepContainerPayload(name: string) {
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

/** GET /api/vms row — the VM interface field-for-field; the display name and
 *  libvirt name deliberately differ (the sweep renders the display row, and
 *  no restore is ever fired here to need the raw one). */
function sweepVMPayload(display: string, libvirt: string) {
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

/** The populated Recovery read model: 2 containers + 1 VM + 0 file sets, the
 *  probes and discovers answering populated, the advisory probes answering
 *  their honest unconfigured/unwired shapes. /api/runs is staged empty (the
 *  sweep never fires a restore — no restore POST route exists here, and none
 *  is ever hit: the geometry contracts only read the rendered step 5). */
async function stageRecoveryForSweep(page: Page): Promise<void> {
  await page.route("**/api/settings", (route) => {
    if (route.request().method() === "PUT") return route.fulfill({ json: { ok: true } });
    return route.fulfill({ json: sweepSettingsBody() });
  });
  const repo = (domain: string) => `/mnt/user/backups/${domain}`;
  const probe = (pattern: string, domain: string, discovered: number) =>
    page.route(pattern, (route) => route.fulfill({ json: { ok: true, discovered, repo: repo(domain) } }));
  await probe("**/api/discover?probe=true", "containers", 2);
  await probe("**/api/vms/discover?probe=true", "vms", 1);
  await probe("**/api/files/discover?probe=true", "files", 0);
  await probe("**/api/discover", "containers", 2);
  await probe("**/api/vms/discover", "vms", 1);
  await probe("**/api/files/discover", "files", 0);
  await page.route("**/api/containers", (route) =>
    route.fulfill({
      json: { ok: true, containers: [sweepContainerPayload("plex"), sweepContainerPayload("jellyfin")] },
    }),
  );
  await page.route("**/api/vms", (route) =>
    route.fulfill({ json: { ok: true, vms: [sweepVMPayload("win11-vm", "win11")] } }),
  );
  await page.route("**/api/files", (route) => route.fulfill({ json: { ok: true, fileSets: [] } }));
  await page.route("**/api/runs", (route) => route.fulfill({ json: { ok: true, runs: [] } }));
  await page.route("**/api/vm/ssh", (route) => route.fulfill({ json: { ok: false } }));
  await page.route("**/api/encryption/detect", (route) =>
    route.fulfill({
      json: { ok: true, verdict: "unconfigured", applied: false, encryptionEnabled: false, repos: [] },
    }),
  );
}

// The localized walk labels (recovery.recheck / common.continue /
// recovery.connectPreview / recovery.discover / recovery.mobile.stepOf — the
// de table inline in i18n.ts, fr in locales/fr.ts). EXACT matching is
// load-bearing on the German walk: "Prüfen" is a substring of "Verbinden &
// prüfen", so the default substring role match would tap the wrong step's
// control.
const RECOVERY_WALK = {
  de: {
    check: "Prüfen",
    cont: "Weiter",
    connect: "Verbinden & prüfen",
    discover: "Backups entdecken",
    chip: (n: number) => `Schritt ${n} von 6`,
  },
  fr: {
    check: "Vérifier",
    cont: "Continuer",
    connect: "Connexion et aperçu",
    discover: "Découvrir les sauvegardes",
    chip: (n: number) => `Étape ${n} sur 6`,
  },
} as const;

for (const locale of locales) {
  for (const width of widths) {
    const tag = `${locale} @ ${width}px`;

    for (const route of PHASE7_ROUTES) {
      test(`narrow sweep ${tag}: ${route} never pans and clips nothing`, async ({ page }, testInfo) => {
        test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "mobile-only: the sweep targets the mobile surfaces");
        await bootSeededPage(page, locale, width, route);

        // Locale liveness (the bar caption is the localized-table tell).
        const bar = page.getByTestId("bottom-nav");
        await expect(bar.getByRole("button", { name: MORE_LABEL[locale] })).toBeVisible();

        await assertNoHorizontalPan(page, `${tag} ${route}`);
        await assertNothingClipped(page, `${tag} ${route}`);
        if (route === "/settings") {
          await assertChipStrip(page, `${tag} ${route}`, STRIP_LABEL[locale], GENERAL_TAB[locale]);
        }
      });
    }

    test(`narrow sweep ${tag}: the Files editor header wraps and clips nothing (carried fix)`, async ({ page }, testInfo) => {
      test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "mobile-only: the sweep targets the mobile surfaces");
      await stageFilesForSweep(page);
      await bootSeededPage(page, locale, width, "/files");

      // Expand the set — the tap IS the disclosure — which renders the full
      // FileSetRow, header row included (the carried flex-wrap fix's host).
      await page.getByRole("button", { name: /^set-/ }).first().tap();
      const header = FILES_HEADER[locale];
      await expect(page.getByRole("button", { name: header.edit }).filter({ visible: true })).toBeVisible();

      await assertNoHorizontalPan(page, `${tag} /files header`);
      await assertNothingClipped(page, `${tag} /files header`);

      // The named regression, per control: nothing clips past the viewport
      // edge (exact names — "Jetzt sichern" is a substring of the bulk bar's
      // "Alle jetzt sichern", the trap list-ergonomics.spec.ts documented).
      const vw = (await page.viewportSize())?.width ?? width;
      for (const name of [header.edit, header.remove, header.backup]) {
        const box = await page.getByRole("button", { name, exact: true }).filter({ visible: true }).first().boundingBox();
        expect(box, `${tag} /files: "${name}" has no bounding box`).not.toBeNull();
        expect(box!.x, `${tag} /files: "${name}" left edge`).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width, `${tag} /files: "${name}" right edge`).toBeLessThanOrEqual(vw);
      }
      const toggleBox = await page.getByRole("switch", { name: header.toggle }).filter({ visible: true }).first().boundingBox();
      expect(toggleBox, `${tag} /files: the schedule toggle has no bounding box`).not.toBeNull();
      expect(toggleBox!.x + toggleBox!.width, `${tag} /files: toggle right edge`).toBeLessThanOrEqual(vw);
    });

    test(`narrow sweep ${tag}: the Dashboard log block never pans and clips nothing`, async ({ page }, testInfo) => {
      test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "mobile-only: the sweep targets the mobile surfaces");
      await stageDashboardForSweep(page);
      await bootSeededPage(page, locale, width);

      const card = page
        .locator("div.glim-notch-card")
        .filter({ hasText: LOG_TITLE[locale] })
        .filter({ visible: true });
      await expect(card).toBeVisible();

      await assertNoHorizontalPan(page, `${tag} /dashboard log`);
      await assertNothingClipped(page, `${tag} /dashboard log`);
    });

    test(`narrow sweep ${tag}: the recovery flow step 5 never pans and clips nothing`, async ({ page }, testInfo) => {
      test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "mobile-only: the sweep targets the mobile surfaces");
      await stageRecoveryForSweep(page);
      await bootSeededPage(page, locale, width, "/recovery");

      // Walk to the populated step 5 in the SEEDED locale — every gate label
      // and chip doubles as the locale-table liveness tell (the labels are
      // pinned exact: de "Prüfen" is a substring of "Verbinden & prüfen").
      const w = RECOVERY_WALK[locale];
      const walkButton = (name: string) => page.getByRole("button", { name, exact: true });
      await expect(page.getByText(w.chip(1))).toBeVisible();
      await walkButton(w.check).tap();
      await expect(walkButton(w.cont)).toBeVisible();
      await walkButton(w.cont).tap();
      await expect(page.getByText(w.chip(2))).toBeVisible();
      await walkButton(w.cont).tap();
      await expect(page.getByText(w.chip(3))).toBeVisible();
      await walkButton(w.connect).tap();
      await expect(walkButton(w.cont)).toBeVisible();
      await walkButton(w.cont).tap();
      await expect(page.getByText(w.chip(4))).toBeVisible();
      await walkButton(w.discover).tap();
      // Step 4's Continue only exists once the discover resolved (the same
      // gate the en walk pins with the found-counts readout).
      await expect(walkButton(w.cont)).toBeVisible();
      await walkButton(w.cont).tap();
      await expect(page.getByText(w.chip(5))).toBeVisible();

      // The POPULATED branch is what got swept — the target names are data,
      // not copy, so they prove the populated rows rendered in any locale
      // (an empty-branch step 5 would pass the chip check and sweep the
      // wrong surface).
      await expect(page.getByText("plex").filter({ visible: true }).first()).toBeVisible();
      await expect(page.getByText("win11-vm").filter({ visible: true }).first()).toBeVisible();

      await assertNoHorizontalPan(page, `${tag} /recovery step 5`);
      await assertNothingClipped(page, `${tag} /recovery step 5`);
    });
  }
}

// ---------------------------------------------------------------------------
// The D-09 landscape boundary (08-03 Task 3) — one proof, two viewports, the
// seeded-locale boot reused with real landscape heights. The mobile-chrome
// query is WIDTH-ONLY ("min-width: 48rem", the D-09 decision record): 740px
// stays mobile, 844x390 — a modern phone in landscape, 844 CSS px wide —
// crosses 48rem and gets the DESKTOP chrome, which the 05 research resolved
// as CORRECT (a height-aware query would be a behavior change beyond this
// milestone). Both run on the mobile projects only: the projects just supply
// the base device context, and setViewportSize overrides it either way.
// ---------------------------------------------------------------------------

test("landscape 740x360: below 48rem the mobile chrome owns /recovery", async ({ page }, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "mobile-only: the boundary pair rides the mobile projects");
  await stageRecoveryForSweep(page);
  await bootSeededPage(page, "en", 740, "/recovery", 360);

  // Mobile chrome at a phone-landscape width: the wizard's step chip and the
  // sticky step bar are on screen. The page's own h1 is NOT the needle here
  // — it is shared chrome rendered ABOVE the max-md split (Recovery.tsx's
  // page header), so it is visible in both chromes; the sticky bar is the
  // mobile-only signature (its absence at >=48rem is the 844 half below).
  await expect(page.getByText("Step 1 of 6")).toBeVisible();
  await expect(page.locator("div.sticky.bottom-0.z-10.bg-carbon-sidebar")).toBeVisible();
});

test("landscape 844x390: at >=48rem the DESKTOP chrome owns /recovery (D-09)", async ({ page }, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name), "mobile-only: the boundary pair rides the mobile projects");
  await stageRecoveryForSweep(page);
  await bootSeededPage(page, "en", 844, "/recovery", 390);

  // 844 CSS px >= 768 (48rem): the desktop stacked stepper renders and NO
  // mobile wizard chrome exists — the width-only switch did its job at a
  // landscape height, exactly as resolved in 05 (D-09).
  await expect(page.getByText("Step 1 of 6")).toHaveCount(0);
  await expect(page.locator("div.sticky.bottom-0.z-10.bg-carbon-sidebar")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Disaster recovery" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Can BombVault read your backups?" })).toBeVisible();
});
