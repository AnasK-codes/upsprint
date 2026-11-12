import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/globalSetup.ts"],
    setupFiles: ["tests/setupEnv.ts"],
    // All test files share one Postgres container, so run them one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    // First run pulls the postgres image and runs every migration.
    hookTimeout: 180_000,
  },
});
