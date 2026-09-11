import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default defineConfig({
  root: path.join(root, "desktop"),
  base: "./",
  publicDir: path.join(root, "public"),
  plugins: [react(), tailwindcss()],
  build: {
    outDir: path.join(root, "release", "itch-v0.28"),
    emptyOutDir: true,
    assetsDir: "assets",
    sourcemap: false,
  },
});
