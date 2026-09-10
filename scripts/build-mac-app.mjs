#!/usr/bin/env node
import { spawn } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  lstatSync,
  readlinkSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ELECTRON_VER = "37.3.1";
const OUT_DIR = path.join(tmpdir(), "Sinter-Kombat-macOS");
const ZIP_PATH = path.join(root, "release", "Sinter-Kombat-macOS-arm64.zip");
const CACHE = path.join(tmpdir(), "kk-electron");

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", ...opts });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} -> ${code}`))));
  });
}

async function download(url, dest) {
  if (existsSync(dest)) return;
  mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`download ${url} ${res.status}`);
  await pipeline(res.body, createWriteStream(dest));
}

function writeIcns() {}

async function zipDir(srcDir, zipPath, topName) {
  await run("python3", [
    "-c",
    String.raw`
import os, stat, sys, zipfile
from pathlib import Path
src, dest, top = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
if dest.exists(): dest.unlink()

def add(zf, path, arc):
    if path.is_symlink():
        zi = zipfile.ZipInfo(arc)
        zi.create_system = 3
        zi.external_attr = (stat.S_IFLNK | 0o755) << 16
        zf.writestr(zi, os.readlink(path))
        return
    if path.is_dir():
        for child in sorted(path.iterdir(), key=lambda p: p.name):
            add(zf, child, f"{arc}/{child.name}")
        return
    mode = path.stat().st_mode
    zi = zipfile.ZipInfo.from_file(path, arc)
    zi.create_system = 3
    zi.external_attr = (mode & 0xFFFF) << 16
    with path.open("rb") as f:
        zf.writestr(zi, f.read(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=6)

with zipfile.ZipFile(dest, "w", allowZip64=True) as zf:
    add(zf, src, top)
print("zip", dest, dest.stat().st_size)
`,
    srcDir,
    zipPath,
    topName,
  ]);
}

function patchPlist(plistPath, { name, ident }) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDisplayName</key>
	<string>${name}</string>
	<key>CFBundleExecutable</key>
	<string>Electron</string>
	<key>CFBundleIconFile</key>
	<string>electron.icns</string>
	<key>CFBundleIdentifier</key>
	<string>${ident}</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>${name}</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>0.24</string>
	<key>CFBundleVersion</key>
	<string>0.24</string>
	<key>LSApplicationCategoryType</key>
	<string>public.app-category.games</string>
	<key>LSMinimumSystemVersion</key>
	<string>11.0</string>
	<key>NSHighResolutionCapable</key>
	<true/>
	<key>NSPrincipalClass</key>
	<string>AtomApplication</string>
	<key>NSSupportsAutomaticGraphicsSwitching</key>
	<true/>
</dict>
</plist>
`;
  writeFileSync(plistPath, xml);
}

async function assemble(arch, label, icnsPath) {
  const zipName = `electron-v${ELECTRON_VER}-darwin-${arch}.zip`;
  const zipPath = path.join(CACHE, zipName);
  const url = `https://github.com/electron/electron/releases/download/v${ELECTRON_VER}/${zipName}`;
  console.log(`downloading ${zipName}...`);
  await download(url, zipPath);
  const unpack = path.join(CACHE, `unpack-${arch}`);
  const srcApp = path.join(unpack, "Electron.app");
  if (!existsSync(srcApp)) {
    mkdirSync(unpack, { recursive: true });
    await run("unzip", ["-q", zipPath, "-d", unpack]);
  }
  if (!existsSync(srcApp)) throw new Error(`Electron.app missing in ${unpack}`);
  const destFolder = path.join(OUT_DIR, label);
  const destApp = path.join(destFolder, "Sinter Kombat.app");
  rmSync(destFolder, { recursive: true, force: true });
  mkdirSync(destFolder, { recursive: true });
  await run("cp", ["-a", srcApp, destApp]);
  const res = path.join(destApp, "Contents", "Resources");
  const appDir = path.join(res, "app");
  mkdirSync(appDir, { recursive: true });
  copyFileSync(path.join(root, "desktop", "package.json"), path.join(appDir, "package.json"));
  copyFileSync(path.join(root, "desktop", "main.mjs"), path.join(appDir, "main.mjs"));
  copyFileSync(path.join(root, "desktop", "kk-net-server.mjs"), path.join(appDir, "kk-net-server.mjs"));
  cpSync(path.join(root, "desktop", "dist"), path.join(appDir, "dist"), { recursive: true });
  copyFileSync(icnsPath, path.join(res, "electron.icns"));
  patchPlist(path.join(destApp, "Contents", "Info.plist"), {
    name: "Sinter Kombat",
    ident: "hu.sinterkombat.app",
  });
  rmSync(path.join(res, "default_app.asar"), { force: true });
  console.log(`built ${destApp}`);
}

const README = `Sinter Kombat — macOS (Apple Silicon)
=====================================

Nyisd meg:  Sinter Kombat.app

Ha a macOS azt írja, hogy sérült / nem ellenőrizhető:
  1. jobb klikk a Sinter Kombat.app-on → Megnyitás
  2. vagy a Terminálban:
     xattr -cr "Sinter Kombat.app"

Teljes képernyő: Control + Command + F
Kilépés: Command + Q
`;

async function main() {
  mkdirSync(CACHE, { recursive: true });
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  console.log("vite desktop build...");
  await run("npx", ["vite", "build", "--config", "vite.desktop.config.ts"], { cwd: root });
  const icnsPath = path.join(CACHE, "kitchen.icns");
  if (!existsSync(icnsPath)) {
    await run("python3", [path.join(root, "scripts", "make-mac-icon.py"), icnsPath]);
  }
  await assemble("arm64", "Apple Silicon", icnsPath);
  writeFileSync(path.join(OUT_DIR, "Apple Silicon", "OLVASSEL.txt"), README);
  rmSync(ZIP_PATH, { force: true });
  mkdirSync(path.dirname(ZIP_PATH), { recursive: true });
  console.log("zipping...");
  await zipDir(path.join(OUT_DIR, "Apple Silicon"), ZIP_PATH, "Sinter-Kombat-macOS");
  const tarPath = path.join(root, "release", "Sinter-Kombat-macOS-arm64.tar.gz");
  rmSync(tarPath, { force: true });
  await run("tar", ["-czf", tarPath, "-C", path.join(OUT_DIR, "Apple Silicon"), "Sinter Kombat.app", "OLVASSEL.txt"]);
  console.log(`done ${ZIP_PATH}`);
  console.log(`done ${tarPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
