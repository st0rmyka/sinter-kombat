import { createRoot } from "react-dom/client";
import { GameView } from "../src/game/GameView";
import { tryInstallAssetPack } from "../src/game/assetPack";
import "../src/styles.css";

const el = document.getElementById("root");
if (!el) throw new Error("root missing");

el.textContent = "Betöltés…";
try {
  await tryInstallAssetPack();
} catch (err) {
  console.error(err);
  el.textContent = "A játékcsomag nem tölthető be.";
  throw err;
}
el.textContent = "";
createRoot(el).render(<GameView />);
