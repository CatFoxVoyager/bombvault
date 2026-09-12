// ---------------------------------------------------------------------------
// Health smoke — the whole webServer boot path, proven on every project.
//
// ONE boot per RUN, shared by all four projects: Playwright starts a single
// webServer and the projects take turns against it (the binary does not boot
// per project). The boot is always from scratch — reuseExistingServer is
// false, so an occupied port fails the run loudly instead of silently
// testing against whatever already listens on 3000 — and the webServer's
// pre-command wipes the gitignored DATA_DIR before the binary starts, so
// every run gets a fresh empty-state DB. /api/health is the readiness poll
// the webServer itself waits on; this spec asserts the same endpoint the CI
// Docker boot smoke polls (.github/workflows/build.yml "Run container +
// health check"). It doubles as Playwright's no-tests-found guard: an e2e
// suite with zero specs fails the run, and this spec guarantees there is
// always at least one green test behind the boot itself.
// ---------------------------------------------------------------------------
import { expect, test } from "@playwright/test";

test("server under test answers /api/health", async ({ page }) => {
  const response = await page.request.get("/api/health");
  expect(response.ok()).toBe(true);
});
