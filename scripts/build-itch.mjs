/**
 * Itch upload stays under the 1000-file limit.
 * Vite emits loose files, then everything except index.html, favicon.svg and
 * the hashed assets/ folder is stored uncompressed in assets.zip and removed.
 * The game reads that pack at startup. New characters only grow the inner zip.
 *
 *   node scripts/build-itch.mjs
 */
import { spawn } from "node:child_process";
import { readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "release", "itch-html");
const uploadZip = path.join(root, "release", "SinterKombat-itch.zip");
const listFile = path.join(root, "release", "itch-pack-list.txt");

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: root, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function walkRel(dir, base = dir) {
  const files = [];
  for (const name of await readdir(dir)) {
    const abs = path.join(dir, name);
    if ((await stat(abs)).isDirectory()) files.push(...(await walkRel(abs, base)));
    else files.push(path.relative(base, abs).split(path.sep).join("/"));
  }
  return files;
}

async function pruneEmpty(dir) {
  for (const name of await readdir(dir)) {
    const abs = path.join(dir, name);
    if ((await stat(abs)).isDirectory()) await pruneEmpty(abs);
  }
  if (dir !== outDir && (await readdir(dir)).length === 0) await rm(dir, { recursive: true });
}

const KEEP = (rel) => rel === "index.html" || rel === "favicon.svg" || rel === "assets.zip" || rel.startsWith("assets/") || rel.startsWith("__grok/");

await run("npx", ["vite", "build", "--config", "desktop/vite.itch.mjs"]);

const packList = (await walkRel(outDir)).filter((rel) => !KEEP(rel));
await writeFile(listFile, packList.join("\n") + "\n");
await run("python3", ["scripts/store-zip.py", path.join(outDir, "assets.zip"), outDir, listFile]);

for (const rel of packList) await rm(path.join(outDir, rel), { force: true });
await rm(path.join(outDir, "__grok"), { recursive: true, force: true });
await pruneEmpty(outDir);

const outer = await walkRel(outDir);
if (outer.length > 20) {
  console.error(outer);
  throw new Error(`itch folder has ${outer.length} files, expected a handful`);
}
await writeFile(listFile, outer.join("\n") + "\n");
await run("python3", ["scripts/store-zip.py", uploadZip, outDir, listFile]);
await rm(listFile, { force: true });
console.log(`itch files: ${outer.length}`);
console.log(outer.join("\n"));
console.log(`upload: ${uploadZip}`);
