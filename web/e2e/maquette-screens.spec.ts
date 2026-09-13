// ---------------------------------------------------------------------------
// Maquette screens e2e — the real-binary contract for the 06-05 phone
// surfaces (SCRN-02/03/04, FLOW-03; phase 06 plan 05, Task 3).
//
// The dom twins prove the SEMANTICS in jsdom; this spec proves the screens on
// the real binary in real device emulation. Five scenarios:
//
//   1. a container card tap stacks the detail (D-04) and Back returns with
//      the list scroll position intact,
//   2. a tree row tap toggles and the Save-bar count follows (SCRN-03's live
//      "handed to restic" statement),
//   3. the Save press completes through the flush with the success toast
//      (the D-03 flush path, Phase 5 fresh-DB boot conventions),
//   4. a file-set coverage card (SCRN-04) shows the honest ticked-count line
//      and opens the editor tree,
//   5. desktop-1280 (>=48rem): NO stacked view, NO sticky bar, NO filled
//      full-width trigger on either page — the max-md leakage guard.
//
// Harness honesty — what is mocked and why (the touch-tree.spec.ts
// deviation, Rule 3, reused): the e2e webServer is the real bombvault binary
// over a wiped fresh DB, but the harness has no Docker, so the CONTAINER and
// FILE-SET domains are fulfilled at the Playwright route layer — the SPA,
// its fetches, the binary and every route shape are real; only the container
// and file-set payloads are staged, mirroring the Go JSON shapes
// field-for-field (api.ts). Everything else (settings, SSE progress, the
// save PATCH round-trip) rides the real server; the PATCHes are fulfilled so
// the harness DB stays untouched by a spec. No backup is fired from this
// spec: FLOW-03's trigger is the desktop BackupButton component itself (its
// semantics are pinned by BackupButton.dom.test.tsx), and firing one here
// would need run-recording staging that proves nothing the dom tests and
// run-detail-visibility.spec.ts do not already own.
// ---------------------------------------------------------------------------
import { expect, test, type Page } from "@playwright/test";

// The two device projects from playwright.config.ts. Everything else is a
// desktop project.
const MOBILE_PROJECTS = new Set(["mobile-iphone", "mobile-android"]);

// --- staged container domain (Go JSON shapes, api.ts) ----------------------

const PLEX_SOURCE = "/mnt/user/appdata/plex";

function containerPayload(name: string, installed: boolean) {
  return {
    name,
    image: `local/${name}:latest`,
    state: installed ? "running" : "missing",
    status: installed ? "Up 2 hours" : "-",
    ip: installed ? "172.18.0.5" : "",
    installed,
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
  };
}

function plexContainer() {
  return containerPayload("plex", true);
}

// Enough filler cards to make the phone list deterministically scrollable for
// the scroll-restoration scenario (scenario 1) without growing the DOM by
// hand: the fillers are not installed, so they render as orphan-section cards
// and fetch no mounts.
function fillerContainers(count: number) {
  return Array.from({ length: count }, (_, i) => containerPayload(`svc${String(i + 1).padStart(2, "0")}`, false));
}

const MOUNTS_BODY = {
  ok: true,
  mounts: [
    {
      source: PLEX_SOURCE,
      dest: "/config",
      selected: true, // the served baseline starts CHECKED — the tap in
      // scenario 2 exercises true → false and the count 2 → 1.
      isAppdata: false,
      reachable: true,
    },
    {
      // A SECOND served include, and not fixture decoration (the same reason
      // touch-tree.spec.ts stages two): the D-04 zero-include guard must
      // never be what a tap trips.
      source: "/mnt/user/data",
      dest: "/data",
      selected: true,
      isAppdata: false,
      reachable: true,
    },
  ],
  custom: [],
  excluded: [],
  excludeCaches: {},
  hostMountRoot: "/mnt/user",
  hostSourceRoot: "/mnt",
};

const BROWSE_BODY = {
  ok: true,
  status: "ok",
  truncated: false,
  dirs: [{ name: "library", path: "user/appdata/plex/library" }],
};

/** Route-level staging of the container domain + the boot-look cut
 *  (bootWithoutServerLook's display-prefs abort, so this spec keeps the
 *  harness default English labels regardless of worker order). */
async function stageContainerDomain(page: Page, containers: ReturnType<typeof containerPayload>[]): Promise<void> {
  await page.route("**/api/display-prefs*", (route) => route.abort());
  await page.route("**/api/containers", (route) => route.fulfill({ json: { ok: true, containers } }));
  await page.route("**/api/containers/plex/mounts*", (route) => route.fulfill({ json: MOUNTS_BODY }));
  await page.route("**/api/browse*", (route) => route.fulfill({ json: BROWSE_BODY }));
  // The selection save (FoldersEditor's drain PATCHes /api/containers/plex).
  // Fulfilled so the interaction is fully offline and the wiped harness DB
  // never sees a spec-driven write.
  await page.route("**/api/containers/plex", (route) => route.fulfill({ json: { ok: true } }));
}

