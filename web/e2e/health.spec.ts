// ---------------------------------------------------------------------------
// Health smoke — the whole webServer boot path, proven on every project.
//
// Each of the four projects starts the compiled Go binary from scratch (fresh
// gitignored DATA_DIR), waits for /api/health to answer, then this spec
// asserts the same endpoint the CI Docker boot smoke polls
// (.github/workflows/build.yml "Run container + health check"). It doubles as
// Playwright's no-tests-found guard: an e2e suite with zero specs fails the
// run, and this spec guarantees there is always at least one green test
// behind the boot itself.
// ---------------------------------------------------------------------------
import { expect, test } from "@playwright/test";

test("server under test answers /api/health", async ({ page }) => {
  const response = await page.request.get("/api/health");
  expect(response.ok()).toBe(true);
});
