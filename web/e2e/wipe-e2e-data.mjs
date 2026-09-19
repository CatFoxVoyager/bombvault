// ---------------------------------------------------------------------------
// Playwright webServer pre-command — the fresh-DB half of the harness
// guarantee. playwright.config.ts composes `node web/e2e/wipe-e2e-data.mjs &&
// <binary>` so this runs immediately before the binary boots, in the
// webServer's cwd (the repo root).
//
// Why a pre-command and not globalSetup: Playwright starts the webServer
// BEFORE globalSetup runs (the server is a plugin in the global-setup task
// list), so a wipe there would land after the binary has already created and
// opened its SQLite file — an EBUSY failure on Windows, and on POSIX a
// silent no-op where the server keeps writing to the unlinked inode. Before
// the process exists is the only moment the wipe is both possible and
// complete.
//
// Why the wipe at all: .playwright-data/ is gitignored and otherwise never
// cleaned, so the harness DB persisted across runs and the specs' fresh-DB
// assumptions (auth disabled, every domain gate off, bar = Dashboard,
// Recovery, Containers + More, sheet = Settings + the view toggle) silently
// degraded into "fresh only after a manual delete" —
// the narrow-viewport backstop observed a de/fr bv-lang display pref
// surviving on it into later runs.
//
// Fails LOUDLY rather than booting a poisoned DB: a stale bombvault.exe from
// a previous run (the known Windows teardown hang) still holds the SQLite
// file and the delete will fail. Kill it and re-run — see the error below.
// ---------------------------------------------------------------------------
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// web/e2e/ -> repo root: the same root the config's DATA_DIR
// ("./.playwright-data") resolves against via the webServer's cwd.
const dataDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".playwright-data");

// The PIDs of any running BombVault binary, resolved by the OS. tasklist
// needs no admin (CSV rows: "bombvault.exe","pid",...); pgrep exits non-zero
// on no match, which is the same "none running" as an empty list.
function bombvaultPids() {
  try {
    if (process.platform === "win32") {
      const out = execFileSync("tasklist", ["/FI", "IMAGENAME eq bombvault.exe", "/FO", "CSV", "/NH"], {
        encoding: "utf8",
      });
      return [...out.matchAll(/^"bombvault\.exe","(\d+)"/gm)].map((m) => Number(m[1]));
    }
    const out = execFileSync("pgrep", ["-f", "bombvault"], { encoding: "utf8" });
    return out
      .split("\n")
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
}

try {
  rmSync(dataDir, { recursive: true, force: true });
} catch (err) {
  const pids = bombvaultPids();
  const who = pids.length > 0 ? `PID(s) ${pids.join(", ")}` : "a process you can find by name";
  console.error(
    `[wipe-e2e-data] could not remove ${dataDir} — a previous run's ` +
      "bombvault is probably still holding it (the known Windows teardown " +
      `hang). Kill ${who} BY PID and re-run. Never kill by image name: ` +
      "an image-name kill takes down a real BombVault instance of yours just " +
      'as happily as the stale harness one. Windows: "taskkill /PID <pid> /F"; ' +
      `POSIX: "kill <pid>". Cause: ${err}`,
  );
  process.exit(1);
}