// --- staged file-set domain (Go JSON shapes, api.ts) -----------------------

const FILE_SET = {
  id: "a".repeat(32),
  name: "photos",
  path: "data",
  excludes: [],
  enabled: true,
  lastBackup: 0,
  pathExists: true,
  // Two include roots — the coverage card's honest ticked-count line reads
  // exactly this derivation (splitFlatSet over the stored selection).
  selectedPaths: ["data", "data/library"],
};

/** Route-level staging of the file-set domain (same honesty rules as the
 *  container staging above). The LIST endpoint is GET /api/files (api.ts:
 *  listFileSets) — the /api/files/sets/* routes are the per-set writes. */
async function stageFilesDomain(page: Page): Promise<void> {
  await page.route("**/api/display-prefs*", (route) => route.abort());
  await page.route("**/api/files/sets/preset*", (route) => route.fulfill({ json: { ok: true, offered: false } }));
  await page.route("**/api/files", (route) => route.fulfill({ json: { ok: true, fileSets: [FILE_SET] } }));
  // The editor's drain PATCHes /api/files/sets/{id} — fulfilled, same reason
  // as the container PATCH above.
  await page.route(/\/api\/files\/sets\/[^/]+$/, (route) => route.fulfill({ json: { ok: true } }));
}

/** Boot the /containers page in advanced mode (the SAME localStorage key the
 *  Advanced toggle owns — the detail's editor is advanced-gated) and open the
 *  plex card's stacked detail. */
async function openPlexDetail(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem("bombvault.advanced", "1"));
  await page.goto("/containers");
  await page.getByRole("button", { name: /^plex/ }).tap();
  await expect(page.getByRole("button", { name: "plex, Back" })).toBeVisible();
}

/** The ONE tree under test, addressed by ROLE (same discipline as
 *  touch-tree.spec.ts: exactly one tree on the detail / expanded row). */
function backupTree(page: Page) {
  return page.getByRole("tree", { name: "Backup folder selection" });
}

// ---------------------------------------------------------------------------

test("card tap stacks the detail; Back returns with the list scroll intact", async ({ page }, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the stacked detail is the phone contract (D-04)",
  );
  await stageContainerDomain(page, [plexContainer(), ...fillerContainers(13)]);
  await page.goto("/containers");

  const card = page.getByRole("button", { name: /^plex/ });
  await expect(card).toBeVisible();

  // Make the scroll deterministic, then push the scroller down. #bv-main is
  // the scroller (Layout owns it — the same main the page's scroll capture
  // reads); a tall first child guarantees scrollHeight > clientHeight
  // regardless of the cards' natural height (mobile-shell.spec.ts's grow-the-
  // page pattern).
  await page.locator("#bv-main").evaluate((el) => {
    const first = el.firstElementChild as HTMLElement | null;
    if (first) first.style.minHeight = `${el.clientHeight + 900}px`;
    el.scrollTop = 300;
  });
  await expect
    .poll(() => page.locator("#bv-main").evaluate((el) => el.scrollTop))
    .toBe(300);

  // tap() auto-scrolls the target into view BEFORE the click lands, and the
  // open handler captures the position AT the click — so the position the
  // detail must restore is the SETTLED one, read after that auto-scroll. Make
  // it deterministic: center the card in the scroller OURSELVES and assert it
  // is fully on screen, then tap (no auto-scroll can then occur).
  //
  // Why centering and not scrollIntoViewIfNeeded: since 07-06 the mobile list
  // carries a summary line + sticky toolbar ABOVE the cards, so the minimal
  // scrollIntoViewIfNeeded can leave the card's center just above the fold —
  // tap() then re-centers the scroller between the capture below and the
  // click, and the handler (correctly) captures the POST-auto-scroll value,
  // which no longer matches `captured` and the Back-restore assertion fails.
  // Centering guarantees the tap point is on screen BEFORE the capture.
  const mainBox = await page.locator("#bv-main").boundingBox();
  const cardBox = await card.boundingBox();
  expect(mainBox, "the scroller must be laid out to center within it").not.toBeNull();
  expect(cardBox, "the card must be laid out to center it").not.toBeNull();
  const targetScroll = await page.locator("#bv-main").evaluate((el, box) => {
    // Card center in CONTENT coordinates, then place it at the scroller's
    // vertical middle. Clamped into the scrollable range for honesty — the
    // stretched first child below guarantees the range is wide enough.
    const contentCenter = box.y - el.getBoundingClientRect().top + el.scrollTop + box.height / 2;
    const max = el.scrollHeight - el.clientHeight;
    return Math.max(0, Math.min(max, Math.round(contentCenter - el.clientHeight / 2)));
  }, { y: cardBox!.y, height: cardBox!.height });
  await page.locator("#bv-main").evaluate((el, top) => { el.scrollTop = top; }, targetScroll);
  await expect.poll(() => page.locator("#bv-main").evaluate((el) => el.scrollTop)).toBe(targetScroll);
  // The determinism proof: the card is now FULLY inside the scroller, so
  // tap()'s actionability pass has nothing to scroll.
  const settledBox = await card.boundingBox();
  expect(settledBox!.y).toBeGreaterThanOrEqual(mainBox!.y);
  expect(settledBox!.y + settledBox!.height).toBeLessThanOrEqual(mainBox!.y + mainBox!.height);
  const captured = await page.locator("#bv-main").evaluate((el) => el.scrollTop);

  // Open: the list hides (never unmounts — that IS the scroll-preservation
  // mechanism), the detail stacks in.
  await card.tap();
  const back = page.getByRole("button", { name: "plex, Back" });
  await expect(back).toBeVisible();
  // The scroller was captured at open and reset for the detail.
  await expect.poll(() => page.locator("#bv-main").evaluate((el) => el.scrollTop)).toBe(0);

  // Back: the list returns WITH its scroll position.
  await back.tap();
  await expect(page.getByRole("button", { name: "plex, Back" })).toHaveCount(0);
  await expect.poll(() => page.locator("#bv-main").evaluate((el) => el.scrollTop)).toBe(captured);
});

