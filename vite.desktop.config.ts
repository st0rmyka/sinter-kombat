import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(root, "desktop"),
  plugins: [tailwindcss(), viteReact()],
  resolve: {
    alias: { "@": resolve(root, "src") },
  },
  base: "./",
  publicDir: resolve(root, "public"),
  build: {
    outDir: resolve(root, "desktop/dist"),
    emptyOutDir: true,
  },
});
