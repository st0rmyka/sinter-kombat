import { createRoot } from "react-dom/client";
import { GameView } from "../src/game/GameView";
import "../src/styles.css";

const el = document.getElementById("root");
if (!el) throw new Error("root missing");
createRoot(el).render(<GameView />);