test("tree row tap toggles and the Save-bar count follows", async ({ page }, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the stacked detail is the phone contract (D-04)",
  );
  await stageContainerDomain(page, [plexContainer()]);
  await openPlexDetail(page);

  // The bar's live statement: two ticked folders on the served baseline.
  await expect(page.getByText("2 folders handed to restic")).toBeVisible();

  const row = backupTree(page).getByRole("treeitem", { name: /appdata\/plex/ });
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute("aria-checked", "true");

  // Tap = toggle (the full row is the target, D-01). The count statement is
  // the Save bar's LIVE derivation — it must follow the tick, not a stored
  // number.
  await row.tap();
  await expect(row).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText("1 folders handed to restic")).toBeVisible();
});

test("Save press completes through the flush with the success toast", async ({ page }, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the sticky Save bar is the phone contract (D-03)",
  );
  await stageContainerDomain(page, [plexContainer()]);
  await openPlexDetail(page);

  // Save = FLUSH: the press drains the desktop-identical queue. With no
  // pending edits the flush re-sends the live mirror (zero delta), the
  // PATCH resolves ok, and the drain's own completion toast appears — the
  // same "Saved" the live-save path shows (Phase 5 fresh-DB boot
  // conventions: English labels, toast text asserted verbatim).
  const save = page.getByRole("button", { name: "Save folders" });
  await expect(save).toBeVisible();
  await save.tap();
  await expect(page.getByText("Saved")).toBeVisible();
});

test("coverage card shows the ticked-count line and opens the editor tree", async ({ page }, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the coverage-card list is the phone contract (SCRN-04)",
  );
  await stageFilesDomain(page);
  await page.goto("/files");

  // The coverage card: the honest ticked-count line (the SAME derivation the
  // editor seeds from — two include roots in the fixture).
  const card = page.getByRole("button", { name: /^photos/ });
  await expect(card).toBeVisible();
  await expect(card).toContainText("2 paths");
  // The deselect-floor rule is stated in the list itself (the emptyRule
  // outline card).
  await expect(page.getByText(/at least one folder/)).toBeVisible();

  // Tap = expand: the FULL row renders below the card, editor already open —
  // the same touch tree, same role, one tree on the surface.
  await card.tap();
  await expect(card).toHaveAttribute("aria-expanded", "true");
  await expect(backupTree(page)).toBeVisible();
});

test("desktop-1280: no stacked view, no sticky bar, no filled full-width trigger", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-1280",
    "desktop-only: the >=48rem max-md leakage guard",
  );
  // /containers: today's desktop page — the phone's detail stack, Save bar
  // and full-width Save trigger exist NOWHERE in the DOM.
  await stageContainerDomain(page, [plexContainer()]);
  await page.addInitScript(() => localStorage.setItem("bombvault.advanced", "1"));
  await page.goto("/containers");
  await expect(page.getByRole("button", { name: "plex, Back" })).toHaveCount(0);
  await expect(page.getByText(/folders handed to restic/)).toHaveCount(0);
  // The filled full-width trigger = the mobile Save button's exact signature
  // (Button tone="accent" + caller's w-full); no desktop control carries it.
  await expect(page.locator("button.w-full.bg-accent")).toHaveCount(0);

  // /files: same guard — the coverage cards, the emptyRule card and the Save
  // bar are phone-only.
  await stageFilesDomain(page);
  await page.goto("/files");
  await expect(page.getByText("2 paths")).toHaveCount(0);
  await expect(page.getByText(/at least one folder/)).toHaveCount(0);
  await expect(page.locator("button.w-full.bg-accent")).toHaveCount(0);
});
