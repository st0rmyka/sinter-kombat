import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { CHARACTERS, CHAR_IDS, CHAR_SKILLS, DIFFICULTIES, difficultyLabel, GAME_VERSION, STAGE_IDS, STAGES, VICTORY_ART, winLine, KitchenKombat, type CharId, type Difficulty, type Hud, type StageId, type TrainPress } from "./engine";
import { installInput, pressVirtual, releaseVirtual, sampleMenu, sampleP1, sampleP2, getPadCount } from "./input";
import { isMuted, setMuted, sfxPlay, startMenuMusic, startKitchenDrone, stopKitchenDrone, stopStageMusic, unlockAudio, applyMix, primeAudio, isAudioPrimed } from "./audio";
import { getSettings, patchSettings, subscribeSettings, type GameSettings, type PadBtnId, PAD_BTNS, patchPadBtn, resetPadLayout } from "./settings";
import { NetPlay, fetchNetInfo, joinWsUrl } from "./net";

const PATCH_NOTES: { v: string; items: string[] }[] = [
  {
    v: "v0.19",
    items: [
      "Új főmenü háttérkép",
      "Új menüzene",
      "Endgame: győztes karakter Victory képe a pálya fölött, menü jobbra",
      "Új pálya: Golgota, saját zene",
      "Új pálya: Népszínház utca, saját zene",
      "Super Dash saját hangeffekt",
      "Konyha pálya átmenetileg nem választható",
      "Sintertanya pálya új neve: Duranda",
      "Hit/blokk: a védekező is kap egy kis energiát (Super Dash meneküléshez)",
      "Endgame: a győztes karakter tauntja",
    ],
  },
  {
    v: "v0.185",
    items: [
      "CPU védekezés közben is támad, Jézus CPU használja a specialjait",
      "Azonos támadás spammelése: −10% sebzés, 35%-ig",
      "Életerő és energia sáv: aktuális/max számokkal",
    ],
  },
  {
    v: "v0.18",
    items: [
      "Új pálya: Kisterenye, saját zene",
      "Sintertanya saját háttérzene",
      "Dühroham: periódikus sebzés Hofferre megy, nem az ellenfélre",
      "Hoffer Józsi: dühroham vörös overlay, GYERE IDE! sprite buborék nélkül",
      "VS képernyő: Hoffer portréja fej-fókuszú",
    ],
  },
  {
    v: "v0.175",
    items: [
      "Hoffer Józsi harci hangok; special hangok nem szakíthatók meg",
      "Super Dash: arany overlay minden karakteren a hatóidő alatt",
    ],
  },
  {
    v: "v0.17",
    items: [
      "Új karakter: Hoffer Józsi",
      "L1 Dühroham: +30% mozgás/támadás, +25% sebzés, vörös tónus",
      "R1 GYERE IDE!: 3 mp irányításvesztés, az ellenfél Hofferhez sétál",
    ],
  },
  {
    v: "v0.16",
    items: [
      "Super Dash (L2): gyorsabb, messzebb, sérthetetlen, átmegy az ellenfélen",
      "Energia metert használ, sárga villogó effekt",
    ],
  },
  {
    v: "v0.155",
    items: [
      "Gyakorló szünet: Karakterválasztás, végtelen energia",
      "Beállítások: hang, HUD, virtuális kontroller",
      "Kilépés a játékból",
      "Lázár János átmenetileg nem elérhető, a karaktert reworkolni kell.",
    ],
  },
  {
    v: "v0.15",
    items: [
      "Gyakorló mód a főmenüben",
      "Végtelen köridő, szünet: dummy / CPU / P2",
      "Input kijelző gyakorlásban",
    ],
  },
  {
    v: "v0.14",
    items: [
      "Új karakter: Lázár János (WC kefe)",
      "L1 Kefe forgószél + tornádó effekt",
      "R1 Kefe dobás projectile",
    ],
  },
  {
    v: "v0.13",
    items: [
      "Új max CPU: SZOPNI FOGSZ",
      "Könnyű / Normál / Hard finomhangolva",
      "Köridő szürke kör HUD-dal",
      "Verziószám a bal alsó sarokban",
    ],
  },
  {
    v: "v0.12",
    items: ["CPU agresszió csökkentve Könnyűn és Normálon"],
  },
  {
    v: "v0.11",
    items: ["CPU blokk, kombó, jump-in, anti-air javítva"],
  },
  {
    v: "Korábbi",
    items: [
      "Jézus: Fényoszlop + Szent Aura",
      "Cigányricsi, Vámpír Ági, Cica",
      "Magyar announcer, menüzene, loading",
      "Sinter Kombat menü + Sintertanya pálya",
      "Visszavágó, mobil landscape, 45 mp-es kör",
    ],
  },
];

function nudgeSetting(i: number, dir: number) {
  const s = getSettings();
  const step = 0.05;
  if (i === 0) patchSettings({ soundOn: !s.soundOn });
  else if (i === 1) patchSettings({ sfx: s.sfx + dir * step });
  else if (i === 2) patchSettings({ music: s.music + dir * step });
  else if (i === 3) patchSettings({ announcer: s.announcer + dir * step });
  else if (i === 4) patchSettings({ hud: s.hud + dir * 0.05 });
  else if (i === 5) patchSettings({ touch: s.touch + dir * 0.05 });
  else if (i === 6) patchSettings({ touchAlpha: s.touchAlpha + dir * 0.05 });
  applyMix();
}

const emptyHud = (): Hud => ({
  screen: "title",
  p1: "renike",
  p2: "ricsi",
  hp1: 170,
  hp2: 170,
  meter1: 0,
  meter2: 0,
  wins1: 0,
  wins2: 0,
  timer: 99,
  round: 1,
  callout: null,
  combo: 0,
  comboSide: 0,
  comboName: null,
  finish: false,
  winner: null,
  fatality: null,
  versusCpu: true,
  difficulty: "normal",
  selectSlot: 1,
  loading: true,
  pads: 0,
  stage: "sintertanya",
  netWait: false,
  loadPct: 0,
  training: false,
  dummy: "idle",
  trainMeter: false,
  p1Hist: [],
  p2Hist: [],
});

