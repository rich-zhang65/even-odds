import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Deliberately broader than the tests/ convention: a test file that lands
    // outside one should still run rather than be silently skipped.
    include: ["{apps,packages}/**/*.test.{ts,tsx}"],
  },
});
