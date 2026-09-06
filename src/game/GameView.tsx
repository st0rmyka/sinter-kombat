import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { CHARACTERS, CHAR_IDS, CHAR_SKILLS, DIFFICULTIES, difficultyLabel, GAME_VERSION, STAGE_IDS, STAGES, winLine, KitchenKombat, type CharId, type Difficulty, type Hud, type StageId, type TrainPress } from "./engine";
import { installInput, pressVirtual, releaseVirtual, sampleMenu, sampleP1, sampleP2, getPadCount } from "./input";
import { isMuted, setMuted, sfxPlay, startMenuMusic, startKitchenDrone, stopKitchenDrone, stopStageMusic, unlockAudio } from "./audio";
import { NetPlay, fetchNetInfo, joinWsUrl } from "./net";

const PATCH_NOTES: { v: string; items: string[] }[] = [
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
  stage: "kitchen",
  netWait: false,
  loadPct: 0,
  training: false,
  dummy: "idle",
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
  const [stageCur, setStageCur] = useState<StageId>("kitchen");
  const [joinAddr, setJoinAddr] = useState("127.0.0.1");
  const [hostIps, setHostIps] = useState<string[]>([]);
  const [hostPort, setHostPort] = useState(8080);
  const [netErr, setNetErr] = useState<string | null>(null);
  const [lobbyTick, setLobbyTick] = useState(0);
  const netRef = useRef(new NetPlay());
  const hudRef = useRef(hud);
  hudRef.current = hud;
  const helpRef = useRef(help);
  helpRef.current = help;
  const updatesRef = useRef(updates);
  updatesRef.current = updates;
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
    setStageCur("kitchen");
    void cpu;
  };

  const boot = () => {
    unlockAudio();
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
    return () => {
      unbind();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      game.destroy();
      net.disconnect();
      stopKitchenDrone();
      stopStageMusic();
    };
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
      if (helpRef.current || updatesRef.current) {
        const m = sampleMenu();
        if (updatesRef.current) {
          if (m.upP) setPatchIdx((i) => Math.max(0, i - 1));
          if (m.downP) setPatchIdx((i) => Math.min(PATCH_NOTES.length - 1, i + 1));
        }
        if (!gated() && (m.kickLP || m.kickRP || m.startP)) {
          armGate();
          setHelp(false);
          setUpdates(false);
        }
        raf = requestAnimationFrame(tick);
        return;
      }
      if (h.screen === "title") {
        const m = sampleMenu();
        const diffs: Difficulty[] = DIFFICULTIES;
        const ok = !gated() && (m.kickLP || m.punchLP || m.startP);
        if (menuRef.current === "root") {
          if (m.upP) setTitleIdx((i) => (i + 4) % 5);
          if (m.downP) setTitleIdx((i) => (i + 1) % 5);
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
          const n = h.training ? 6 : 4;
          if (helpRef.current) {
            /* help overlay handles close */
          } else if (m.upP) setPauseIdx((i) => (i + n - 1) % n);
          else if (m.downP) setPauseIdx((i) => (i + 1) % n);
          else if (h.training && (m.leftP || m.rightP)) {
            const dir = m.leftP ? -1 : 1;
            const i = pauseIdxRef.current;
            if (i === 2) g.cycleDummy(dir as 1 | -1);
            else if (i === 3 && g.dummy === "cpu") g.cycleTrainDiff(dir as 1 | -1);
          } else if (back) {
            armGate();
            g.pauseToggle();
          } else if (ok) {
            const i = pauseIdxRef.current;
            if (h.training) {
              if (i === 0) g.pauseToggle();
              else if (i === 1) ask("Biztos újraindítod a meccset?", goRestart);
              else if (i === 2) g.cycleDummy(1);
              else if (i === 3) {
                if (g.dummy === "cpu") g.cycleTrainDiff(1);
              } else if (i === 4) {
                armGate();
                setHelp(true);
              } else ask("Biztos vissza akarsz lépni a főmenübe?", goTitle);
            } else if (i === 0) g.pauseToggle();
            else if (i === 1) ask("Biztos újraindítod a meccset?", goRestart);
            else if (i === 2) {
              armGate();
              setHelp(true);
            } else ask("Biztos vissza akarsz lépni a főmenübe?", goTitle);
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

      {hud.screen === "title" && !hud.loading && (
        <div
          className="absolute inset-0 z-10 flex flex-col"
          style={{
            backgroundImage: "url(/ui/mainmenu.png)",
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
        >
          <div className="from-bg/90 mt-auto flex flex-col items-center gap-1 bg-gradient-to-t to-transparent px-4 pb-10 pt-16">
            {menu === "root"
              ? (
                  [
                    { label: "1 Játékos VS CPU", i: 0 },
                    { label: "2 Játékos", i: 1 },
                    { label: "Online", i: 2 },
                    { label: "Gyakorló mód", i: 3 },
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
                      } else {
                        resetSelect(true);
                        gameRef.current?.chooseMode(true, diff, true);
                      }
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
            <button
              type="button"
              onClick={() => {
                setTitleIdx(4);
                setPatchIdx(0);
                setUpdates(true);
              }}
              className={`font-display absolute bottom-4 right-4 z-10 min-h-11 px-4 text-right text-lg tracking-wide sm:text-xl ${
                titleIdx === 4 ? "text-gold" : "text-fg/70 hover:text-fg"
              }`}
            >
              {titleIdx === 4 ? "▸ Frissítések" : "Frissítések"}
            </button>
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
                  onClick={() => {
                    if (gated()) return;
                    const dual = !hud.versusCpu && hud.pads >= 2;
                    if (dual) {
                      if (!p1Lock) {
                        setP1Cur(id);
                        setP1Lock(true);
                        sfxPlay.charName(id);
                        if (p2Lock) {
                          armGate();
                          gameRef.current?.goStage(id, p2Cur);
                        }
                      } else if (!p2Lock) {
                        setP2Cur(id);
                        setP2Lock(true);
                        sfxPlay.charName(id);
                        armGate();
                        gameRef.current?.goStage(p1Cur, id);
                      }
                      return;
                    }
                    if (!p1Lock) {
                      setP1Cur(id);
                      setP1Lock(true);
                      sfxPlay.charName(id);
                      armGate();
                    } else if (!p2Lock) {
                      setP2Cur(id);
                      setP2Lock(true);
                      sfxPlay.charName(id);
                      armGate();
                      gameRef.current?.goStage(p1Cur, id);
                    }
                  }}
                  className="relative size-12 overflow-hidden rounded-sm bg-bg/80 sm:size-14"
                  style={{
                    boxShadow: [p1on ? "0 0 0 2px #c43b2e" : "0 0 0 1px #3a2a22", p2on ? "0 0 0 4px #2e6ec4" : ""]
                      .filter(Boolean)
                      .join(", "),
                  }}
                >
                  <img src={`/portraits/${id}-icon.png?v=9`} alt={CHARACTERS[id].name} className="size-full object-cover object-top" />
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
            <img src={`/portraits/${hud.p1}.png?v=9`} alt="" className="size-28 rounded-md object-cover sm:size-40" />
            <div className="font-display text-gold text-4xl">VS</div>
            <img src={`/portraits/${hud.p2}.png?v=9`} alt="" className="size-28 rounded-md object-cover sm:size-40" />
          </div>
        </Overlay>
      )}

      {hud.screen === "pause" && (
        <Overlay>
          <h2 className="font-display text-4xl">SZÜNET</h2>
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
                    { label: "Újraindítás", i: 1 },
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
                    { label: "Irányítás", i: 4 },
                    { label: "Főmenü", i: 5 },
                  ] as const)
                : ([
                    { label: "Folytatás", i: 0 },
                    { label: "Újraindítás", i: 1 },
                    { label: "Irányítás", i: 2 },
                    { label: "Főmenü", i: 3 },
                  ] as const)
              ).map((item) => (
                <MenuBtn
                  key={item.i}
                  active={pauseIdx === item.i}
                  onClick={() => {
                    setPauseIdx(item.i);
                    const g = gameRef.current;
                    if (!g) return;
                    if (hud.training) {
                      if (item.i === 0) g.pauseToggle();
                      else if (item.i === 1) ask("Biztos újraindítod a meccset?", goRestart);
                      else if (item.i === 2) g.cycleDummy(1);
                      else if (item.i === 3) {
                        if (g.dummy === "cpu") g.cycleTrainDiff(1);
                      } else if (item.i === 4) setHelp(true);
                      else ask("Biztos vissza akarsz lépni a főmenübe?", goTitle);
                    } else if (item.i === 0) g.pauseToggle();
                    else if (item.i === 1) ask("Biztos újraindítod a meccset?", goRestart);
                    else if (item.i === 2) setHelp(true);
                    else ask("Biztos vissza akarsz lépni a főmenübe?", goTitle);
                  }}
                >
                  {item.label}
                </MenuBtn>
              ))}
              {hud.training && (
                <p className="text-muted mt-2 text-center text-xs">
                  Ellenfél / nehézség: bal-jobb. Kör: vissza.
                </p>
              )}
            </>
          )}
        </Overlay>
      )}

      {hud.screen === "result" && (
        <Overlay>
          <h2 className="font-display text-4xl">{hud.winner ? winLine(hud.winner) : "DÖNTETLEN"}</h2>
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
        </Overlay>
      )}

      {help && <Help p1={hud.p1} p2={hud.p2} onClose={() => setHelp(false)} />}
      {updates && (
        <Updates
          sel={patchIdx}
          onClose={() => setUpdates(false)}
          onPick={setPatchIdx}
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

      {hud.screen === "fight" && touchUi && <TouchPad />}
      </div>

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
          void unlockAudio().then((wasSuspended) => {
            if (wasSuspended && !isMuted()) {
              startMenuMusic();
              return;
            }
            const n = !isMuted();
            setMuted(n);
            setMutedUi(n);
            if (!n) startMenuMusic();
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
                    src={`/portraits/${p.char}.png?v=9`}
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
              src={`/sprites/${id}/idle.png?v=60`}
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

function Overlay({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <div
      className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-4 ${
        dim ? "bg-bg/40" : "bg-bg/75"
      }`}
    >
      {children}
    </div>
  );
}

function MenuBtn({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-md border px-6 py-2 font-semibold uppercase tracking-wide ${
        active ? "border-gold bg-gold text-bg" : "border-gold bg-surface text-fg hover:bg-gold hover:text-bg"
      }`}
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

function TouchPad() {
  const hold = (code: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
      pressVirtual(code);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      releaseVirtual(code);
    },
    onPointerCancel: () => releaseVirtual(code),
  });
  const btn =
    "flex size-14 items-center justify-center rounded-full border border-gold/70 bg-surface/80 text-base font-bold text-fg active:bg-gold active:text-bg";
  const mini =
    "flex h-11 min-w-14 items-center justify-center rounded-md border border-gold/70 bg-surface/80 px-2 text-xs font-bold uppercase text-fg active:bg-gold active:text-bg";
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex flex-col items-center gap-2">
        <button type="button" className={btn} {...hold("ArrowUp")}>
          ↑
        </button>
        <div className="flex gap-2">
          <button type="button" className={btn} {...hold("ArrowLeft")}>
            ←
          </button>
          <button type="button" className={btn} {...hold("ArrowDown")}>
            ↓
          </button>
          <button type="button" className={btn} {...hold("ArrowRight")}>
            →
          </button>
        </div>
        <button type="button" className={mini} {...hold("ShiftLeft")}>
          Blokk
        </button>
      </div>
      <div className="pointer-events-auto flex flex-col items-center gap-2">
        <div className="flex gap-2">
          <button type="button" className={mini} {...hold("KeyL")}>
            L1
          </button>
          <button type="button" className={mini} {...hold("Semicolon")}>
            R1
          </button>
          <button type="button" className={mini} {...hold("Enter")}>
            Pause
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <span />
          <button type="button" className={btn} {...hold("KeyJ")}>
            △
          </button>
          <span />
          <button type="button" className={btn} {...hold("KeyN")}>
            ✕
          </button>
          <button type="button" className={btn} {...hold("KeyK")}>
            □
          </button>
          <button type="button" className={btn} {...hold("KeyM")}>
            ○
          </button>
        </div>
      </div>
    </div>
  );
}
