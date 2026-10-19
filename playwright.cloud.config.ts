import base from "./playwright.config";
import { defineConfig } from "@playwright/test";

// A separate dev server exercises the real cloud login against intercepted test RPCs.
export default defineConfig({
  ...base,
  testMatch: "**/cloud-auth.spec.ts",
  testIgnore: [],
  use: { ...base.use, baseURL: "http://127.0.0.1:5175" },
  webServer: {
    command: "npm run dev -- --port 5175 --strictPort",
    url: "http://127.0.0.1:5175",
    reuseExistingServer: false,
    env: {
      // Exercise copied configuration with incidental whitespace/trailing slash.
      VITE_SUPABASE_URL: " https://nexopen-auth-test.supabase.co/ ",
      VITE_SUPABASE_PUBLISHABLE_KEY: " sb_publishable_test_only ",
    },
  },
});
