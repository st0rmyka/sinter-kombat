/**
 * Itch counts one file per zip entry and also rejects any single file over 200 MB.
 * Vite emits loose files, then everything except index.html, favicon.svg and
 * the hashed assets/ folder is stored uncompressed in assets.zip, assets2.zip, …
 * each kept under 185 MB. The game reads those packs at startup.
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

const KEEP = (rel) => rel === "index.html" || rel === "favicon.svg" || /^assets\d*\.zip$/.test(rel) || rel.startsWith("assets/") || rel.startsWith("__grok/");
const PACK_LIMIT = 185 * 1024 * 1024;

await run("npx", ["vite", "build", "--config", "desktop/vite.itch.mjs"]);

const packList = (await walkRel(outDir)).filter((rel) => !KEEP(rel));
const packs = [];
let cur = [];
let curSize = 0;
for (const rel of packList) {
  const bytes = (await stat(path.join(outDir, rel))).size;
  if (bytes > PACK_LIMIT) throw new Error(`${rel} is ${bytes} bytes, over the itch per-file limit`);
  const need = bytes + 120 + rel.length * 2;
  if (cur.length && curSize + need > PACK_LIMIT) {
    packs.push(cur);
    cur = [];
    curSize = 0;
  }
  cur.push(rel);
  curSize += need;
}
if (cur.length) packs.push(cur);

for (let i = 0; i < packs.length; i++) {
  const zipName = i === 0 ? "assets.zip" : `assets${i + 1}.zip`;
  const partList = path.join(root, "release", `itch-pack-${i}.txt`);
  await writeFile(partList, packs[i].join("\n") + "\n");
  await run("python3", ["scripts/store-zip.py", path.join(outDir, zipName), outDir, partList]);
  await rm(partList, { force: true });
}

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
