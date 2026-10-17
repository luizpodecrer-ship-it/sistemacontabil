import { unionImportPlugin } from "./scripts/union-import-plugin.mjs";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  esbuild: { jsx: "automatic" },
  plugins: [tailwindcss(), unionImportPlugin()],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
});
