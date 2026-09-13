import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    environment: "node",
    exclude: [...configDefaults.exclude, "tests/e2e/**", "playwright-report/**", "test-results/**"],
    globals: false,
    include: [
      "tests/unit/**/*.{test,spec}.{ts,tsx}",
      "tests/integration/**/*.{test,spec}.{ts,tsx}",
      "{app,components,config,data,domain,lib,repositories,services}/**/*.{test,spec}.{ts,tsx}",
    ],
    mockReset: true,
    passWithNoTests: true,
    reporters: ["default"],
    restoreMocks: true,
  },
});
