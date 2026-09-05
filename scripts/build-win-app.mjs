#!/usr/bin/env node
import { spawn } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ELECTRON_VER = "37.3.1";
const OUT_DIR = path.join(tmpdir(), "Sinter-Kombat-Windows");
const ZIP_PATH = path.join(root, "Sinter-Kombat-Windows.zip");
const CACHE = path.join(tmpdir(), "sk-electron-win");

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", ...opts });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} -> ${code}`))));
  });
}

async function download(url, dest) {
  if (existsSync(dest) && (await import("node:fs")).statSync(dest).size > 1_000_000) {
    console.log("cached", dest);
    return;
  }
  mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.part`;
  console.log("downloading", url);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`download ${url} ${res.status}`);
  await pipeline(res.body, createWriteStream(tmp));
  renameSync(tmp, dest);
}

async function zipDir(srcDir, zipPath, topName) {
  const py = [
    "import sys, zipfile",
    "from pathlib import Path",
    "src, dest, top = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]",
    "if dest.exists(): dest.unlink()",
    "with zipfile.ZipFile(dest, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as zf:",
    "    for path in sorted(src.rglob('*')):",
    "        if path.is_dir():",
    "            continue",
    "        arc = f\"{top}/{path.relative_to(src).as_posix()}\"",
    "        zf.write(path, arc)",
    "print('zip', dest, dest.stat().st_size)",
  ].join("\n");
  await run("python3", ["-c", py, srcDir, zipPath, topName]);
}

const README = `Sinter Kombat — Windows
=======================

Futtatás
  1. Csomagold ki a zipet egy mappába (ne a zipből indítsd).
  2. Dupla klikk:  SinterKombat.exe

Ha a Windows SmartScreen figyelmeztet:
  További információ  →  Futtatás mindenképp
  (a játék nincs kódaláírva, ezért jelenik meg)

Teljes képernyő: F11
Kilépés: Alt+F4

Irányítás
  Billentyű: A/D séta, W ugrás, J/K ütés, N/M rúgás, L / ; special, Shift block
  DualSense: USB vagy Bluetooth
    Háromszög bal ütés, Négyzet jobb ütés, Kör jobb rúgás, X bal rúgás
    R2 block, L1 / R1 specialok

Online: ugyanazon a Wi-Fi-n a Host gép IP-jét add meg a Join játékosnak.
`;

async function main() {
  mkdirSync(CACHE, { recursive: true });
  console.log("vite desktop build...");
  await run("npx", ["vite", "build", "--config", "vite.desktop.config.ts"], { cwd: root });

  const icoPath = path.join(root, "desktop", "icon.ico");
  const icoPy = [
    "from PIL import Image",
    "from pathlib import Path",
    "src = Path('/workspace/public/og.jpg')",
    "im = Image.open(src).convert('RGBA')",
    "w, h = im.size",
    "side = min(w, h)",
    "left = (w - side) // 2",
    "top = max(0, (h - side) // 2 - 40)",
    "img = im.crop((left, top, left + side, top + side))",
    "sizes = [16, 32, 48, 64, 128, 256]",
    "frames = [img.resize((s, s), Image.Resampling.LANCZOS) for s in sizes]",
    "out = Path('/workspace/desktop/icon.ico')",
    "frames[-1].save(out, format='ICO', sizes=[(s, s) for s in sizes])",
    "print('ico', out, out.stat().st_size)",
  ].join("\n");
  await run("python3", ["-c", icoPy]);

  const zipName = `electron-v${ELECTRON_VER}-win32-x64.zip`;
  const zipPath = path.join(CACHE, zipName);
  const url = `https://github.com/electron/electron/releases/download/v${ELECTRON_VER}/${zipName}`;
  await download(url, zipPath);

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  console.log("unpacking electron...");
  await run("unzip", ["-q", "-o", zipPath, "-d", OUT_DIR]);

  const exeSrc = path.join(OUT_DIR, "electron.exe");
  const exeDst = path.join(OUT_DIR, "SinterKombat.exe");
  if (!existsSync(exeSrc)) throw new Error("electron.exe missing");
  renameSync(exeSrc, exeDst);

  const appDir = path.join(OUT_DIR, "resources", "app");
  mkdirSync(appDir, { recursive: true });
  copyFileSync(path.join(root, "desktop", "package.json"), path.join(appDir, "package.json"));
  copyFileSync(path.join(root, "desktop", "main.mjs"), path.join(appDir, "main.mjs"));
  copyFileSync(path.join(root, "desktop", "kk-net-server.mjs"), path.join(appDir, "kk-net-server.mjs"));
  copyFileSync(icoPath, path.join(appDir, "icon.ico"));
  cpSync(path.join(root, "desktop", "dist"), path.join(appDir, "dist"), { recursive: true });
  rmSync(path.join(OUT_DIR, "resources", "default_app.asar"), { force: true });
  writeFileSync(path.join(OUT_DIR, "OLVASSEL.txt"), README.replaceAll("\n", "\r\n"));

  rmSync(ZIP_PATH, { force: true });
  console.log("zipping...");
  await zipDir(OUT_DIR, ZIP_PATH, "Sinter-Kombat-Windows");
  console.log(`done ${ZIP_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
