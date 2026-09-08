import { resolve } from "node:path";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: resolve("desktop"),
  publicDir: resolve("public"),
  plugins: [tailwindcss(), viteReact()],
  resolve: { tsconfigPaths: true },
  base: "./",
  server: {
    fs: { allow: [resolve(".")] },
  },
  build: {
    outDir: resolve("desktop/dist"),
    emptyOutDir: true,
    assetsDir: "assets",
  },
});
