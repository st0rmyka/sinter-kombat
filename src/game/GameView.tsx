import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { CHARACTERS, CHAR_IDS, CHAR_SKILLS, DIFFICULTIES, difficultyLabel, GAME_VERSION, STAGE_IDS, STAGES, VICTORY_ART, VS_ART, winLine, KitchenKombat, type CharId, type Difficulty, type Hud, type StageId, type TrainPress } from "./engine";
import { installInput, pressVirtual, releaseVirtual, sampleMenu, sampleP1, sampleP2, getPadCount } from "./input";
import { isMuted, setMuted, sfxPlay, startMenuMusic, startKitchenDrone, stopKitchenDrone, stopStageMusic, unlockAudio, applyMix, primeAudio, isAudioPrimed } from "./audio";
import { getSettings, patchSettings, subscribeSettings, type GameSettings, type PadBtnId, type KeyAction, PAD_BTNS, KEY_ACTIONS, DEFAULT_KEYS, codeLabel, patchPadBtn, resetPadLayout, patchKey, resetKeys } from "./settings";
import { NetPlay } from "./net";
import { asset } from "./asset";

const PATCH_NOTES: { v: string; items: string[] }[] = [
  {
    v: "v0.35",
    items: [
      "Karakter- és pályaválasztó egy képernyőn, VS képek + enyhén homályos pályahátterek",
      "Új főmenü, 10 karakter egy sorban (desktop)",
      "MC Isti sprite méretek, dobbantás törmelék, boot preload javítás",
      "Karakterválasztó: transzparens VS art, név a kép alatt, szürke ikonbox széltől szélig",
    ],
  },
  {
    v: "v0.31",
    items: [
      "Új karakter: MC Isti — Felugrás (nem blokkolható meteor zuhanás) + Dobbantás (földön lévőt felé löki)",
    ],
  },
  {
    v: "v0.3",
    items: [
      "Új pályák: Salgótarján, Nagybátony – Vasút",
      "Gabi voice + pisztoly SFX, baseball 5 csapás arányos sebzéssel",
      "Fárajó gitár alatt a pályazene szünetel, utána onnan folytatódik",
      "VS képek JPG, fehér keret; boot preload a menü/választó/pályákhoz",
    ],
  },
  {
    v: "v0.28",
    items: [
      "Új karakter: Gabi az Idegbeteg — baseballütő (5 csapás, közel, knockback) + agyonlövés (fejmagasság, guggolva kikerülhető)",
      "Gabi VS/Victory képek és announcer hangok",
      "Sprite méretek: jump+X / jump+kör igazítva",
    ],
  },
  {
    v: "v0.27",
    items: [
      "Jézus Szent oszlop: csak akkor gyógyít, ha Jézus bent áll",
      "Fárajó trombita +5% sebzés, Ági vérszívás azonnal indul és hitstunból is kimegy",
      "Mobil: fektetett teljes kijelző, csak landscape, főmenü háttér kitölti a képernyőt",
      "Főmenü: kisebb szöveg, Frissítések bal fent, Beállítások jobb lent",
      "Betöltés 2%-os beragadás javítva",
    ],
  },
  {
    v: "v0.266",
    items: [
      "Fárajó harci hangok (ütés, sebzés, KO)",
      "Fárajó CPU használja a trombitát és a gitárt",
      "Gitár special lenyomásra azonnal indul",
      "Trombita sebzés csökkentve",
      "Fárajó jump + ütés spriteok kisebbek",
      "Főmenü háttér javítva itch buildben",
    ],
  },
  {
    v: "v0.265",
    items: [
      "Új főmenü háttérkép (Fárajóval a rosteren)",
      "Fárajó: trombita + gitár special hangok (gitár megszakításnál folytatódik, loop)",
      "Fárajó taunt a győztes képernyőn",
      "Fárajó sima jump kisebb",
    ],
  },
  {
    v: "v0.26",
    items: [
      "Fárajó: jump nagyobb, gitárszóló klasszikus gitár mindkét frame-en, trombita 25%-kal rövidebb és megszakítható",
      "Fárajó announcer: név és győzelem",
      "Special sebzés nem tölti az energy métert (minden karakter)",
      "Betöltés: menü/karakterválasztó az első loadingon, harci assetek a VS képernyőn",
    ],
  },
  {
    v: "v0.255",
    items: [
      "Farajo: új Victory és VS képek (transzparens háttér)",
    ],
  },
  {
    v: "v0.25",
    items: [
      "Betöltő képernyő: sprite-ok, pályák, FX és hangok előre betöltődnek a menü előtt",
      "Farajo: gitárszóló végén nincs basszusgitáros frame",
      "VS képernyő rövidebb (1,6 mp)",
    ],
  },
  {
    v: "v0.24",
    items: [
      "Farajo: jump attack méret a többiekhez igazítva",
      "Farajo L1 Trombita: 3 mp helyben, teljes alakos fújás, hangjegyek szinuszban, blokkolható",
      "Farajo R1 Gitárszóló: amíg nyomva tartod és van energia, gyógyítja Farajót",
    ],
  },
  {
    v: "v0.23",
    items: [
      "Új karakter: Farajo — Trombita + Gitárszóló",
    ],
  },
  {
    v: "v0.22",
    items: [
      "Xbox kontroller: akciógombok harcban is (1P-nél minden csatlakoztatott pad)",
      "Billentyűzet: WASD, Ctrl superdash, Space blokk, U/H ütés, J/B rúgás, I/O special",
      "Beállítások: billentyűzet kiosztás testreszabható",
    ],
  },
  {
    v: "v0.21",
    items: [
      "Új VS képernyő: 3 mp, pályaháttér blurral, nagy karakterképek",
      "Special-feliratok (Büdi stb.) kikapcsolva, K.O. és körkezdet marad",
    ],
  },
  {
    v: "v0.2",
    items: [
      "Online: HOST 4 jegyű kódot ad, CSATLAKOZÁS beírja",
      "Mindkét Ready után karakterválasztó, majd pálya, aztán harc",
    ],
  },
  {
    v: "v0.195",
    items: [
      "Endgame: a győztes karakter tauntja",
      "Hit/blokk: a védekező is kap egy kis energiát (Super Dash meneküléshez)",
    ],
  },
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
      "Lázár János sprite-jai törölve (méret).",
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
  loadPct: 0.02,
  vsLoading: false,
  vsLoadPct: 0,
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
  const [keyEdit, setKeyEdit] = useState(false);
  const [keySel, setKeySel] = useState<KeyAction>("up");
  const [keyWait, setKeyWait] = useState(false);
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
  const [joinCode, setJoinCode] = useState("");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [onlineIdx, setOnlineIdx] = useState(0);
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
  const keyEditRef = useRef(keyEdit);
  keyEditRef.current = keyEdit;
  const keyWaitRef = useRef(keyWait);
  keyWaitRef.current = keyWait;
  const keySelRef = useRef(keySel);
  keySelRef.current = keySel;
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
  const onlineIdxRef = useRef(onlineIdx);
  onlineIdxRef.current = onlineIdx;
  const joinCodeRef = useRef(joinCode);
  joinCodeRef.current = joinCode;
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
      onStatus: () => setLobbyTick((n) => n + 1),
      onError: (m) => setNetErr(m),
      onHelloOk: (_role, code) => {
        setRoomCode(code);
        setNetErr(null);
        game.openLobby();
      },
      onOpenSelect: () => {
        resetSelect(false);
        game.chooseMode(false, diffRef.current);
      },
      onOpenStage: (p1, p2) => {
        setP1Cur(p1);
        setP2Cur(p2);
        setP1Lock(true);
        setP2Lock(true);
        game.goStage(p1, p2);
      },
      onPick: (role, char, locked) => {
        if (role === net.role) return;
        if (role === "host") {
          setP1Cur(char);
          setP1Lock(locked);
        } else {
          setP2Cur(char);
          setP2Lock(locked);
        }
      },
      onStart: (s) => {
        const role = net.role ?? "host";
        const st = (STAGE_IDS as string[]).includes(String(s.stage)) ? (s.stage as StageId) : "sintertanya";
        game.stageId = st;
        game.stage = game.stageArts[st] ?? game.stage;
        setStageCur(st);
        game.beginOnline(s.p1, s.p2, role, (frame, bits) => net.input(frame, bits), () => net.go());
      },
      onDrop: () => {
        setNetErr("A másik játékos kilépett.");
        game.endOnline("online");
        net.disconnect();
      },
      onGo: () => game.onlineGo(),
      onInput: (frame, bits) => game.pushRemoteInput(frame, bits),
    });
    const unbind = installInput();
    const onResize = () => game.resize();
    game.resize();
    window.addEventListener("resize", onResize);
    game.loadPct = 0.02;
    game.pushHud();
    void game.load().then(() => {
      game.start();
      game.resize();
    }).catch((err) => {
      console.error("load", err);
      game.loadPct = 1;
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
    if (!keyWait) return;
    const onBind = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      if (e.code === "Escape") {
        setKeyWait(false);
        return;
      }
      patchKey(keySelRef.current, e.code);
      setKeyWait(false);
    };
    window.addEventListener("keydown", onBind, true);
    return () => window.removeEventListener("keydown", onBind, true);
  }, [keyWait]);

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
      if (keyEditRef.current) {
        const m = sampleMenu();
        if (keyWaitRef.current) {
          raf = requestAnimationFrame(tick);
          return;
        }
        if (m.upP) {
          const i = KEY_ACTIONS.findIndex((x) => x.id === keySelRef.current);
          setKeySel(KEY_ACTIONS[(i + KEY_ACTIONS.length - 1) % KEY_ACTIONS.length]!.id);
        }
        if (m.downP) {
          const i = KEY_ACTIONS.findIndex((x) => x.id === keySelRef.current);
          setKeySel(KEY_ACTIONS[(i + 1) % KEY_ACTIONS.length]!.id);
        }
        if (!gated() && (m.kickLP || m.punchLP || m.startP)) {
          armGate();
          setKeyWait(true);
        }
        if (!gated() && m.kickRP) {
          armGate();
          setKeyEdit(false);
          setKeyWait(false);
        }
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
          const rows = 9;
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
          if (!gated() && (m.kickLP || m.punchLP || m.startP) && setIdxRef.current === 8) {
            armGate();
            setKeySel("up");
            setKeyEdit(true);
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
      } else if (h.screen === "online") {
        const m = sampleMenu();
        const ok = !gated() && (m.kickLP || m.punchLP || m.startP);
        if (m.upP || m.downP) setOnlineIdx((i) => (i === 0 ? 1 : 0));
        if (ok) {
          armGate();
          boot();
          setNetErr(null);
          if (onlineIdxRef.current === 0) {
            netRef.current.connect({ role: "host", name: "HOST", char: "renike" });
          } else {
            const code = joinCodeRef.current.replace(/\D/g, "").slice(0, 4);
            if (code.length !== 4) {
              setNetErr("Írj be egy 4 jegyű kódot.");
            } else {
              netRef.current.connect({ role: "guest", name: "JOIN", char: "ricsi", code });
            }
          }
        } else if (!gated() && m.kickRP) {
          armGate();
          netRef.current.disconnect();
          g.screen = "title";
          setMenu("root");
          g.pushHud();
        }
      } else if (h.screen === "lobby") {
        const m = sampleMenu();
        const ok = !gated() && (m.kickLP || m.punchLP || m.startP);
        const me = netRef.current.me;
        if (ok && me) {
          armGate();
          netRef.current.ready(!me.ready);
        }
        if (!gated() && m.kickRP) {
          armGate();
          netRef.current.disconnect();
          g.endOnline("online");
        }
      } else if (h.screen === "select") {
        const net = netRef.current;
        const online = !!net.role;
        const dual = !online && !h.versusCpu && getPadCount() >= 2;
        const okOf = (a: { kickLP: boolean; punchLP: boolean; startP: boolean }) =>
          !gated() && (a.kickLP || a.punchLP || a.startP);
        const backOf = (a: { kickRP: boolean }) => !gated() && a.kickRP;
        if (online) {
          const a = sampleMenu();
          const host = net.role === "host";
          if (host) {
            if (!p1LockRef.current) {
              if (a.leftP) {
                const n = cycle(p1CurRef.current, -1);
                setP1Cur(n);
                net.pick(n, false);
              }
              if (a.rightP) {
                const n = cycle(p1CurRef.current, 1);
                setP1Cur(n);
                net.pick(n, false);
              }
              if (okOf(a)) {
                setP1Lock(true);
                net.pick(p1CurRef.current, true);
                sfxPlay.charName(p1CurRef.current);
                armGate();
              }
            } else if (backOf(a)) {
              setP1Lock(false);
              net.pick(p1CurRef.current, false);
              armGate();
            }
          } else {
            if (!p2LockRef.current) {
              if (a.leftP) {
                const n = cycle(p2CurRef.current, -1);
                setP2Cur(n);
                net.pick(n, false);
              }
              if (a.rightP) {
                const n = cycle(p2CurRef.current, 1);
                setP2Cur(n);
                net.pick(n, false);
              }
              if (okOf(a)) {
                setP2Lock(true);
                net.pick(p2CurRef.current, true);
                sfxPlay.charName(p2CurRef.current);
                armGate();
              }
            } else if (backOf(a)) {
              setP2Lock(false);
              net.pick(p2CurRef.current, false);
              armGate();
            }
          }
        } else if (dual) {
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
        const net = netRef.current;
        if (m.leftP) setStageCur((s) => cycleStage(s, -1));
        if (m.rightP) setStageCur((s) => cycleStage(s, 1));
        if (!gated() && m.kickRP) {
          armGate();
          if (!net.role) {
            setP1Lock(false);
            setP2Lock(false);
            g.screen = "select";
            g.pushHud();
          }
        }
        if (!gated() && (m.kickLP || m.punchLP || m.startP)) {
          armGate();
          if (net.role === "host") net.stage(stageCurRef.current);
          else if (!net.role) g.confirmStage(stageCurRef.current);
        }
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
    const net = netRef.current;
    if (net.role) {
      if (net.role === "host") {
        if (p1Lock) return;
        if (touchUi && !(touchPick && touchPick.slot === 1 && touchPick.id === id)) {
          setTouchPick({ slot: 1, id });
          setP1Cur(id);
          net.pick(id, false);
          return;
        }
        setTouchPick(null);
        setP1Cur(id);
        setP1Lock(true);
        net.pick(id, true);
        sfxPlay.charName(id);
        armGate();
      } else {
        if (p2Lock) return;
        if (touchUi && !(touchPick && touchPick.slot === 2 && touchPick.id === id)) {
          setTouchPick({ slot: 2, id });
          setP2Cur(id);
          net.pick(id, false);
          return;
        }
        setTouchPick(null);
        setP2Cur(id);
        setP2Lock(true);
        net.pick(id, true);
        sfxPlay.charName(id);
        armGate();
      }
      return;
    }
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
      className="relative flex h-[100dvh] w-[100dvw] max-w-none items-center justify-center overflow-hidden bg-bg text-fg"
      onPointerDown={() => {
        boot();
        if (!titleStung.current && hudRef.current.screen === "title" && !hudRef.current.loading) {
          titleStung.current = true;
          sfxPlay.title();
        }
      }}
    >
      <div className="relative h-full w-full overflow-hidden">
      <canvas ref={canvasRef} className="block h-full w-full touch-none bg-bg" />

      {hud.loading && hud.loadPct < 0.995 && (
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
        <div className="fixed inset-0 z-10 flex h-[100dvh] w-[100dvw] flex-col overflow-hidden bg-black">
          <img
            src={asset("/ui/mainmenu-v31.jpg")}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full max-h-none max-w-none object-cover"
            style={{ objectPosition: "center 18%" }}
            draggable={false}
          />
          <div
            className={`relative z-[1] mt-auto flex flex-col items-center bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 ${
              touchUi ? "gap-1 pb-3 pt-3" : "gap-1 pb-10 pt-16"
            }`}
          >
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
                    className={`font-display min-w-48 text-center tracking-wide transition-colors [text-shadow:0_1px_3px_rgba(0,0,0,0.9)] ${
                      touchUi
                        ? "min-h-0 px-3 py-0.5 text-[clamp(15px,4.2vh,20px)] leading-tight"
                        : "min-h-11 min-w-64 px-6 text-2xl sm:text-3xl"
                    } ${
                      titleIdx === item.i ? "text-gold" : "text-white/90 hover:text-fg"
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
                    className={`font-display min-w-48 text-center tracking-wide transition-colors [text-shadow:0_1px_3px_rgba(0,0,0,0.9)] ${
                      d === "szopni"
                        ? touchUi
                          ? "min-h-0 px-3 py-0.5 text-[clamp(14px,3.8vh,18px)] leading-tight"
                          : "min-h-11 min-w-64 px-6 text-xl sm:text-2xl"
                        : touchUi
                          ? "min-h-0 px-3 py-0.5 text-[clamp(15px,4.2vh,20px)] leading-tight"
                          : "min-h-11 min-w-64 px-6 text-2xl sm:text-3xl"
                    } ${diff === d ? "text-gold" : "text-white/90 hover:text-fg"}`}
                  >
                    {diff === d ? "▸ " : ""}
                    {difficultyLabel(d)}
                  </button>
                ))}
          </div>
          {menu === "root" && (
            <>
            <div className={`absolute left-3 z-10 flex flex-col items-start ${touchUi ? "top-2 gap-1" : "top-4 gap-1"}`}>
              <button
                type="button"
                onClick={() => {
                  setTitleIdx(6);
                  setPatchIdx(0);
                  setUpdates(true);
                }}
                className={`font-display text-left tracking-wide [text-shadow:0_1px_3px_rgba(0,0,0,0.9)] ${
                  touchUi ? "min-h-0 px-2 py-0.5 text-[clamp(12px,3.4vh,16px)] leading-tight" : "min-h-11 px-4 text-lg sm:text-xl"
                } ${
                  titleIdx === 6 ? "text-gold" : "text-white/90 hover:text-fg"
                }`}
              >
                {titleIdx === 6 ? "▸ Frissítések" : "Frissítések"}
              </button>
            </div>
            <div className={`absolute right-3 z-10 flex flex-col items-end ${touchUi ? "bottom-2 gap-1" : "bottom-4 gap-1"}`}>
              <button
                type="button"
                onClick={() => {
                  setTitleIdx(5);
                  setSetIdx(0);
                  setSettings(true);
                }}
                className={`font-display text-right tracking-wide [text-shadow:0_1px_3px_rgba(0,0,0,0.9)] ${
                  touchUi ? "min-h-0 px-2 py-0.5 text-[clamp(12px,3.4vh,16px)] leading-tight" : "min-h-11 px-4 text-lg sm:text-xl"
                } ${
                  titleIdx === 5 ? "text-gold" : "text-white/90 hover:text-fg"
                }`}
              >
                {titleIdx === 5 ? "▸ Beállítások" : "Beállítások"}
              </button>
            </div>
            </>
          )}
        </div>
      )}

      {hud.screen === "online" && (
        <Overlay>
          <h2 className="font-display text-3xl">ONLINE</h2>
          <p className="text-muted max-w-md text-center text-sm">
            A Host kap egy 4 jegyű kódot. A másik játékos ugyanazon a webes címen írja be. (itch.io-n a kódos online
            csak akkor megy, ha mindketten ugyanahhoz a szerverhez csatlakoznak — a Grok/webes hoston működik.)
          </p>
          {netErr && <p className="text-gold text-sm">{netErr}</p>}
          {netRef.current.status === "connecting" && (
            <p className="text-muted text-sm">Kapcsolódás a szerverhez…</p>
          )}
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <MenuBtn
              onClick={() => {
                boot();
                setNetErr(null);
                setOnlineIdx(0);
                netRef.current.connect({ role: "host", name: "HOST", char: "renike" });
              }}
            >
              {onlineIdx === 0 ? "▸ HOST" : "HOST"}
            </MenuBtn>
            <MenuBtn
              onClick={() => {
                boot();
                setNetErr(null);
                setOnlineIdx(1);
                const code = joinCode.replace(/\D/g, "").slice(0, 4);
                if (code.length !== 4) {
                  setNetErr("Írj be egy 4 jegyű kódot.");
                  return;
                }
                netRef.current.connect({ role: "guest", name: "JOIN", char: "ricsi", code });
              }}
            >
              {onlineIdx === 1 ? "▸ CSATLAKOZÁS" : "CSATLAKOZÁS"}
            </MenuBtn>
          </div>
          <label className="text-muted mt-3 flex w-full max-w-sm flex-col gap-1 text-sm">
            Csatlakozás kódja
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              maxLength={4}
              placeholder="pl. 4821"
              className="border-border bg-surface min-h-11 rounded-md border px-3 text-center font-mono text-2xl tracking-[0.4em] text-fg"
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
            gameRef.current?.endOnline("online");
          }}
        />
      )}

      {(hud.screen === "select" || hud.screen === "stage") && (
        <div className="absolute inset-0 z-10 flex flex-col overflow-hidden bg-[#1a1210]">
          {STAGE_IDS.map((id) => {
            const show = hud.screen === "stage" ? stageCur === id : id === "sintertanya";
            return (
              <img
                key={id}
                src={asset(STAGES[id].blur)}
                alt=""
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                style={{ opacity: show ? 1 : 0 }}
                draggable={false}
              />
            );
          })}
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 min-h-0 flex-1">
          <button
            type="button"
            onClick={() => {
              armGate();
              if (hud.screen === "stage" && !netRef.current.role) {
                setP1Lock(false);
                setP2Lock(false);
                gameRef.current && (gameRef.current.screen = "select");
                gameRef.current?.pushHud();
                return;
              }
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
            visible={!hud.versusCpu && (hud.pads >= 2 || !!netRef.current.role) ? true : p1Lock || hud.screen === "stage"}
          />
          </div>
          <div className="relative z-10 w-full border-t border-white/20 bg-zinc-500/45 px-2 py-2.5 shadow-[0_-8px_28px_rgba(0,0,0,0.28)] backdrop-blur-[6px] sm:px-4 sm:py-3">
            <div
              className={`flex w-full justify-center gap-1.5 ${touchUi ? "flex-wrap" : "flex-nowrap"}`}
            >
            {hud.screen === "stage"
              ? STAGE_IDS.map((id) => {
                  const s = STAGES[id];
                  const on = stageCur === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setStageCur(id);
                        const net = netRef.current;
                        if (net.role === "host") net.stage(id);
                        else if (!net.role) gameRef.current?.confirmStage(id);
                      }}
                      onMouseEnter={() => setStageCur(id)}
                      className={`relative h-12 w-20 overflow-hidden rounded-sm sm:h-14 sm:w-24 ${
                        on ? "ring-2 ring-gold" : "ring-1 ring-white/30"
                      }`}
                    >
                      <img src={asset(s.art)} alt={s.nameHu} className="size-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-black/65 px-0.5 text-center text-[9px] leading-4 text-white sm:text-[10px]">
                        {s.nameHu}
                      </span>
                    </button>
                  );
                })
              : ids.map((id) => {
                  const dual = !hud.versusCpu && (hud.pads >= 2 || !!netRef.current.role);
                  const p1on = p1Cur === id && (dual || !p1Lock);
                  const p2on = p2Cur === id && (dual || p1Lock);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => pickSelectChar(id)}
                      className="relative size-11 shrink-0 overflow-hidden rounded-sm bg-bg/80 sm:size-12"
                      style={{
                        boxShadow: [p1on ? "0 0 0 2px #c43b2e" : "0 0 0 1px #3a2a22", p2on ? "0 0 0 4px #2e6ec4" : ""]
                          .filter(Boolean)
                          .join(", "),
                      }}
                    >
                      <img src={asset(`/portraits/${id}-icon.png?v=10`)} alt={CHARACTERS[id].name} className="size-full object-cover object-top" />
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {hud.screen === "vs" && (
        <div className="absolute inset-0 z-20 overflow-hidden">
          <img
            src={asset(STAGES[hud.stage]?.art ?? STAGES.sintertanya.art)}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover"
            style={{ filter: "blur(14px) saturate(0.85)", transform: "scale(1.12)" }}
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 flex h-full items-end justify-between px-[3%] pb-[7%] pt-[6%]">
            <div className="flex h-full w-[40%] flex-col items-center justify-end">
              <img
                src={asset(`${VS_ART[hud.p1] ?? `/portraits/${hud.p1}.png`}?v=29`)}
                alt=""
                className="max-h-[78%] w-auto max-w-full object-contain object-bottom drop-shadow-[0_8px_24px_rgba(0,0,0,0.65)]"
              />
              <div className="font-display text-gold mt-2 text-center text-2xl tracking-wide sm:text-4xl">
                {CHARACTERS[hud.p1].name}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="font-display text-gold text-6xl tracking-[0.2em] drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] sm:text-8xl">
                VS
              </span>
            </div>
            <div className="flex h-full w-[40%] flex-col items-center justify-end">
              <img
                src={asset(`${VS_ART[hud.p2] ?? `/portraits/${hud.p2}.png`}?v=29`)}
                alt=""
                className="max-h-[78%] w-auto max-w-full object-contain object-bottom drop-shadow-[0_8px_24px_rgba(0,0,0,0.65)]"
                style={{ transform: "scaleX(-1)" }}
              />
              <div className="font-display text-gold mt-2 text-center text-2xl tracking-wide sm:text-4xl">
                {CHARACTERS[hud.p2].name}
                {hud.versusCpu ? " (CPU)" : ""}
              </div>
            </div>
          </div>
          {hud.vsLoading && (
            <div className="absolute bottom-4 left-1/2 z-20 w-72 max-w-[80vw] -translate-x-1/2 text-center">
              <p className="text-muted mb-1 text-xs tracking-widest">BETÖLTÉS</p>
              <div className="h-2 overflow-hidden rounded-sm border border-gold bg-bg">
                <div className="bg-gold h-full" style={{ width: `${Math.round(hud.vsLoadPct * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
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
              src={asset(`${VICTORY_ART[hud.winner]}?v=270`)}
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
          onKeys={() => {
            setKeySel("up");
            setKeyEdit(true);
          }}
        />
      )}
      {keyEdit && (
        <KeyMapPanel
          opt={opt}
          sel={keySel}
          waiting={keyWait}
          onSel={(id) => {
            setKeySel(id);
            setKeyWait(true);
          }}
          onReset={() => resetKeys()}
          onClose={() => {
            setKeyEdit(false);
            setKeyWait(false);
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
            Szinkronizálás…
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

      {touchUi && !landscape && <RotateHint />}

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
  void ips;
  void port;
  const L = net.lobby;
  const me = net.me;
  const code = net.roomCode || L.code;
  const waiting = !L.guest;
  return (
    <Overlay>
      <h2 className="font-display text-3xl">SZOBA</h2>
      {code && (
        <div className="border-gold bg-surface mt-1 rounded-md border px-8 py-4 text-center">
          <div className="text-muted text-xs uppercase tracking-widest">Kód</div>
          <div className="text-gold font-mono text-6xl font-bold tracking-[0.25em]">{code}</div>
        </div>
      )}
      <p className="text-muted max-w-md text-center text-sm">
        {waiting
          ? "Add oda a kódot a másik játékosnak. Ő CSATLAKOZÁS-nál írja be."
          : "Ha mindketten Ready, jön a karakterválasztó."}
      </p>
      {err && <p className="text-gold text-sm">{err}</p>}
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        {(["host", "guest"] as const).map((slot) => {
          const p = slot === "host" ? L.host : L.guest;
          return (
            <div
              key={slot}
              className={`w-44 rounded-lg border p-3 sm:w-56 ${
                p ? "border-gold bg-surface" : "border-border bg-bg/70"
              }`}
            >
              <div className="text-muted text-xs uppercase">{slot === "host" ? "Host • 1P" : "Csatlakozás • 2P"}</div>
              {p ? (
                <>
                  <div className="font-display mt-2 text-xl">{p.name}</div>
                  <div className={p.ready ? "text-gold text-sm" : "text-muted text-sm"}>
                    {p.ready ? "READY" : "nem ready"}
                  </div>
                </>
              ) : (
                <p className="text-muted mt-6 text-sm">várakozás…</p>
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
  const pos = side === "left" ? "left-[2%]" : "right-[2%]";
  return (
    <div className={`absolute top-[5%] bottom-0 flex w-[32%] flex-col items-center ${pos}`}>
      {visible && (
        <div className="flex h-full w-full items-end justify-center">
          <div className="flex max-h-full flex-col items-center">
            <img
              src={asset(`/ui/vs/${id}.png?v=37`)}
              alt=""
              className={`min-h-0 w-auto max-h-[calc(100%-2.8rem)] max-w-full object-contain object-bottom drop-shadow-[0_10px_22px_rgba(0,0,0,0.7)] ${side === "right" ? "-scale-x-100" : ""}`}
            />
            <div
              className={`font-display mt-1.5 text-center text-2xl leading-none tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:text-4xl ${tone === "p1" ? "text-p1" : "text-p2"}`}
            >
              {name}
              {locked ? " ✓" : ""}
            </div>
          </div>
        </div>
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
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-bg px-6 text-center"
      onPointerDown={() => goLandscape()}
    >
      <div className="border-gold text-gold font-display rotate-90 rounded-md border px-4 py-6 text-4xl">▭</div>
      <h2 className="font-display text-3xl">FORDÍTSD EL</h2>
      <p className="text-muted max-w-sm text-lg">A játék csak fektetett módban megy. Forgasd el a telefont vízszintesre.</p>
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
        <p className="text-muted mt-2 text-sm">Xbox / DualSense</p>
        <ul className="mt-3 space-y-1 text-sm">
          <li>D-pad / bot — mozgás</li>
          <li>Dupla előre / dupla hátra — dash</li>
          <li>Y / △ — bal ütés · X / □ — jobb ütés</li>
          <li>A / ✕ — bal rúgás · B / ○ — jobb rúgás</li>
          <li>RT / R2 — védekezés. Guggolva + blokk = low védés</li>
          <li>LT / L2 — Super Dash (40 energia)</li>
          <li>LB / L1 special 1 · RB / R1 special 2</li>
          <li>Start / Options — szünet</li>
        </ul>
        <p className="text-muted mt-3 text-sm">Billentyűzet (alap, Beállításokban cserélhető)</p>
        <ul className="mt-1 space-y-1 text-sm">
          <li>WASD — mozgás / ugrás / guggolás</li>
          <li>U / H — ütések · J / B — rúgások · I / O — specialek</li>
          <li>Bal Ctrl — Super Dash · Space — blokk · Enter — szünet</li>
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
  onKeys,
}: {
  sel: number;
  opt: GameSettings;
  onClose: () => void;
  onPick: (i: number) => void;
  onCustomize: () => void;
  onKeys: () => void;
}) {
  const row = (i: number, label: string, value: string, extra?: React.ReactNode) => (
    <button
      key={i}
      type="button"
      onClick={() => {
        onPick(i);
        if (i === 0) nudgeSetting(0, 1);
        if (i === 7) onCustomize();
        if (i === 8) onKeys();
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
          {row(8, "Billentyűzet kiosztás", "▶")}
        </div>
        <div className="mt-4">
          <MenuBtn onClick={onClose}>Vissza</MenuBtn>
        </div>
      </div>
    </div>
  );
}

function KeyMapPanel({
  opt,
  sel,
  waiting,
  onSel,
  onReset,
  onClose,
}: {
  opt: GameSettings;
  sel: KeyAction;
  waiting: boolean;
  onSel: (id: KeyAction) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-bg/90 px-4">
      <div className="border-border bg-surface max-h-[90dvh] w-full max-w-lg overflow-auto rounded-lg border p-5">
        <h3 className="font-display text-2xl">Billentyűzet</h3>
        <p className="text-muted mt-1 text-sm">
          Kattints egy sorra, majd nyomd meg az új gombot. Esc: mégsem.
        </p>
        {waiting && (
          <p className="text-gold font-display mt-3 text-lg">Nyomj egy gombot… ({KEY_ACTIONS.find((x) => x.id === sel)?.label})</p>
        )}
        <div className="mt-3 space-y-1">
          {KEY_ACTIONS.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => onSel(row.id)}
              className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                sel === row.id ? "border-gold bg-gold/10" : "border-border"
              }`}
            >
              <span>{row.label}</span>
              <span className="text-gold font-display">{codeLabel(opt.keys[row.id] ?? DEFAULT_KEYS[row.id])}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <MenuBtn onClick={onReset}>Alaphelyzet</MenuBtn>
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
      {...hold(getSettings().keys[def.action] ?? DEFAULT_KEYS[def.action])}
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
          backgroundImage: `url(${asset("/stages/sintertanya.jpg?v=30")})`,
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
