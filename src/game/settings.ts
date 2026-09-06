const KEY = "sinter-settings-v1";

export type GameSettings = {
  soundOn: boolean;
  sfx: number;
  music: number;
  announcer: number;
  hud: number;
  touch: number;
  touchAlpha: number;
};

const DEF: GameSettings = {
  soundOn: true,
  sfx: 1,
  music: 1,
  announcer: 1,
  hud: 1,
  touch: 1,
  touchAlpha: 0.75,
};

let cur: GameSettings = { ...DEF };
const listeners = new Set<() => void>();

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const p = JSON.parse(raw) as Partial<GameSettings>;
    cur = {
      soundOn: p.soundOn !== false,
      sfx: clamp(Number(p.sfx ?? 1), 0, 1),
      music: clamp(Number(p.music ?? 1), 0, 1),
      announcer: clamp(Number(p.announcer ?? 1), 0, 1),
      hud: clamp(Number(p.hud ?? 1), 0.5, 1.25),
      touch: clamp(Number(p.touch ?? 1), 0.5, 1.5),
      touchAlpha: clamp(Number(p.touchAlpha ?? 0.75), 0.25, 1),
    };
  } catch {
    cur = { ...DEF };
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
  return { ...cur };
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
  save();
}

export function getHudScale() {
  return cur.hud;
}

export function getTouchScale() {
  return cur.touch;
}
