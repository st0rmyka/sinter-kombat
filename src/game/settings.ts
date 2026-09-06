const KEY = "sinter-settings-v1";
const PAD_REV = 2;

export type PadBtnId =
  | "l2"
  | "r2"
  | "up"
  | "left"
  | "down"
  | "right"
  | "l1"
  | "r1"
  | "pause"
  | "punchL"
  | "kickL"
  | "punchR"
  | "kickR";

export type PadBtnLayout = {
  x: number;
  y: number;
  scale: number;
  alpha: number;
};

export type PadLayout = Record<PadBtnId, PadBtnLayout>;

export const PAD_BTNS: { id: PadBtnId; code: string; label: string; kind: "round" | "mini" }[] = [
  { id: "l2", code: "ControlLeft", label: "L2", kind: "mini" },
  { id: "r2", code: "ShiftLeft", label: "R2", kind: "mini" },
  { id: "up", code: "ArrowUp", label: "↑", kind: "round" },
  { id: "left", code: "ArrowLeft", label: "←", kind: "round" },
  { id: "down", code: "ArrowDown", label: "↓", kind: "round" },
  { id: "right", code: "ArrowRight", label: "→", kind: "round" },
  { id: "l1", code: "KeyL", label: "L1", kind: "mini" },
  { id: "r1", code: "Semicolon", label: "R1", kind: "mini" },
  { id: "pause", code: "Enter", label: "Pause", kind: "mini" },
  { id: "punchL", code: "KeyJ", label: "△", kind: "round" },
  { id: "kickL", code: "KeyN", label: "✕", kind: "round" },
  { id: "punchR", code: "KeyK", label: "□", kind: "round" },
  { id: "kickR", code: "KeyM", label: "○", kind: "round" },
];

export function defaultPadLayout(): PadLayout {
  return {
    l2: { x: 5.5, y: 54, scale: 1, alpha: 1 },
    r2: { x: 13.5, y: 54, scale: 1, alpha: 1 },
    up: { x: 13.5, y: 69, scale: 1, alpha: 1 },
    left: { x: 5.5, y: 87, scale: 1, alpha: 1 },
    down: { x: 13.5, y: 87, scale: 1, alpha: 1 },
    right: { x: 21.5, y: 87, scale: 1, alpha: 1 },
    l1: { x: 78.5, y: 54, scale: 1, alpha: 1 },
    r1: { x: 86.5, y: 54, scale: 1, alpha: 1 },
    pause: { x: 94.5, y: 54, scale: 1, alpha: 1 },
    punchL: { x: 86.5, y: 69, scale: 1, alpha: 1 },
    kickL: { x: 78.5, y: 87, scale: 1, alpha: 1 },
    punchR: { x: 86.5, y: 87, scale: 1, alpha: 1 },
    kickR: { x: 94.5, y: 87, scale: 1, alpha: 1 },
  };
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function mergePad(raw: unknown): PadLayout {
  const base = defaultPadLayout();
  if (!raw || typeof raw !== "object") return base;
  const src = raw as Partial<Record<PadBtnId, Partial<PadBtnLayout>>>;
  for (const b of PAD_BTNS) {
    const p = src[b.id];
    if (!p) continue;
    base[b.id] = {
      x: clamp(Number(p.x ?? base[b.id].x), 2, 96),
      y: clamp(Number(p.y ?? base[b.id].y), 2, 94),
      scale: clamp(Number(p.scale ?? 1), 0.25, 1.5),
      alpha: clamp(Number(p.alpha ?? 1), 0.25, 1),
    };
  }
  return base;
}

export type GameSettings = {
  soundOn: boolean;
  sfx: number;
  music: number;
  announcer: number;
  hud: number;
  touch: number;
  touchAlpha: number;
  pad: PadLayout;
  padRev: number;
};

const DEF: GameSettings = {
  soundOn: true,
  sfx: 1,
  music: 1,
  announcer: 1,
  hud: 1,
  touch: 1,
  touchAlpha: 0.75,
  pad: defaultPadLayout(),
  padRev: PAD_REV,
};

let cur: GameSettings = { ...DEF, pad: defaultPadLayout() };
const listeners = new Set<() => void>();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const p = JSON.parse(raw) as Partial<GameSettings>;
    const freshPad = Number(p.padRev) !== PAD_REV;
    cur = {
      soundOn: p.soundOn !== false,
      sfx: clamp(Number(p.sfx ?? 1), 0, 1),
      music: clamp(Number(p.music ?? 1), 0, 1),
      announcer: clamp(Number(p.announcer ?? 1), 0, 1),
      hud: clamp(Number(p.hud ?? 1), 0.5, 1.25),
      touch: clamp(Number(p.touch ?? 1), 0.5, 1.5),
      touchAlpha: clamp(Number(p.touchAlpha ?? 0.75), 0.25, 1),
      pad: freshPad ? defaultPadLayout() : mergePad(p.pad),
      padRev: PAD_REV,
    };
  } catch {
    cur = { ...DEF, pad: defaultPadLayout() };
  }
}

load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cur));
  } catch {
    /* ignore */
  }
  for (const fn of listeners) fn();
}

export function getSettings() {
  return { ...cur, pad: { ...cur.pad } };
}

export function subscribeSettings(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function patchSettings(p: Partial<GameSettings>) {
  if (p.soundOn !== undefined) cur.soundOn = p.soundOn;
  if (p.sfx !== undefined) cur.sfx = clamp(p.sfx, 0, 1);
  if (p.music !== undefined) cur.music = clamp(p.music, 0, 1);
  if (p.announcer !== undefined) cur.announcer = clamp(p.announcer, 0, 1);
  if (p.hud !== undefined) cur.hud = clamp(p.hud, 0.5, 1.25);
  if (p.touch !== undefined) cur.touch = clamp(p.touch, 0.5, 1.5);
  if (p.touchAlpha !== undefined) cur.touchAlpha = clamp(p.touchAlpha, 0.25, 1);
  if (p.pad !== undefined) {
    cur.pad = mergePad(p.pad);
    cur.padRev = PAD_REV;
  }
  save();
}

export function patchPadBtn(id: PadBtnId, p: Partial<PadBtnLayout>) {
  const n = { ...cur.pad[id] };
  if (p.x !== undefined) n.x = clamp(p.x, 2, 96);
  if (p.y !== undefined) n.y = clamp(p.y, 2, 94);
  if (p.scale !== undefined) n.scale = clamp(p.scale, 0.25, 1.5);
  if (p.alpha !== undefined) n.alpha = clamp(p.alpha, 0.25, 1);
  cur.pad = { ...cur.pad, [id]: n };
  cur.padRev = PAD_REV;
  save();
}

export function resetPadLayout() {
  cur.pad = defaultPadLayout();
  cur.padRev = PAD_REV;
  save();
}

export function getHudScale() {
  return cur.hud;
}

export function getTouchScale() {
  return cur.touch;
}

export function getPadLayout() {
  return cur.pad;
}
