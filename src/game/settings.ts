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

export type KeyAction =
  | "left"
  | "right"
  | "up"
  | "down"
  | "punchL"
  | "punchR"
  | "kickL"
  | "kickR"
  | "special"
  | "special2"
  | "superDash"
  | "block"
  | "start";

export const KEY_ACTIONS: { id: KeyAction; label: string }[] = [
  { id: "up", label: "Fel / ugrás" },
  { id: "down", label: "Le / guggolás" },
  { id: "left", label: "Balra" },
  { id: "right", label: "Jobbra" },
  { id: "punchL", label: "Bal ütés (△)" },
  { id: "punchR", label: "Jobb ütés (□)" },
  { id: "kickL", label: "Bal rúgás (✕)" },
  { id: "kickR", label: "Jobb rúgás (○)" },
  { id: "special", label: "Special 1 (L1)" },
  { id: "special2", label: "Special 2 (R1)" },
  { id: "superDash", label: "Super Dash (L2)" },
  { id: "block", label: "Blokk (R2)" },
  { id: "start", label: "Szünet" },
];

export const DEFAULT_KEYS: Record<KeyAction, string> = {
  left: "KeyA",
  right: "KeyD",
  up: "KeyW",
  down: "KeyS",
  punchL: "KeyU",
  punchR: "KeyH",
  kickL: "KeyJ",
  kickR: "KeyB",
  special: "KeyI",
  special2: "KeyO",
  superDash: "ControlLeft",
  block: "Space",
  start: "Enter",
};

export function codeLabel(code: string) {
  const map: Record<string, string> = {
    Space: "Space",
    ControlLeft: "Bal Ctrl",
    ControlRight: "Jobb Ctrl",
    ShiftLeft: "Bal Shift",
    ShiftRight: "Jobb Shift",
    AltLeft: "Bal Alt",
    AltRight: "Jobb Alt",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    Enter: "Enter",
    Escape: "Esc",
    Backspace: "Backspace",
    Tab: "Tab",
    Semicolon: ";",
    Quote: "'",
    BracketLeft: "[",
    BracketRight: "]",
    Minus: "-",
    Equal: "=",
    Comma: ",",
    Period: ".",
    Slash: "/",
  };
  if (map[code]) return map[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return "Num " + code.slice(6);
  return code;
}

function mergeKeys(raw: unknown): Record<KeyAction, string> {
  const out = { ...DEFAULT_KEYS };
  if (!raw || typeof raw !== "object") return out;
  const src = raw as Partial<Record<KeyAction, string>>;
  for (const { id } of KEY_ACTIONS) {
    const v = src[id];
    if (typeof v === "string" && v.length > 0) out[id] = v;
  }
  return out;
}

export const PAD_BTNS: { id: PadBtnId; action: KeyAction; label: string; kind: "round" | "mini" }[] = [
  { id: "l2", action: "superDash", label: "L2", kind: "mini" },
  { id: "r2", action: "block", label: "R2", kind: "mini" },
  { id: "up", action: "up", label: "↑", kind: "round" },
  { id: "left", action: "left", label: "←", kind: "round" },
  { id: "down", action: "down", label: "↓", kind: "round" },
  { id: "right", action: "right", label: "→", kind: "round" },
  { id: "l1", action: "special", label: "L1", kind: "mini" },
  { id: "r1", action: "special2", label: "R1", kind: "mini" },
  { id: "pause", action: "start", label: "Pause", kind: "mini" },
  { id: "punchL", action: "punchL", label: "△", kind: "round" },
  { id: "kickL", action: "kickL", label: "✕", kind: "round" },
  { id: "punchR", action: "punchR", label: "□", kind: "round" },
  { id: "kickR", action: "kickR", label: "○", kind: "round" },
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
  keys: Record<KeyAction, string>;
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
  keys: { ...DEFAULT_KEYS },
};

let cur: GameSettings = { ...DEF, pad: defaultPadLayout(), keys: { ...DEFAULT_KEYS } };
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
      keys: mergeKeys(p.keys),
    };
  } catch {
    cur = { ...DEF, pad: defaultPadLayout(), keys: { ...DEFAULT_KEYS } };
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
  return { ...cur, pad: { ...cur.pad }, keys: { ...cur.keys } };
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
  if (p.keys !== undefined) cur.keys = mergeKeys(p.keys);
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

export function patchKey(action: KeyAction, code: string) {
  cur.keys = { ...cur.keys, [action]: code };
  save();
}

export function resetKeys() {
  cur.keys = { ...DEFAULT_KEYS };
  save();
}

export function getKeys() {
  return { ...cur.keys };
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
