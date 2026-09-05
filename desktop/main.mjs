import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, Menu, globalShortcut, shell } from "electron";
import { attachKitchenNet, writeNetInfo } from "./kk-net-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".woff2": "font/woff2",
  ".webp": "image/webp",
};

function safeFile(urlPath) {
  const decoded = decodeURIComponent((urlPath || "/").split("?")[0]);
  const rel = decoded === "/" ? "/index.html" : decoded;
  const abs = path.normalize(path.join(DIST, rel));
  if (!abs.startsWith(DIST)) return null;
  return abs;
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const pathOnly = (req.url || "/").split("?")[0];
        if (pathOnly === "/api/net/info") {
          const addr = server.address();
          const port = addr && typeof addr === "object" ? addr.port : 27111;
          writeNetInfo(res, port);
          return;
        }
        let file = safeFile(req.url || "/");
        if (!file) {
          res.writeHead(403);
          res.end();
          return;
        }
        try {
          const st = await stat(file);
          if (st.isDirectory()) file = path.join(file, "index.html");
        } catch {
          file = path.join(DIST, "index.html");
        }
        const data = await readFile(file);
        const ext = path.extname(file).toLowerCase();
        res.writeHead(200, {
          "content-type": MIME[ext] || "application/octet-stream",
          "cache-control": "no-cache",
        });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end("not found");
      }
    });
    attachKitchenNet(server);
    const tryPort = 27111;
    server.listen(tryPort, "0.0.0.0", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("server bind"));
        return;
      }
      resolve({ server, port: addr.port });
    });
    server.on("error", reject);
  });
}

function buildMenu(win) {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about", label: "Sinter Kombat névjegye" },
              { type: "separator" },
              { role: "hide", label: "Elrejtés" },
              { role: "hideOthers", label: "A többi elrejtése" },
              { role: "unhide", label: "Összes mutatása" },
              { type: "separator" },
              { role: "quit", label: "Kilépés" },
            ],
          },
        ]
      : [
          {
            label: "Fájl",
            submenu: [{ role: "quit", label: "Kilépés" }],
          },
        ]),
    {
      label: "Nézet",
      submenu: [
        {
          label: "Teljes képernyő",
          accelerator: isMac ? "Control+Command+F" : "F11",
          click: () => win.setFullScreen(!win.isFullScreen()),
        },
        { type: "separator" },
        { role: "reload", label: "Újratöltés" },
      ],
    },
    {
      label: "Ablak",
      submenu: [
        { role: "minimize", label: "Kis méret" },
        { role: "close", label: "Bezárás" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  const { port } = await startStaticServer();
  const icon = path.join(__dirname, "icon.ico");
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: "#120c0a",
    title: "Sinter Kombat",
    icon,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.webContents.setVisualZoomLevelLimits(1, 1);
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  buildMenu(win);
  await win.loadURL(`http://127.0.0.1:${port}/`);
  globalShortcut.register("F11", () => {
    if (win.isDestroyed()) return;
    win.setFullScreen(!win.isFullScreen());
  });
}

app.setName("Sinter Kombat");
app.commandLine.appendSwitch("enable-features", "WebHID,GamepadButtonAxisEvents");

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (!w) return;
    if (w.isMinimized()) w.restore();
    w.focus();
  });
  app.whenReady().then(createWindow);
  app.on("window-all-closed", () => app.quit());
  app.on("will-quit", () => globalShortcut.unregisterAll());
}
