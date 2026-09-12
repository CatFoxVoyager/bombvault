// ---------------------------------------------------------------------------
// Playwright harness — the VERIFY-01 responsive-regression gate.
//
// Why the compiled Go binary and not `vite preview` or MSW: the binary serves
// the embedded SPA AND the real API (web/embed.go), `vite preview` serves zero
// API, and MSW would be a new runtime dependency — forbidden by the milestone
// constraint (no new runtime deps; the exact-pinned @playwright/test
// devDependency is the single sanctioned addition, so Renovate moves the npm
// package and the browser binaries in one lockstep commit).
//
// Browser engines: Chromium + WebKit. Safari is half this milestone's mobile
// audience; headless WebKit catches layout divergence early.
//
// Server readiness follows the CI Docker boot smoke precedent
// (.github/workflows/build.yml "Run container + health check"): fresh APP_KEY,
// HTTP_ONLY=true, poll /api/health until it answers — but via webServer.url
// polling, not hand-rolled shell loops.
//
// Auth: a fresh DATA_DIR database ships with auth DISABLED
// (auth_password_hash empty — internal/store/settings.go), so specs assert
// chrome/layout only. No login bypass, no seeded password, no auto-login
// helper: the harness relies on exactly the default a fresh instance has
// (T-05-02). HTTP_ONLY=true replaces any TLS-bypass flag — plain HTTP, nothing
// to ignore (T-05-04); nothing TLS-related leaks into app code.
// ---------------------------------------------------------------------------
import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Repo root — where `go build ./cmd/bombvault` lands the binary. Node-24-safe
// URL math, no import.meta.dirname dependency.
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
// Absolute path on purpose: webServer.command runs inside `cwd` below, so a
// "../bombvault"-style relative path would climb OUT of the repo. Absolute
// makes the resolution unambiguous regardless of shell semantics.
const binary = join(repoRoot, process.platform === "win32" ? "bombvault.exe" : "bombvault");
// The webServer command is a wipe-then-boot pipeline, and the wipe has to run
// HERE rather than in globalSetup: Playwright starts the webServer BEFORE
// globalSetup (the server is a plugin in the global-setup task list), so a
// globalSetup-based wipe would land after the binary has already booted and
// opened its SQLite file. The pre-command is the only hook that runs before
// the process exists — which is what makes the "fresh empty-state DB per
// run" guarantee below true rather than aspirational. `&&` keeps it strict:
// a failed wipe (a stale bombvault.exe still holding the DB — the known
// Windows teardown hang) aborts the run instead of booting a poisoned DB.
// Runs through the shell on every platform (Playwright launches `command`
// with shell: true). The node interpreter is spliced in ABSOLUTELY
// (process.execPath — the exact binary running Playwright, JSON-quoted)
// rather than relied on from PATH: spawned shells on Windows can lack `node`
// on PATH (the same reason this repo never relies on npm/npx shims in
// spawned shells — observed live: "'node' n'est pas reconnu").
const node = JSON.stringify(process.execPath);
const command = `${node} web/e2e/wipe-e2e-data.mjs && "${binary}"`;

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:3000",
  },
  webServer: {
    command,
    cwd: repoRoot,
    url: "http://127.0.0.1:3000/api/health",
    timeout: 120_000,
    // NEVER reuse whatever already listens on 127.0.0.1:3000: a running dev
    // BombVault (real settings, enabled domains, a password) would silently
    // take the run's place — APP_KEY/DATA_DIR/HTTP_ONLY below would NOT be
    // applied, and every fresh-DB assertion (auth off, bar = 4 slots, sheet
    // = Recovery-only, sign-out absent) would be evaluated against foreign
    // state. A loud "URL is already used" failure beats a green run against
    // the wrong server: kill the holder and re-run. (Reuse would ALSO skip
    // `command` entirely, silently dropping the fresh-DB wipe — one more
    // reason reuse and this harness do not mix.)
    reuseExistingServer: false,
    env: {
      // Dev-only throwaway constant: 64 lowercase zeros satisfy config.go's
      // [0-9a-f]{64} APP_KEY check. NEVER a real secret; the data dir it
      // unlocks is gitignored scratch.
      APP_KEY: "0".repeat(64),
      // Fresh empty-state DB per RUN — not per project: Playwright starts
      // ONE webServer per run and all four projects share it. The dir is
      // wiped by the pre-command before every boot (see `command`);
      // writability is the ONLY fail-fast boot check
      // (cmd/bombvault/main.go ensureDataDirWritable).
      DATA_DIR: "./.playwright-data",
      // Plain HTTP instead of any TLS-bypass flag (T-05-04).
      HTTP_ONLY: "true",
      PORT: "3000",
    },
  },
  projects: [
    {
      name: "desktop-1280",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
    },
    {
      // 768 wide = the 48rem breakpoint boundary the mobile shell switches at.
      name: "desktop-768",
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 900 } },
    },
    {
      // iPhone 13 descriptor: WebKit, 390×844, isMobile + hasTouch.
      name: "mobile-iphone",
      use: devices["iPhone 13"],
    },
    {
      // Pixel 5 descriptor (Chromium) with the viewport dropped to 360×800 so
      // the narrowest supported width is exercised; only the viewport key is
      // overridden — isMobile/hasTouch/deviceScaleFactor survive the spread.
      name: "mobile-android",
      use: { ...devices["Pixel 5"], viewport: { width: 360, height: 800 } },
    },
  ],
});
