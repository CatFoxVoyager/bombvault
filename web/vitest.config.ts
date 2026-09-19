// Tests run in the node environment by default. A test that needs a real DOM
// opts into jsdom with a `// @vitest-environment jsdom` docblock at the top of
// its file. Test files are excluded from the tsc program (tsconfig.json) and
// transpiled by esbuild for the run.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Guarded desktop-default matchMedia stub (jsdom has none, and
    // lib/useMediaQuery.ts subscribes during the Layout render). It is
    // guarded for node-env suites and must land in the same change as
    // useMediaQuery — see src/lib/testSetup/matchMedia.ts's header for the
    // guard, the desktop default, and the coupling.
    setupFiles: ["src/lib/testSetup/matchMedia.ts"],
  },
});
