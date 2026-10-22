import { createRoot } from "react-dom/client";
import { GameView } from "../src/game/GameView";
import { tryInstallAssetPack } from "../src/game/assetPack";
import "../src/styles.css";

const el = document.getElementById("root");
if (!el) throw new Error("root missing");

el.textContent = "Betöltés… 0 MB";
el.style.cssText = "color:#f2e6c8;background:#120c0a;height:100%;display:flex;align-items:center;justify-content:center;font:700 28px sans-serif;text-align:center;padding:24px;";
try {
  await tryInstallAssetPack((bytes) => {
    el.textContent = `Betöltés… ${Math.max(1, Math.round(bytes / 1e6))} MB`;
  });
} catch (err) {
  console.error(err);
  el.textContent = `A játékcsomag nem tölthető be. ${err instanceof Error ? err.message : ""}`;
  throw err;
}
el.textContent = "";
createRoot(el).render(<GameView />);
