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
async function bootSeededPage(page: Page, locale: string, width: number, path = "/dashboard"): Promise<void> {
  await page.route("**/api/display-prefs*", (route) => route.abort());
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [LOCALE_STORAGE_KEY, locale] as const,
  );
  await page.setViewportSize({ width, height: 700 });
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
// ---------------------------------------------------------------------------
const PHASE7_ROUTES = ["/vms", "/flash", "/config", "/receiver", "/fleet", "/settings"];

// Localized labels the sweep locates by (settings.tabsNavigation,
// settings.tab.general, activityLog.title; the Files header controls are
// files.editSet / files.deleteSet / containers.backupNow / files.enabled).
const STRIP_LABEL = { de: "Einstellungsbereiche", fr: "Sections de paramètres" } as const;
const GENERAL_TAB = { de: "Allgemein", fr: "Général" } as const;
const LOG_TITLE = { de: "Aktivitätsprotokoll", fr: "Journal d'activité" } as const;
const FILES_HEADER = {
  de: { edit: "Ordner-Set bearbeiten", remove: "Set entfernen", backup: "Jetzt sichern", toggle: "Im Zeitplan einschließen" },
  fr: { edit: "Modifier le jeu de dossiers", remove: "Retirer le jeu", backup: "Sauvegarder maintenant", toggle: "Inclure dans le planning" },
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

/** Contract 3a: the Settings chip strip renders its always-on tab, keeps
 *  every chip on ONE row (top spread ≤ 8px) and stays a horizontal scroller
 *  (overflow-x engaged) — scrollable, never wrapping. */
async function assertChipStrip(page: Page, label: string, navName: string, generalLabel: string): Promise<void> {
  const strip = page.getByRole("navigation", { name: navName });
  await expect(strip).toBeVisible();
  await expect(strip.getByText(generalLabel).first()).toBeVisible();
  await settle(page);

  const stats = await strip.evaluate((el) => {
    const kids = Array.from(el.querySelectorAll("button, a")).filter((k) => {
      const r = k.getBoundingClientRect();
      return r.width > 0 || r.height > 0;
    });
    const tops = kids.map((k) => k.getBoundingClientRect().top);
    return {
      chips: kids.length,
      spread: tops.length ? Math.max(...tops) - Math.min(...tops) : 0,
      overflowX: window.getComputedStyle(el).overflowX,
    };
  });
  expect(stats.chips, `${label}: the chip strip rendered no tabs`).toBeGreaterThan(0);
  expect(
    ["auto", "scroll"],
    `${label}: the chip strip must scroll horizontally (computed overflow-x: ${stats.overflowX})`,
  ).toContain(stats.overflowX);
  expect(
    stats.spread,
    `${label}: the chip strip wrapped to a second line (chip top spread ${stats.spread}px)`,
  ).toBeLessThanOrEqual(8);
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
  }
}
