import base from "./playwright.config";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  ...base,
  testMatch: "**/direct-cloud.spec.ts",
  testIgnore: [],
  use: { ...base.use, baseURL: "http://127.0.0.1:5176" },
  webServer: {
    command: "node scripts/test-direct-cloud.mjs",
    url: "http://127.0.0.1:5176",
    reuseExistingServer: false,
  },
});