export function GameView() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<KitchenKombat | null>(null);
  const [hud, setHud] = useState<Hud>(emptyHud);
  const [muted, setMutedUi] = useState(false);
  const [help, setHelp] = useState(false);
  const [updates, setUpdates] = useState(false);
  const [settings, setSettings] = useState(false);
  const [padEdit, setPadEdit] = useState(false);
  const [padSel, setPadSel] = useState<PadBtnId>("l2");
  const [setIdx, setSetIdx] = useState(0);
  const [opt, setOpt] = useState<GameSettings>(getSettings);
  const [exited, setExited] = useState(false);
  const [patchIdx, setPatchIdx] = useState(0);
  const [diff, setDiff] = useState<Difficulty>("normal");
  const [menu, setMenu] = useState<"root" | "diff">("root");
  const [titleIdx, setTitleIdx] = useState(0);
  const [resultIdx, setResultIdx] = useState(0);
  const [pauseIdx, setPauseIdx] = useState(0);
  const [confirm, setConfirm] = useState<{ q: string; yes: () => void } | null>(null);
  const [confirmChoice, setConfirmChoice] = useState<0 | 1>(0);
  const [p1Cur, setP1Cur] = useState<CharId>("renike");
  const [p2Cur, setP2Cur] = useState<CharId>("ricsi");
  const [p1Lock, setP1Lock] = useState(false);
  const [p2Lock, setP2Lock] = useState(false);
  const [touchPick, setTouchPick] = useState<{ slot: 1 | 2; id: CharId } | null>(null);
  const [stageCur, setStageCur] = useState<StageId>("sintertanya");
  const [joinAddr, setJoinAddr] = useState("127.0.0.1");
  const [hostIps, setHostIps] = useState<string[]>([]);
  const [hostPort, setHostPort] = useState(8080);
  const [netErr, setNetErr] = useState<string | null>(null);
  const [lobbyTick, setLobbyTick] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const netRef = useRef(new NetPlay());
  const hudRef = useRef(hud);
  hudRef.current = hud;
  const helpRef = useRef(help);
  helpRef.current = help;
  const updatesRef = useRef(updates);
  updatesRef.current = updates;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const padEditRef = useRef(padEdit);
  padEditRef.current = padEdit;
  const padSelRef = useRef(padSel);
  padSelRef.current = padSel;
  const setIdxRef = useRef(setIdx);
  setIdxRef.current = setIdx;
  const patchIdxRef = useRef(patchIdx);
  patchIdxRef.current = patchIdx;
  const diffRef = useRef(diff);
  diffRef.current = diff;
  const menuRef = useRef(menu);
  menuRef.current = menu;
  const titleIdxRef = useRef(titleIdx);
  titleIdxRef.current = titleIdx;
  const resultIdxRef = useRef(resultIdx);
  resultIdxRef.current = resultIdx;
  const pauseIdxRef = useRef(pauseIdx);
  pauseIdxRef.current = pauseIdx;
  const confirmRef = useRef(confirm);
  confirmRef.current = confirm;
  const confirmChoiceRef = useRef(confirmChoice);
  confirmChoiceRef.current = confirmChoice;
  const p1CurRef = useRef(p1Cur);
  p1CurRef.current = p1Cur;
  const p2CurRef = useRef(p2Cur);
  p2CurRef.current = p2Cur;
  const p1LockRef = useRef(p1Lock);
  p1LockRef.current = p1Lock;
  const p2LockRef = useRef(p2Lock);
  p2LockRef.current = p2Lock;
  const stageCurRef = useRef(stageCur);
  stageCurRef.current = stageCur;
  const titleStung = useRef(false);
  const gateUntil = useRef(0);
  const armGate = () => {
    gateUntil.current = performance.now() + 280;
  };
  const gated = () => performance.now() < gateUntil.current;

  const goTitle = () => {
    const g = gameRef.current;
    if (!g) return;
    startMenuMusic();
    sfxPlay.title();
    setMenu("root");
    setConfirm(null);
    g.screen = "title";
    g.paused = false;
    g.training = false;
    g.trainMeter = false;
    g.pushHud();
  };

  const goNewFight = () => {
    const g = gameRef.current;
    if (!g) return;
    startMenuMusic();
    setConfirm(null);
    resetSelect(g.versusCpu);
    g.chooseMode(g.versusCpu, g.difficulty);
  };

  const goRematch = () => {
    const g = gameRef.current;
    if (!g) return;
    setConfirm(null);
    g.beginMatch();
  };

  const goRestart = () => {
    const g = gameRef.current;
    if (!g) return;
    setConfirm(null);
    setHelp(false);
    g.beginMatch();
  };

  const goTrainChars = () => {
    const g = gameRef.current;
    if (!g) return;
    setConfirm(null);
    setHelp(false);
    setSettings(false);
    startMenuMusic();
    resetSelect(true);
    g.paused = false;
    g.chooseMode(true, g.difficulty, true);
  };

  const goExit = () => {
    const g = gameRef.current;
    setConfirm(null);
    stopKitchenDrone();
    stopStageMusic();
    g?.destroy();
    setExited(true);
    window.close();
  };

  const ask = (q: string, yes: () => void) => {
    armGate();
    setConfirmChoice(0);
    setConfirm({ q, yes });
  };

  const resetSelect = (cpu: boolean) => {
    setP1Cur("renike");
    setP2Cur("ricsi");
    setP1Lock(false);
    setP2Lock(false);
    setTouchPick(null);
    setStageCur("sintertanya");
    void cpu;
  };

  const boot = () => {
    primeAudio();
    setAudioReady(true);
    goLandscape();
    const s = hudRef.current.screen;
    if (s === "title" || s === "select" || s === "stage" || s === "online" || s === "lobby") startMenuMusic();
  };

  const cycle = (id: CharId, dir: 1 | -1) =>
    CHAR_IDS[(CHAR_IDS.indexOf(id) + dir + CHAR_IDS.length) % CHAR_IDS.length];

  const cycleStage = (id: StageId, dir: 1 | -1) =>
    STAGE_IDS[(STAGE_IDS.indexOf(id) + dir + STAGE_IDS.length) % STAGE_IDS.length];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new KitchenKombat(canvas, setHud);
    gameRef.current = game;
    const net = netRef.current;
    net.setHandlers({
      onLobby: () => setLobbyTick((n) => n + 1),
      onError: (m) => setNetErr(m),
      onStart: (s) => {
        const role = net.role ?? "host";
        game.beginOnline(s.p1, s.p2, role, (frame, bits) => net.input(frame, bits), () => net.go());
      },
      onDrop: () => {
        setNetErr("A másik játékos kilépett.");
        game.endOnline();
        net.disconnect();
      },
      onGo: () => game.onlineGo(),
      onInput: (frame, bits) => game.pushRemoteInput(frame, bits),
    });
    const unbind = installInput();
    const onResize = () => game.resize();
    game.resize();
    window.addEventListener("resize", onResize);
    void game.load().then(() => {
      game.start();
      game.resize();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") game.pauseToggle();
    };
    window.addEventListener("keydown", onKey);
    const onGesture = () => {
      primeAudio();
      setAudioReady(true);
    };
    window.addEventListener("pointerdown", onGesture, { capture: true });
    window.addEventListener("keydown", onGesture, { capture: true });
    return () => {
      unbind();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onGesture, { capture: true } as EventListenerOptions);
      window.removeEventListener("keydown", onGesture, { capture: true } as EventListenerOptions);
      game.destroy();
      net.disconnect();
      stopKitchenDrone();
      stopStageMusic();
    };
  }, []);

  useEffect(() => {
    applyMix();
    setMutedUi(isMuted());
    return subscribeSettings(() => {
      setOpt(getSettings());
      applyMix();
      setMutedUi(isMuted());
    });
  }, []);

  useEffect(() => {
    if (hud.screen === "result") {
      setResultIdx(0);
      setConfirm(null);
    }
    if (hud.screen === "pause") {
      setPauseIdx(0);
      setConfirm(null);
    }
    if (hud.screen !== "pause" && hud.screen !== "result") setConfirm(null);
  }, [hud.screen]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const h = hudRef.current;
      const g = gameRef.current;
      if (!g) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (h.loading) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (padEditRef.current) {
        const m = sampleMenu();
        const ids = PAD_BTNS.map((b) => b.id);
        if (m.specialP) {
          const i = ids.indexOf(padSelRef.current);
          setPadSel(ids[(i + ids.length - 1) % ids.length]!);
        }
        if (m.special2P) {
          const i = ids.indexOf(padSelRef.current);
          setPadSel(ids[(i + 1) % ids.length]!);
        }
        const step = 1;
        if (m.leftP) patchPadBtn(padSelRef.current, { x: getSettings().pad[padSelRef.current].x - step });
        if (m.rightP) patchPadBtn(padSelRef.current, { x: getSettings().pad[padSelRef.current].x + step });
        if (m.upP) patchPadBtn(padSelRef.current, { y: getSettings().pad[padSelRef.current].y - step });
        if (m.downP) patchPadBtn(padSelRef.current, { y: getSettings().pad[padSelRef.current].y + step });
        if (!gated() && m.kickRP) {
          armGate();
          setPadEdit(false);
        }
        raf = requestAnimationFrame(tick);
        return;
      }
      if (helpRef.current || updatesRef.current || settingsRef.current) {
        const m = sampleMenu();
        if (updatesRef.current) {
          if (m.upP) setPatchIdx((i) => Math.max(0, i - 1));
          if (m.downP) setPatchIdx((i) => Math.min(PATCH_NOTES.length - 1, i + 1));
        }
        if (settingsRef.current) {
          const rows = 8;
          if (m.upP) setSetIdx((i) => (i + rows - 1) % rows);
          if (m.downP) setSetIdx((i) => (i + 1) % rows);
          if (m.leftP || m.rightP) {
            const dir = m.leftP ? -1 : 1;
            nudgeSetting(setIdxRef.current, dir);
          }
          if (!gated() && (m.kickLP || m.punchLP || m.startP) && setIdxRef.current === 7) {
            armGate();
            setPadSel("l2");
            setPadEdit(true);
          }
        }
        if (!gated() && (m.kickRP || (settingsRef.current ? false : m.kickLP) || m.startP)) {
          if (settingsRef.current && (m.kickLP || m.startP) && !m.kickRP) {
            /* confirm row unused */
          } else if (!gated() && (m.kickRP || m.startP)) {
            armGate();
            setHelp(false);
            setUpdates(false);
            setSettings(false);
          }
        }
        if (!gated() && m.kickRP) {
          armGate();
          setHelp(false);
          setUpdates(false);
          setSettings(false);
        }
        raf = requestAnimationFrame(tick);
        return;
      }
      if (h.screen === "title") {
        const m = sampleMenu();
        const c = confirmRef.current;
        if (c) {
          const ok = !gated() && (m.kickLP || m.punchLP || m.punchRP || m.startP);
          const back = !gated() && m.kickRP;
          if (m.leftP) setConfirmChoice(0);
          if (m.rightP) setConfirmChoice(1);
          if (ok) {
            armGate();
            if (confirmChoiceRef.current === 0) c.yes();
            else setConfirm(null);
          } else if (back) {
            armGate();
            setConfirm(null);
          }
          raf = requestAnimationFrame(tick);
          return;
        }
        const diffs: Difficulty[] = DIFFICULTIES;
        const ok = !gated() && (m.kickLP || m.punchLP || m.startP);
        if (menuRef.current === "root") {
          if (m.upP) setTitleIdx((i) => (i + 6) % 7);
          if (m.downP) setTitleIdx((i) => (i + 1) % 7);
          if (ok) {
            armGate();
            const i = titleIdxRef.current;
            if (i === 0) {
              boot();
              setMenu("diff");
            } else if (i === 1) {
              boot();
              resetSelect(false);
              g.chooseMode(false, diffRef.current);
            } else if (i === 2) {
              boot();
              setNetErr(null);
              g.openOnline();
            } else if (i === 3) {
              boot();
              resetSelect(true);
              g.chooseMode(true, diffRef.current, true);
            } else if (i === 4) {
              ask("Biztos ki akarsz lépni a játékból?", goExit);
            } else if (i === 5) {
              setSetIdx(0);
              setSettings(true);
            } else {
              setPatchIdx(0);
              setUpdates(true);
            }
          }
        } else {
          if (m.upP || m.leftP) setDiff((d) => diffs[(diffs.indexOf(d) + diffs.length - 1) % diffs.length]);
          if (m.downP || m.rightP) setDiff((d) => diffs[(diffs.indexOf(d) + 1) % diffs.length]);
          if (!gated() && m.kickRP) setMenu("root");
          if (ok) {
            boot();
            armGate();
            resetSelect(true);
            g.chooseMode(true, diffRef.current);
          }
        }
      } else if (h.screen === "select") {
        const dual = !h.versusCpu && getPadCount() >= 2;
        const okOf = (a: { kickLP: boolean; punchLP: boolean; startP: boolean }) =>
          !gated() && (a.kickLP || a.punchLP || a.startP);
        const backOf = (a: { kickRP: boolean }) => !gated() && a.kickRP;
        if (dual) {
          const a1 = sampleP1();
          const a2 = sampleP2();
          let p1L = p1LockRef.current;
          let p2L = p2LockRef.current;
          if (!p1L) {
            if (a1.leftP) setP1Cur((c) => cycle(c, -1));
            if (a1.rightP) setP1Cur((c) => cycle(c, 1));
            if (okOf(a1)) {
              p1L = true;
              setP1Lock(true);
              sfxPlay.charName(p1CurRef.current);
            }
          } else if (backOf(a1)) {
            p1L = false;
            setP1Lock(false);
          }
          if (!p2L) {
            if (a2.leftP) setP2Cur((c) => cycle(c, -1));
            if (a2.rightP) setP2Cur((c) => cycle(c, 1));
            if (okOf(a2)) {
              p2L = true;
              setP2Lock(true);
              sfxPlay.charName(p2CurRef.current);
            }
          } else if (backOf(a2)) {
            p2L = false;
            setP2Lock(false);
          }
          if (p1L && p2L) {
            armGate();
            g.goStage(p1CurRef.current, p2CurRef.current);
          }
          if (!p1L && !p2L && backOf(a1)) {
            armGate();
            g.training = false;
            g.screen = "title";
            setMenu("root");
            g.pushHud();
          }
        } else {
          const a = sampleMenu();
          if (!p1LockRef.current) {
            if (a.leftP) setP1Cur((c) => cycle(c, -1));
            if (a.rightP) setP1Cur((c) => cycle(c, 1));
            if (okOf(a)) {
              setP1Lock(true);
              sfxPlay.charName(p1CurRef.current);
              armGate();
            }
            if (backOf(a)) {
              armGate();
              g.training = false;
              g.screen = "title";
              setMenu(h.versusCpu && !h.training ? "diff" : "root");
              g.pushHud();
            }
          } else if (!p2LockRef.current) {
            if (a.leftP) setP2Cur((c) => cycle(c, -1));
            if (a.rightP) setP2Cur((c) => cycle(c, 1));
            if (okOf(a)) {
              setP2Lock(true);
              sfxPlay.charName(p2CurRef.current);
              armGate();
              g.goStage(p1CurRef.current, p2CurRef.current);
            }
            if (backOf(a)) setP1Lock(false);
          }
        }
      } else if (h.screen === "stage") {
        const m = sampleMenu();
        if (m.leftP) setStageCur((s) => cycleStage(s, -1));
        if (m.rightP) setStageCur((s) => cycleStage(s, 1));
        if (!gated() && m.kickRP) {
          armGate();
          setP1Lock(false);
          setP2Lock(false);
          g.screen = "select";
          g.pushHud();
        }
        if (!gated() && (m.kickLP || m.punchLP || m.startP)) g.confirmStage(stageCurRef.current);
      } else if (h.screen === "result" || h.screen === "pause") {
        const m = sampleMenu();
        const c = confirmRef.current;
        const ok = !gated() && (m.kickLP || m.punchLP || m.punchRP || m.startP);
        const back = !gated() && m.kickRP;
        if (c) {
          if (m.leftP) setConfirmChoice(0);
          if (m.rightP) setConfirmChoice(1);
          if (ok) {
            armGate();
            if (confirmChoiceRef.current === 0) c.yes();
            else setConfirm(null);
          } else if (back) {
            armGate();
            setConfirm(null);
          }
        } else if (h.screen === "pause") {
          const n = h.training ? 9 : 6;
          if (helpRef.current) {
            /* help overlay handles close */
          } else if (m.upP) setPauseIdx((i) => (i + n - 1) % n);
          else if (m.downP) setPauseIdx((i) => (i + 1) % n);
          else if (h.training && (m.leftP || m.rightP)) {
            const dir = m.leftP ? -1 : 1;
            const i = pauseIdxRef.current;
            if (i === 2) g.cycleDummy(dir as 1 | -1);
            else if (i === 3 && g.dummy === "cpu") g.cycleTrainDiff(dir as 1 | -1);
            else if (i === 4) g.toggleTrainMeter();
          } else if (back) {
            armGate();
            g.pauseToggle();
          } else if (ok) {
            const i = pauseIdxRef.current;
            if (h.training) {
              if (i === 0) g.pauseToggle();
              else if (i === 1) ask("Biztos a karakterválasztóra lépsz?", goTrainChars);
              else if (i === 2) g.cycleDummy(1);
              else if (i === 3) {
                if (g.dummy === "cpu") g.cycleTrainDiff(1);
              } else if (i === 4) g.toggleTrainMeter();
              else if (i === 5) {
                armGate();
                setHelp(true);
              } else if (i === 6) {
                armGate();
                setSetIdx(0);
                setSettings(true);
              } else if (i === 7) ask("Biztos vissza akarsz lépni a főmenübe?", goTitle);
              else ask("Biztos ki akarsz lépni a játékból?", goExit);
            } else if (i === 0) g.pauseToggle();
            else if (i === 1) ask("Biztos újraindítod a meccset?", goRestart);
            else if (i === 2) {
              armGate();
              setHelp(true);
            } else if (i === 3) {
              armGate();
              setSetIdx(0);
              setSettings(true);
            } else if (i === 4) ask("Biztos vissza akarsz lépni a főmenübe?", goTitle);
            else ask("Biztos ki akarsz lépni a játékból?", goExit);
          }
        } else if (h.screen === "result") {
          if (m.upP) setResultIdx((i) => (i + 2) % 3);
          if (m.downP) setResultIdx((i) => (i + 1) % 3);
          if (ok) {
            const i = resultIdxRef.current;
            if (i === 0) ask("Biztos új harcot indítasz?", goNewFight);
            else if (i === 1) ask("Biztos visszavágót akarsz?", goRematch);
            else ask("Biztos vissza akarsz lépni a főmenübe?", goTitle);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const ids: CharId[] = CHAR_IDS;
  const touchUi = useTouchUi();
  const landscape = useLandscape();

  const pickSelectChar = (id: CharId) => {
    if (gated()) return;
    const dual = !hud.versusCpu && hud.pads >= 2;
    const slot: 1 | 2 = !p1Lock ? 1 : 2;
    if (p1Lock && p2Lock) return;
    if (touchUi) {
      if (!(touchPick && touchPick.slot === slot && touchPick.id === id)) {
        setTouchPick({ slot, id });
        if (slot === 1) setP1Cur(id);
        else setP2Cur(id);
        return;
      }
    }
    setTouchPick(null);
    if (slot === 1) {
      setP1Cur(id);
      setP1Lock(true);
      sfxPlay.charName(id);
      armGate();
      if (dual && p2Lock) gameRef.current?.goStage(id, p2Cur);
    } else {
      setP2Cur(id);
      setP2Lock(true);
      sfxPlay.charName(id);
      armGate();
      gameRef.current?.goStage(p1Cur, id);
    }
  };

  return (
    <div
      ref={wrapRef}
      className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-bg text-fg"
      onPointerDown={() => {
        boot();
        if (!titleStung.current && hudRef.current.screen === "title" && !hudRef.current.loading) {
          titleStung.current = true;
          sfxPlay.title();
        }
      }}
    >
      <div className="relative aspect-video h-auto max-h-full w-full max-w-full">
      <canvas ref={canvasRef} className="block h-full w-full touch-none bg-bg" />

      {hud.loading && (
        <Overlay>
          <h2 className="font-display text-4xl">SINTER KOMBAT</h2>
          <p className="text-muted tracking-widest">BETÖLTÉS</p>
          <div className="mt-2 h-3 w-72 max-w-[80vw] overflow-hidden rounded-sm border border-gold bg-bg">
            <div className="bg-gold h-full transition-[width] duration-150" style={{ width: `${Math.round(hud.loadPct * 100)}%` }} />
          </div>
          <p className="font-display text-gold text-xl">{Math.round(hud.loadPct * 100)}%</p>
        </Overlay>
      )}

      {!hud.loading && !audioReady && (
        <div
          className="absolute inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-black/80"
          onPointerDown={() => {
            primeAudio();
            setAudioReady(true);
            sfxPlay.title();
            startMenuMusic();
          }}
        >
          <h2 className="font-display text-gold text-4xl tracking-[0.2em] sm:text-5xl">SINTER KOMBAT</h2>
          <p className="mt-6 font-display text-xl tracking-[0.25em] text-white/90 sm:text-2xl">NYOMJ MEG EGY GOMBOT</p>
        </div>
      )}

      {hud.screen === "title" && !hud.loading && (
        <div
          className="absolute inset-0 z-10 flex flex-col"
          style={{
            backgroundImage: "url(/ui/mainmenu.png?v=19)",
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
        >
          <div className="from-bg/90 mt-auto flex flex-col items-center gap-1 bg-gradient-to-t to-transparent px-4 pb-10 pt-16">
            {confirm && hud.screen === "title" ? (
              <ConfirmBox q={confirm.q} choice={confirmChoice} onYes={confirm.yes} onNo={() => setConfirm(null)} />
            ) : menu === "root"
              ? (
                  [
                    { label: "1 Játékos VS CPU", i: 0 },
                    { label: "2 Játékos", i: 1 },
                    { label: "Online", i: 2 },
                    { label: "Gyakorló mód", i: 3 },
                    { label: "Kilépés a Játékból", i: 4 },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.i}
                    type="button"
                    onClick={() => {
                      boot();
                      setTitleIdx(item.i);
                      if (item.i === 0) setMenu("diff");
                      else if (item.i === 1) {
                        resetSelect(false);
                        gameRef.current?.chooseMode(false, diff);
                      } else if (item.i === 2) {
                        setNetErr(null);
                        gameRef.current?.openOnline();
                      } else if (item.i === 3) {
                        resetSelect(true);
                        gameRef.current?.chooseMode(true, diff, true);
                      } else ask("Biztos ki akarsz lépni a játékból?", goExit);
                    }}
                    className={`font-display min-h-11 min-w-64 px-6 text-center text-2xl tracking-wide transition-colors sm:text-3xl ${
                      titleIdx === item.i ? "text-gold" : "text-fg/70 hover:text-fg"
                    }`}
                  >
                    {titleIdx === item.i ? `▸ ${item.label}` : item.label}
                  </button>
                ))
              : DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDiff(d);
                      boot();
                      resetSelect(true);
                      gameRef.current?.chooseMode(true, d);
                    }}
                    className={`font-display min-h-11 min-w-64 px-6 text-center tracking-wide transition-colors ${
                      d === "szopni" ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
                    } ${diff === d ? "text-gold" : "text-fg/70 hover:text-fg"}`}
                  >
                    {diff === d ? "▸ " : ""}
                    {difficultyLabel(d)}
                  </button>
                ))}
          </div>
          {menu === "root" && (
            <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => {
                  setTitleIdx(5);
                  setSetIdx(0);
                  setSettings(true);
                }}
                className={`font-display min-h-11 px-4 text-right text-lg tracking-wide sm:text-xl ${
                  titleIdx === 5 ? "text-gold" : "text-fg/70 hover:text-fg"
                }`}
              >
                {titleIdx === 5 ? "▸ Beállítások" : "Beállítások"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitleIdx(6);
                  setPatchIdx(0);
                  setUpdates(true);
                }}
                className={`font-display min-h-11 px-4 text-right text-lg tracking-wide sm:text-xl ${
                  titleIdx === 6 ? "text-gold" : "text-fg/70 hover:text-fg"
                }`}
              >
                {titleIdx === 6 ? "▸ Frissítések" : "Frissítések"}
              </button>
            </div>
          )}
        </div>
      )}

      {hud.screen === "online" && (
        <Overlay>
          <h2 className="font-display text-3xl">ONLINE</h2>
          <p className="text-muted max-w-md text-center text-sm">
            Host nyit lobbyt ezen a gépen. Join: írd be a Host LAN IP-jét (ugyanaz a Wi‑Fi). Internetes IP ritkán megy
            tűzfal miatt.
          </p>
          {netErr && <p className="text-gold text-sm">{netErr}</p>}
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <MenuBtn
              onClick={() => {
                boot();
                setNetErr(null);
                void fetchNetInfo().then((info) => {
                  setHostIps(info.ips);
                  setHostPort(info.port);
                });
                netRef.current.connect({ role: "host", name: "HOST", char: "renike" });
                gameRef.current?.openLobby();
              }}
            >
              Host
            </MenuBtn>
            <MenuBtn
              onClick={() => {
                boot();
                setNetErr(null);
                const url = joinWsUrl(joinAddr);
                netRef.current.connect({ role: "guest", url, name: "JOIN", char: "ricsi" });
                gameRef.current?.openLobby();
              }}
            >
              Join
            </MenuBtn>
          </div>
          <label className="text-muted mt-3 flex w-full max-w-sm flex-col gap-1 text-sm">
            Join IP
            <input
              value={joinAddr}
              onChange={(e) => setJoinAddr(e.target.value)}
              placeholder="192.168.0.12 vagy 192.168.0.12:8080"
              className="border-border bg-surface min-h-11 rounded-md border px-3 text-fg"
            />
          </label>
          <MenuBtn
            onClick={() => {
              netRef.current.disconnect();
              const g = gameRef.current;
              if (g) {
                setMenu("root");
                g.screen = "title";
                g.pushHud();
              }
            }}
          >
            Vissza
          </MenuBtn>
        </Overlay>
      )}

      {hud.screen === "lobby" && (
        <LobbyView
          tick={lobbyTick}
          net={netRef.current}
          ips={hostIps}
          port={hostPort}
          err={netErr}
          onBack={() => {
            netRef.current.disconnect();
            gameRef.current?.endOnline();
          }}
        />
      )}

      {hud.screen === "select" && (
        <div
          className="absolute inset-0 z-10 bg-cover bg-center"
          style={{ backgroundImage: "url(/ui/selection.jpg)" }}
        >
          <button
            type="button"
            onClick={() => {
              armGate();
              resetSelect(hud.versusCpu);
              goTitle();
            }}
            className="font-display absolute left-3 top-3 z-20 min-h-11 rounded-md border border-border bg-black/65 px-4 text-sm tracking-wide text-fg/90 hover:text-gold sm:text-base"
          >
            Főmenü
          </button>
          <SelectPanel side="left" id={p1Cur} locked={p1Lock} tone="p1" visible />
          <SelectPanel
            side="right"
            id={p2Cur}
            locked={p2Lock}
            tone="p2"
            visible={!hud.versusCpu && hud.pads >= 2 ? true : p1Lock}
          />
          <div className="absolute bottom-[3%] left-1/2 z-10 flex max-w-[72%] -translate-x-1/2 flex-wrap justify-center gap-1.5">
            {ids.map((id) => {
              const dual = !hud.versusCpu && hud.pads >= 2;
              const p1on = p1Cur === id && (dual || !p1Lock);
              const p2on = p2Cur === id && (dual || p1Lock);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => pickSelectChar(id)}
                  className="relative size-12 overflow-hidden rounded-sm bg-bg/80 sm:size-14"
                  style={{
                    boxShadow: [p1on ? "0 0 0 2px #c43b2e" : "0 0 0 1px #3a2a22", p2on ? "0 0 0 4px #2e6ec4" : ""]
                      .filter(Boolean)
                      .join(", "),
                  }}
                >
                  <img src={`/portraits/${id}-icon.png?v=10`} alt={CHARACTERS[id].name} className="size-full object-cover object-top" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hud.screen === "stage" && (
        <Overlay>
          <h2 className="font-display text-3xl">VÁLASSZ PÁLYÁT</h2>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {STAGE_IDS.map((id) => {
              const s = STAGES[id];
              const on = stageCur === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setStageCur(id);
                    gameRef.current?.confirmStage(id);
                  }}
                  className={`w-56 rounded-lg border p-3 text-left sm:w-72 ${
                    on ? "border-gold bg-surface" : "border-border bg-bg/70"
                  }`}
                >
                  <img src={s.art} alt="" className="mb-2 h-28 w-full rounded object-cover sm:h-36" />
                  <div className="font-display text-xl">{s.nameHu}</div>
                </button>
              );
            })}
          </div>
        </Overlay>
      )}

      {hud.screen === "vs" && (
        <Overlay dim>
          <div className="flex items-center gap-6">
            <img src={`/portraits/${hud.p1}.png?v=11`} alt="" className="size-28 rounded-md object-cover object-top sm:size-40" />
            <div className="font-display text-gold text-4xl">VS</div>
            <img src={`/portraits/${hud.p2}.png?v=11`} alt="" className="size-28 rounded-md object-cover object-top sm:size-40" />
          </div>
        </Overlay>
      )}

      {hud.screen === "pause" && (
        <Overlay dense={touchUi}>
          <h2 className={`font-display ${touchUi ? "text-xl" : "text-4xl"}`}>SZÜNET</h2>
          {confirm ? (
            <ConfirmBox
              q={confirm.q}
              choice={confirmChoice}
              onYes={confirm.yes}
              onNo={() => setConfirm(null)}
            />
          ) : (
            <>
              {(hud.training
                ? ([
                    { label: "Folytatás", i: 0 },
                    { label: "Karakterválasztás", i: 1 },
                    {
                      label: `Ellenfél: ${hud.dummy === "idle" ? "ÁLL" : hud.dummy === "cpu" ? "CPU HARCOL" : "2. JÁTÉKOS"}`,
                      i: 2,
                    },
                    {
                      label:
                        hud.dummy === "cpu"
                          ? `Nehézség: ${difficultyLabel(hud.difficulty)}`
                          : "Nehézség: —",
                      i: 3,
                    },
                    { label: `Végtelen energia: ${hud.trainMeter ? "BE" : "KI"}`, i: 4 },
                    { label: "Irányítás", i: 5 },
                    { label: "Beállítások", i: 6 },
                    { label: "Főmenü", i: 7 },
                    { label: "Kilépés a Játékból", i: 8 },
                  ] as const)
                : ([
                    { label: "Folytatás", i: 0 },
                    { label: "Újraindítás", i: 1 },
                    { label: "Irányítás", i: 2 },
                    { label: "Beállítások", i: 3 },
                    { label: "Főmenü", i: 4 },
                    { label: "Kilépés a Játékból", i: 5 },
                  ] as const)
              ).map((item) => (
                <MenuBtn
                  key={item.i}
                  dense={touchUi}
                  active={pauseIdx === item.i}
                  onClick={() => {
                    setPauseIdx(item.i);
                    const g = gameRef.current;
                    if (!g) return;
                    if (hud.training) {
                      if (item.i === 0) g.pauseToggle();
                      else if (item.i === 1) ask("Biztos a karakterválasztóra lépsz?", goTrainChars);
                      else if (item.i === 2) g.cycleDummy(1);
                      else if (item.i === 3) {
                        if (g.dummy === "cpu") g.cycleTrainDiff(1);
                      } else if (item.i === 4) g.toggleTrainMeter();
                      else if (item.i === 5) setHelp(true);
                      else if (item.i === 6) {
                        setSetIdx(0);
                        setSettings(true);
                      } else if (item.i === 7) ask("Biztos vissza akarsz lépni a főmenübe?", goTitle);
                      else ask("Biztos ki akarsz lépni a játékból?", goExit);
                    } else if (item.i === 0) g.pauseToggle();
                    else if (item.i === 1) ask("Biztos újraindítod a meccset?", goRestart);
                    else if (item.i === 2) setHelp(true);
                    else if (item.i === 3) {
                      setSetIdx(0);
                      setSettings(true);
                    } else if (item.i === 4) ask("Biztos vissza akarsz lépni a főmenübe?", goTitle);
                    else ask("Biztos ki akarsz lépni a játékból?", goExit);
                  }}
                >
                  {item.label}
                </MenuBtn>
              ))}
              {hud.training && (
                <p className={`text-muted text-center ${touchUi ? "mt-0.5 text-[10px]" : "mt-2 text-xs"}`}>
                  Ellenfél / nehézség / energia: bal-jobb. Kör: vissza.
                </p>
              )}
            </>
          )}
        </Overlay>
      )}

      {hud.screen === "result" && (
        <div className="absolute inset-0 z-10">
          {hud.winner && VICTORY_ART[hud.winner] && (
            <img
              src={`${VICTORY_ART[hud.winner]}?v=1`}
              alt=""
              className="pointer-events-none absolute bottom-0 left-0 h-[96%] max-h-full w-auto max-w-[58%] object-contain object-left-bottom"
            />
          )}
          <div className="absolute inset-y-0 right-0 flex w-[48%] max-w-[28rem] flex-col items-center justify-center gap-3 bg-gradient-to-l from-black/80 via-black/55 to-transparent px-8 py-6 sm:w-[42%]">
            <h2 className="font-display text-center text-3xl sm:text-4xl">
              {hud.winner ? winLine(hud.winner) : "DÖNTETLEN"}
            </h2>
            {hud.fatality && <p className="text-gold text-xl">{hud.fatality}</p>}
            {confirm ? (
              <ConfirmBox
                q={confirm.q}
                choice={confirmChoice}
                onYes={confirm.yes}
                onNo={() => setConfirm(null)}
              />
            ) : (
              (
                [
                  { label: "Új harc", i: 0 },
                  { label: "Visszavágó", i: 1 },
                  { label: "Főmenü", i: 2 },
                ] as const
              ).map((item) => (
                <MenuBtn
                  key={item.i}
                  active={resultIdx === item.i}
                  onClick={() => {
                    setResultIdx(item.i);
                    if (item.i === 0) ask("Biztos új harcot indítasz?", goNewFight);
                    else if (item.i === 1) ask("Biztos visszavágót akarsz?", goRematch);
                    else ask("Biztos vissza akarsz lépni a főmenübe?", goTitle);
                  }}
                >
                  {item.label}
                </MenuBtn>
              ))
            )}
          </div>
        </div>
      )}

      {help && <Help p1={hud.p1} p2={hud.p2} onClose={() => setHelp(false)} />}
      {updates && (
        <Updates
          sel={patchIdx}
          onClose={() => setUpdates(false)}
          onPick={setPatchIdx}
        />
      )}
      {settings && (
        <SettingsPanel
          sel={setIdx}
          opt={opt}
          onClose={() => setSettings(false)}
          onPick={setSetIdx}
          onCustomize={() => {
            setPadSel("l2");
            setPadEdit(true);
          }}
        />
      )}
      {padEdit && (
        <PadCustomizer
          opt={opt}
          sel={padSel}
          onSel={setPadSel}
          onClose={() => setPadEdit(false)}
        />
      )}

      {hud.screen === "fight" && hud.training && (
        <>
          <InputHist items={hud.p1Hist} side="left" />
          {hud.dummy === "p2" && <InputHist items={hud.p2Hist} side="right" />}
        </>
      )}

      {hud.screen === "fight" && hud.netWait && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-20 text-center">
          <span className="border-border bg-surface/90 rounded-md border px-3 py-1 text-sm">
            Várakozás a hálózatra…
          </span>
        </div>
      )}

      {hud.screen === "fight" && touchUi && (
        <TouchPad scale={opt.touch} alpha={opt.touchAlpha} layout={opt.pad} />
      )}
      </div>

      {exited && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg">
          <p className="font-display text-2xl">Játék bezárva</p>
        </div>
      )}

      <div
        className="pointer-events-none absolute bottom-2 left-3 z-30 font-display text-[11px] tracking-[0.18em] text-white/75"
        style={{ textShadow: "0 1px 2px #000" }}
      >
        {GAME_VERSION}
      </div>

      <button
        type="button"
        className="absolute right-3 top-3 z-20 rounded-full border border-border bg-surface/80 p-2"
        onClick={() => {
          primeAudio();
          setAudioReady(true);
          void unlockAudio().then((wasSuspended) => {
            if (wasSuspended && getSettings().soundOn) {
              startMenuMusic();
              return;
            }
            const on = !getSettings().soundOn;
            patchSettings({ soundOn: on });
            setMuted(!on);
            applyMix();
            setMutedUi(!on);
            if (on) startMenuMusic();
          });
        }}
        aria-label={muted ? "Hang be" : "Némítás"}
      >
        {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
      </button>
    </div>
  );
}

