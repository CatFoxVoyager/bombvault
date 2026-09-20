// ---------------------------------------------------------------------------
// test:e2e's build-first step (maintainer #244 round 3, test item T6).
//
// `playwright test` boots the webServer from a PREBUILT binary at the repo
// root (see playwright.config.ts's `binary`): it never builds, so a missing
// or stale bombvault binary died as an opaque "Process from config.webServer
// exited early" — or worse, silently tested yesterday's SPA. CI does not
// have this problem (lint.yml builds the server at the repo root as its own
// step, `go build -o bombvault ./cmd/bombvault`, before running Playwright);
// the local `test:e2e` script now mirrors that step by running THIS script
// first.
//
// The output name duplicates playwright.config.ts's platform math (win32
// boots bombvault.exe, everything else bombvault) because a static
// package.json script cannot pick a per-platform -o argument. Keep the two
// in sync: the config's `binary` is the only consumer of what this builds.
//
// Runs from package.json as `node e2e/ensure-binary.mjs` (cwd = web/), so
// the repo root is one directory up; the build itself runs there, exactly
// like CI's step.
// ---------------------------------------------------------------------------
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const output = process.platform === "win32" ? "bombvault.exe" : "bombvault";

const result = spawnSync("go", ["build", "-o", output, "./cmd/bombvault"], {
  cwd: repoRoot,
  stdio: "inherit",
});

if (result.error?.code === "ENOENT") {
  console.error(
    "test:e2e: `go` was not found on PATH. The Playwright webServer boots the " +
      "compiled Go binary (it serves the embedded SPA and the real API), so " +
      "the server under test must be built first. Install Go 1.25+ and retry."
  );
  process.exit(1);
}

if (result.status !== 0) {
  console.error(
    `test:e2e: building the server under test failed (go build -o ${output} ` +
      "./cmd/bombvault). Fix the build before running the e2e gate; the " +
      "webServer cannot boot without the binary."
  );
  process.exit(result.status ?? 1);
}