function LobbyView({
  tick,
  net,
  ips,
  port,
  err,
  onBack,
}: {
  tick: number;
  net: NetPlay;
  ips: string[];
  port: number;
  err: string | null;
  onBack: () => void;
}) {
  void tick;
  const L = net.lobby;
  const me = net.me;
  const shownIps = L.ips.length ? L.ips : ips;
  const waiting = !L.guest;
  return (
    <Overlay>
      <h2 className="font-display text-3xl">VÁRAKOZÓ LOBBY</h2>
      <p className="text-muted text-sm">
        {waiting ? "Várakozás a Join játékosra…" : "Ha mindketten Ready, indul a harc."}
      </p>
      {net.role === "host" && (
        <div className="border-border bg-surface mt-1 max-w-md rounded-md border px-4 py-2 text-center text-sm">
          <div className="text-muted">A te címeid (add oda a Joinnak)</div>
          {shownIps.map((ip) => (
            <div key={ip} className="text-gold font-mono text-base">
              {ip}:{port}
            </div>
          ))}
        </div>
      )}
      {err && <p className="text-gold text-sm">{err}</p>}
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        {(["host", "guest"] as const).map((slot) => {
          const p = slot === "host" ? L.host : L.guest;
          const mine = net.role === slot;
          return (
            <div
              key={slot}
              className={`w-44 rounded-lg border p-3 sm:w-56 ${
                p ? "border-gold bg-surface" : "border-border bg-bg/70"
              }`}
            >
              <div className="text-muted text-xs uppercase">{slot === "host" ? "Host • 1P" : "Join • 2P"}</div>
              {p ? (
                <>
                  <img
                    src={`/portraits/${p.char}.png?v=11`}
                    alt=""
                    className="my-2 h-28 w-full rounded object-cover object-top"
                  />
                  <div className="font-display text-xl">{CHARACTERS[p.char].name}</div>
                  <div className={p.ready ? "text-gold text-sm" : "text-muted text-sm"}>
                    {p.ready ? "READY" : "nem ready"}
                  </div>
                  {mine && (
                    <div className="mt-2 flex gap-1">
                      {CHAR_IDS.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => net.select(id)}
                          className={`min-h-11 flex-1 rounded-md border px-2 text-xs uppercase ${
                            p.char === id ? "border-gold bg-gold text-bg" : "border-border"
                          }`}
                        >
                          {CHARACTERS[id].name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted mt-6 text-sm">üres slot</p>
              )}
            </div>
          );
        })}
      </div>
      {me && (
        <MenuBtn onClick={() => net.ready(!me.ready)}>{me.ready ? "Ready visszavonása" : "Ready"}</MenuBtn>
      )}
      <MenuBtn onClick={onBack}>Kilépés</MenuBtn>
    </Overlay>
  );
}

function SelectPanel({
  side,
  id,
  locked,
  tone,
  visible,
}: {
  side: "left" | "right";
  id: CharId;
  locked: boolean;
  tone: "p1" | "p2";
  visible: boolean;
}) {
  const name = CHARACTERS[id].name;
  const pos = side === "left" ? "left-[4.8%]" : "right-[4.8%]";
  return (
    <div className={`absolute top-[11%] flex h-[68%] w-[18.5%] flex-col items-center ${pos}`}>
      {visible && (
        <>
          <div className="flex min-h-0 w-full flex-1 items-end justify-center overflow-hidden">
            <img
              src={`/sprites/${id}/idle.png?v=63`}
              alt=""
              className={`max-h-full max-w-full object-contain object-bottom ${side === "right" ? "-scale-x-100" : ""}`}
            />
          </div>
          <div
            className={`font-display w-full pb-1 text-center text-lg tracking-wide sm:text-xl ${tone === "p1" ? "text-p1" : "text-p2"}`}
          >
            {name}
            {locked ? " ✓" : ""}
          </div>
        </>
      )}
    </div>
  );
}

function goLandscape() {
  const touch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  if (!touch) return;
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  void (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.())?.catch?.(() => undefined);
  const ori = screen.orientation as ScreenOrientation & { lock?: (mode: string) => Promise<void> };
  void ori.lock?.("landscape").catch(() => undefined);
}

function useTouchUi() {
  const [touch, setTouch] = useState(() =>
    typeof window !== "undefined" &&
    (window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window),
  );
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setTouch(mq.matches || "ontouchstart" in window);
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  return touch;
}

function useLandscape() {
  const [ok, setOk] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= window.innerHeight,
  );
  useEffect(() => {
    const sync = () => setOk(window.innerWidth >= window.innerHeight);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);
  return ok;
}

function RotateHint() {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <div className="border-gold text-gold font-display rotate-90 rounded-md border px-4 py-6 text-4xl">▭</div>
      <h2 className="font-display text-3xl">FORDÍTSD EL</h2>
      <p className="text-muted max-w-sm text-lg">A játék fektetett módban megy. Forgasd el a telefont vízszintesre.</p>
    </div>
  );
}

function Overlay({ children, dim, dense }: { children: React.ReactNode; dim?: boolean; dense?: boolean }) {
  return (
    <div
      className={`absolute inset-0 z-10 flex flex-col items-center justify-center overflow-y-auto px-4 ${
        dense ? "gap-1 py-1" : "gap-3"
      } ${dim ? "bg-bg/40" : "bg-bg/75"}`}
    >
      {children}
    </div>
  );
}

function MenuBtn({
  children,
  onClick,
  active,
  dense,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  dense?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border font-semibold uppercase tracking-wide ${
        dense ? "min-h-7 px-4 py-0.5 text-sm" : "min-h-11 px-6 py-2"
      } ${active ? "border-gold bg-gold text-bg" : "border-gold bg-surface text-fg hover:bg-gold hover:text-bg"}`}
    >
      {active ? `▸ ${children}` : children}
    </button>
  );
}

function ConfirmBox({
  q,
  choice,
  onYes,
  onNo,
}: {
  q: string;
  choice: 0 | 1;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="max-w-md text-center text-lg">{q}</p>
      <div className="flex gap-3">
        <MenuBtn active={choice === 0} onClick={onYes}>
          Igen
        </MenuBtn>
        <MenuBtn active={choice === 1} onClick={onNo}>
          Mégse
        </MenuBtn>
      </div>
    </div>
  );
}

function InputHist({ items, side }: { items: TrainPress[]; side: "left" | "right" }) {
  return (
    <div
      className={`pointer-events-none absolute bottom-24 z-20 flex w-6 flex-col items-center gap-0.5 ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      {items.map((it) => (
        <span
          key={it.id}
          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-sm border border-gold/70 bg-black/55 px-0.5 font-display text-[10px] leading-none text-gold"
          style={{ animation: "train-float-up 0.22s ease-out" }}
        >
          {it.k}
        </span>
      ))}
    </div>
  );
}

function Help({ p1, p2, onClose }: { p1: CharId; p2: CharId; onClose: () => void }) {
  const a = CHARACTERS[p1];
  const b = CHARACTERS[p2];
  const sa = CHAR_SKILLS[p1];
  const sb = CHAR_SKILLS[p2];
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/90 px-4">
      <div className="border-border bg-surface max-h-[90dvh] w-full max-w-lg overflow-auto rounded-lg border p-5">
        <h3 className="font-display text-2xl">Irányítás</h3>
        <p className="text-muted mt-2 text-sm">PS5 DualSense / DualShock</p>
        <ul className="mt-3 space-y-1 text-sm">
          <li>D-pad / bot — mozgás</li>
          <li>Dupla előre / dupla hátra — dash</li>
          <li>△ Triangle — bal ütés · □ Square — jobb ütés</li>
          <li>✕ Cross — bal rúgás · ○ Circle — jobb rúgás</li>
          <li>R2 — védekezés. Guggolva + blokk = low védés</li>
          <li>L2 — Super Dash (40 energia): gyorsabb dash, sérthetetlen, átmegy az ellenfélen</li>
          <li>Options — szünet</li>
        </ul>
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p className="font-display text-gold text-lg">{a.name}</p>
            <p>L1 {a.special} — {sa.s1.replace(/^L1 [^—]+ — /, "")}</p>
            <p>R1 {a.special2} — {sa.s2.replace(/^R1 [^—]+ — /, "")}</p>
          </div>
          <div>
            <p className="font-display text-gold text-lg">{b.name}</p>
            <p>L1 {b.special} — {sb.s1.replace(/^L1 [^—]+ — /, "")}</p>
            <p>R1 {b.special2} — {sb.s2.replace(/^R1 [^—]+ — /, "")}</p>
          </div>
        </div>
        <MenuBtn onClick={onClose}>Vissza</MenuBtn>
      </div>
    </div>
  );
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function SettingsPanel({
  sel,
  opt,
  onClose,
  onPick,
  onCustomize,
}: {
  sel: number;
  opt: GameSettings;
  onClose: () => void;
  onPick: (i: number) => void;
  onCustomize: () => void;
}) {
  const row = (i: number, label: string, value: string, extra?: React.ReactNode) => (
    <button
      key={i}
      type="button"
      onClick={() => {
        onPick(i);
        if (i === 0) nudgeSetting(0, 1);
        if (i === 7) onCustomize();
      }}
      className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm ${
        sel === i ? "border-gold bg-gold/10" : "border-border"
      }`}
    >
      <span>{label}</span>
      <span className="text-gold font-display">{value}</span>
      {extra}
    </button>
  );
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/90 px-4">
      <div className="border-border bg-surface max-h-[90dvh] w-full max-w-lg overflow-auto rounded-lg border p-5">
        <h3 className="font-display text-2xl">Beállítások</h3>
        <p className="text-muted mt-1 text-sm">Bal-jobb: állítás. Kör: vissza.</p>
        <p className="font-display text-gold mt-4 text-lg">Hangok</p>
        <div className="mt-2 space-y-2">
          {row(0, "Minden hang", opt.soundOn ? "BE" : "KI")}
          {row(1, "Hangeffektek", pct(opt.sfx))}
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(opt.sfx * 100)}
            onChange={(e) => {
              onPick(1);
              patchSettings({ sfx: Number(e.target.value) / 100 });
              applyMix();
            }}
            className="w-full"
          />
          {row(2, "Zene", pct(opt.music))}
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(opt.music * 100)}
            onChange={(e) => {
              onPick(2);
              patchSettings({ music: Number(e.target.value) / 100 });
              applyMix();
            }}
            className="w-full"
          />
          {row(3, "Bejelentő", pct(opt.announcer))}
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(opt.announcer * 100)}
            onChange={(e) => {
              onPick(3);
              patchSettings({ announcer: Number(e.target.value) / 100 });
              applyMix();
            }}
            className="w-full"
          />
        </div>
        <p className="font-display text-gold mt-4 text-lg">Videó</p>
        <div className="mt-2 space-y-2">
          {row(4, "HUD méret", pct(opt.hud))}
          <input
            type="range"
            min={50}
            max={125}
            value={Math.round(opt.hud * 100)}
            onChange={(e) => {
              onPick(4);
              patchSettings({ hud: Number(e.target.value) / 100 });
            }}
            className="w-full"
          />
          {row(5, "Virtuális kontroller méret (mobil)", pct(opt.touch))}
          <input
            type="range"
            min={50}
            max={150}
            value={Math.round(opt.touch * 100)}
            onChange={(e) => {
              onPick(5);
              patchSettings({ touch: Number(e.target.value) / 100 });
            }}
            className="w-full"
          />
          {row(6, "Virtuális kontroller áttetszőség (mobil)", pct(opt.touchAlpha))}
          <input
            type="range"
            min={25}
            max={100}
            value={Math.round(opt.touchAlpha * 100)}
            onChange={(e) => {
              onPick(6);
              patchSettings({ touchAlpha: Number(e.target.value) / 100 });
            }}
            className="w-full"
          />
          {row(7, "Virtuális kontroller testreszabása", "▶")}
        </div>
        <div className="mt-4">
          <MenuBtn onClick={onClose}>Vissza</MenuBtn>
        </div>
      </div>
    </div>
  );
}

function Updates({
  sel,
  onClose,
  onPick,
}: {
  sel: number;
  onClose: () => void;
  onPick: (i: number) => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/85 px-4">
      <div className="border-border bg-surface max-h-[90dvh] w-full max-w-lg overflow-auto rounded-lg border p-5">
        <h3 className="font-display text-2xl">Frissítések</h3>
        <p className="text-muted mt-1 text-sm">Aktuális verzió: {GAME_VERSION}</p>
        <div className="mt-4 space-y-4">
          {PATCH_NOTES.map((p, i) => (
            <button
              key={p.v}
              type="button"
              onClick={() => onPick(i)}
              className={`block w-full rounded-md border px-3 py-2 text-left ${
                i === sel ? "border-gold bg-gold/10" : "border-border"
              }`}
            >
              <p className="font-display text-gold text-lg">{p.v}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
                {p.items.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </button>
          ))}
        </div>
        <div className="mt-4">
          <MenuBtn onClick={onClose}>Vissza</MenuBtn>
        </div>
      </div>
    </div>
  );
}

function TouchPad({ scale, alpha, layout }: { scale: number; alpha: number; layout: GameSettings["pad"] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {PAD_BTNS.map((b) => (
        <PadKey
          key={b.id}
          def={b}
          layout={layout[b.id]}
          masterScale={scale}
          masterAlpha={alpha}
          play
        />
      ))}
    </div>
  );
}

function PadKey({
  def,
  layout,
  masterScale,
  masterAlpha,
  play,
  selected,
  onPick,
}: {
  def: (typeof PAD_BTNS)[number];
  layout: { x: number; y: number; scale: number; alpha: number };
  masterScale: number;
  masterAlpha: number;
  play?: boolean;
  selected?: boolean;
  onPick?: (id: PadBtnId, e: React.PointerEvent) => void;
}) {
  const hold = (code: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
      if (play) pressVirtual(code);
      else onPick?.(def.id, e);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      if (play) releaseVirtual(code);
    },
    onPointerCancel: () => {
      if (play) releaseVirtual(code);
    },
  });
  const round = def.kind === "round";
  const cls = round
    ? "flex size-14 items-center justify-center rounded-full border text-base font-bold text-fg active:bg-gold active:text-bg"
    : "flex h-11 min-w-14 items-center justify-center rounded-md border px-2 text-xs font-bold uppercase text-fg active:bg-gold active:text-bg";
  return (
    <button
      type="button"
      className={`pointer-events-auto absolute ${cls} ${
        selected ? "border-gold bg-gold/40" : "border-gold/70 bg-surface/80"
      }`}
      style={{
        left: `${layout.x}%`,
        top: `${layout.y}%`,
        transform: `translate(-50%, -50%) scale(${masterScale * layout.scale})`,
        opacity: masterAlpha * layout.alpha,
        touchAction: "none",
      }}
      {...hold(def.code)}
    >
      {def.label}
    </button>
  );
}

function PadCustomizer({
  opt,
  sel,
  onSel,
  onClose,
}: {
  opt: GameSettings;
  sel: PadBtnId;
  onSel: (id: PadBtnId) => void;
  onClose: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: PadBtnId; dx: number; dy: number } | null>(null);
  const cur = opt.pad[sel];
  const onPick = (id: PadBtnId, e: React.PointerEvent) => {
    onSel(id);
    const box = boxRef.current;
    if (!box) return;
    const r = box.getBoundingClientRect();
    const lay = getSettings().pad[id];
    const dx = ((e.clientX - r.left) / r.width) * 100 - lay.x;
    const dy = ((e.clientY - r.top) / r.height) * 100 - lay.y;
    drag.current = { id, dx, dy };
    const move = (ev: PointerEvent) => {
      const b = boxRef.current;
      if (!b || !drag.current) return;
      const rr = b.getBoundingClientRect();
      const x = ((ev.clientX - rr.left) / rr.width) * 100 - drag.current.dx;
      const y = ((ev.clientY - rr.top) / rr.height) * 100 - drag.current.dy;
      patchPadBtn(drag.current.id, { x, y });
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const box = boxRef.current;
    if (!box) return;
    const r = box.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100 - drag.current.dx;
    const y = ((e.clientY - r.top) / r.height) * 100 - drag.current.dy;
    patchPadBtn(drag.current.id, { x, y });
  };
  const onUp = () => {
    drag.current = null;
  };
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-black">
      <div
        ref={boxRef}
        className="relative min-h-0 flex-1"
        style={{
          backgroundImage: "url(/stages/sintertanya.jpg?v=30)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {PAD_BTNS.map((b) => (
          <PadKey
            key={b.id}
            def={b}
            layout={opt.pad[b.id]}
            masterScale={opt.touch}
            masterAlpha={opt.touchAlpha}
            selected={sel === b.id}
            onPick={onPick}
          />
        ))}
      </div>
      <div className="border-border bg-surface/95 z-10 border-t px-3 py-2">
        <p className="font-display text-gold text-sm">
          {PAD_BTNS.find((b) => b.id === sel)?.label} — húzd a gombot. L1/R1: lapozás. D-pad: tologatás.
        </p>
        <div className="mt-1 grid grid-cols-2 gap-3">
          <label className="text-xs">
            Méret {pct(cur.scale)}
            <input
              type="range"
              min={25}
              max={150}
              value={Math.round(cur.scale * 100)}
              onChange={(e) => patchPadBtn(sel, { scale: Number(e.target.value) / 100 })}
              className="w-full"
            />
          </label>
          <label className="text-xs">
            Áttetszőség {pct(cur.alpha)}
            <input
              type="range"
              min={25}
              max={100}
              value={Math.round(cur.alpha * 100)}
              onChange={(e) => patchPadBtn(sel, { alpha: Number(e.target.value) / 100 })}
              className="w-full"
            />
          </label>
        </div>
        <div className="mt-2 flex gap-2">
          <MenuBtn onClick={() => resetPadLayout()}>Alaphelyzet</MenuBtn>
          <MenuBtn onClick={onClose}>Vissza</MenuBtn>
        </div>
      </div>
    </div>
  );
}
