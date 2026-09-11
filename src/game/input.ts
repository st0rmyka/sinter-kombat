import { getKeys, type KeyAction } from "./settings";

export type Actions = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  punchL: boolean;
  punchR: boolean;
  kickL: boolean;
  kickR: boolean;
  special: boolean;
  special2: boolean;
  superDash: boolean;
  block: boolean;
  start: boolean;
  leftP: boolean;
  rightP: boolean;
  upP: boolean;
  downP: boolean;
  punchLP: boolean;
  punchRP: boolean;
  kickLP: boolean;
  kickRP: boolean;
  specialP: boolean;
  special2P: boolean;
  superDashP: boolean;
  startP: boolean;
};

const empty = (): Actions => ({
  left: false,
  right: false,
  up: false,
  down: false,
  punchL: false,
  punchR: false,
  kickL: false,
  kickR: false,
  special: false,
  special2: false,
  superDash: false,
  block: false,
  start: false,
  leftP: false,
  rightP: false,
  upP: false,
  downP: false,
  punchLP: false,
  punchRP: false,
  kickLP: false,
  kickRP: false,
  specialP: false,
  special2P: false,
  superDashP: false,
  startP: false,
});

const down = new Set<string>();
const virtual = new Set<string>();
let prevP1 = empty();
let prevP2 = empty();
let prevMenu = empty();

export function installInput() {
  const onDown = (e: KeyboardEvent) => {
    down.add(e.code);
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code) ||
      e.code.startsWith("Numpad")
    ) {
      e.preventDefault();
    }
  };
  const onUp = (e: KeyboardEvent) => down.delete(e.code);
  const clear = () => down.clear();
  const onPad = () => {
    void navigator.getGamepads?.();
  };
  window.addEventListener("keydown", onDown);
  window.addEventListener("keyup", onUp);
  window.addEventListener("blur", clear);
  window.addEventListener("gamepadconnected", onPad);
  window.addEventListener("gamepaddisconnected", onPad);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clear();
  });
  return () => {
    window.removeEventListener("keydown", onDown);
    window.removeEventListener("keyup", onUp);
    window.removeEventListener("blur", clear);
    window.removeEventListener("gamepadconnected", onPad);
    window.removeEventListener("gamepaddisconnected", onPad);
  };
}

export function pressVirtual(code: string) {
  virtual.add(code);
  down.add(code);
}
export function releaseVirtual(code: string) {
  virtual.delete(code);
  down.delete(code);
}

function normalizePadId(id: string) {
  return (id || "")
    .toLowerCase()
    .replace(/\(standard gamepad[^)]*\)/g, "")
    .replace(/extended gamepad/g, "")
    .replace(/vendor:\s*[0-9a-f]+/g, "")
    .replace(/product:\s*[0-9a-f]+/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function vendorProduct(id: string) {
  const m = (id || "").toLowerCase().match(/vendor:\s*([0-9a-f]+).*product:\s*([0-9a-f]+)/);
  return m ? `${m[1]}:${m[2]}` : "";
}

function padIdle(g: Gamepad) {
  for (let i = 0; i < Math.min(g.buttons.length, 16); i++) {
    if ((g.buttons[i]?.value ?? 0) > 0.35 || g.buttons[i]?.pressed) return false;
  }
  for (let i = 0; i < Math.min(g.axes.length, 4); i++) {
    if (Math.abs(g.axes[i] ?? 0) > 0.28) return false;
  }
  return true;
}

function padStateSame(a: Gamepad, b: Gamepad) {
  const bn = Math.min(a.buttons.length, b.buttons.length, 16);
  for (let i = 0; i < bn; i++) {
    const va = a.buttons[i]?.value ?? 0;
    const vb = b.buttons[i]?.value ?? 0;
    if (Math.abs(va - vb) > 0.2) return false;
  }
  const an = Math.min(a.axes.length, b.axes.length, 4);
  for (let i = 0; i < an; i++) {
    if (Math.abs((a.axes[i] ?? 0) - (b.axes[i] ?? 0)) > 0.18) return false;
  }
  return true;
}

function rawPads() {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return [] as Gamepad[];
  return [...navigator.getGamepads()].filter((g): g is Gamepad => !!g && g.buttons.length >= 4);
}

/** One entry per physical controller. Mac/Steam often expose the same pad twice. */
function connectedPads() {
  const raw = rawPads().sort((a, b) => a.index - b.index);
  const byFamily = new Map<string, Gamepad[]>();
  for (const g of raw) {
    const vp = vendorProduct(g.id);
    const key = vp || normalizePadId(g.id) || `idx:${g.index}`;
    const list = byFamily.get(key) ?? [];
    list.push(g);
    byFamily.set(key, list);
  }
  const unique: Gamepad[] = [];
  for (const group of byFamily.values()) {
    const std = group.filter((g) => g.mapping === "standard");
    const pool = (std.length ? std : group).sort((a, b) => a.index - b.index);
    const kept: Gamepad[] = [];
    for (const g of pool) {
      const twin = kept.find((u) => {
        if (u.index === g.index) return true;
        if (u.mapping !== g.mapping) return true;
        if (padIdle(u) && padIdle(g)) return true;
        if (!padIdle(u) && !padIdle(g) && padStateSame(u, g)) return true;
        return false;
      });
      if (twin) {
        if (padIdle(twin) && !padIdle(g)) kept[kept.indexOf(twin)] = g;
        continue;
      }
      kept.push(g);
    }
    unique.push(...kept);
  }
  unique.sort((a, b) => a.index - b.index);
  return unique;
}

let lockP1 = -1;
let lockP2 = -1;

function assignedPads() {
  const pads = connectedPads();
  const live = new Set(pads.map((p) => p.index));
  if (lockP1 >= 0 && !live.has(lockP1)) lockP1 = -1;
  if (lockP2 >= 0 && !live.has(lockP2)) lockP2 = -1;
  if (pads.length < 2) lockP2 = -1;
  const p1Idle = lockP1 >= 0 ? pads.find((p) => p.index === lockP1) : undefined;
  if (p1Idle && padIdle(p1Idle)) {
    const active = pads.find((p) => p.index !== lockP2 && p.index !== lockP1 && !padIdle(p));
    if (active) lockP1 = active.index;
  }
  for (const p of pads) {
    if (lockP1 < 0 && p.index !== lockP2) lockP1 = p.index;
    else if (pads.length >= 2 && lockP2 < 0 && p.index !== lockP1) lockP2 = p.index;
  }
  const p1 = pads.find((p) => p.index === lockP1);
  const p2 = pads.find((p) => p.index === lockP2);
  return { p1, p2, pads };
}

export function getPadCount() {
  return connectedPads().length;
}

export function rumble(index: number, ms: number, mag: number) {
  const { p1, p2 } = assignedPads();
  const pad = index === 0 ? p1 : p2;
  const act = pad?.vibrationActuator as GamepadHapticActuator | undefined;
  if (act && "playEffect" in act) {
    void act.playEffect("dual-rumble", {
      duration: ms,
      strongMagnitude: mag,
      weakMagnitude: mag * 0.7,
    });
  }
}

function btn(pad: Gamepad, i: number) {
  const b = pad.buttons[i];
  if (!b) return false;
  return b.pressed || b.value > 0.35;
}

function stick(pad: Gamepad, axis: number, sign: 1 | -1) {
  const v = pad.axes[axis] ?? 0;
  return sign < 0 ? v < -0.38 : v > 0.38;
}

function analogTrigger(pad: Gamepad, ...axes: number[]) {
  for (const i of axes) {
    const v = pad.axes[i];
    if (v == null) continue;
    if (v > 0.45) return true;
    if (v < -0.55) return true;
  }
  return false;
}

function fromPad(pad: Gamepad | undefined): Actions {
  const a = empty();
  if (!pad) return a;
  a.left = btn(pad, 14) || stick(pad, 0, -1);
  a.right = btn(pad, 15) || stick(pad, 0, 1);
  if (pad.axes[6] != null) {
    if (pad.axes[6] < -0.5) a.left = true;
    if (pad.axes[6] > 0.5) a.right = true;
  }
  a.up = btn(pad, 12) || stick(pad, 1, -1);
  a.down = btn(pad, 13) || stick(pad, 1, 1);
  if (pad.axes[7] != null) {
    if (pad.axes[7] < -0.5) a.up = true;
    if (pad.axes[7] > 0.5) a.down = true;
  }
  a.kickL = btn(pad, 0);
  a.kickR = btn(pad, 1);
  a.punchR = btn(pad, 2);
  a.punchL = btn(pad, 3);
  a.special = btn(pad, 4);
  a.special2 = btn(pad, 5);
  a.superDash = btn(pad, 6) || analogTrigger(pad, 4);
  a.block = btn(pad, 7) || analogTrigger(pad, 5);
  a.start = btn(pad, 9) || btn(pad, 8) || btn(pad, 11) || btn(pad, 16);
  return a;
}

function merge(base: Actions, extra: Actions): Actions {
  const a = { ...base };
  (Object.keys(base) as (keyof Actions)[]).forEach((k) => {
    if (typeof a[k] === "boolean") (a as Record<string, boolean>)[k] = !!(base[k] || extra[k]);
  });
  return a;
}

function edges(a: Actions, prev: Actions): Actions {
  a.leftP = a.left && !prev.left;
  a.rightP = a.right && !prev.right;
  a.upP = a.up && !prev.up;
  a.downP = a.down && !prev.down;
  a.punchLP = a.punchL && !prev.punchL;
  a.punchRP = a.punchR && !prev.punchR;
  a.kickLP = a.kickL && !prev.kickL;
  a.kickRP = a.kickR && !prev.kickR;
  a.specialP = a.special && !prev.special;
  a.special2P = a.special2 && !prev.special2;
  a.superDashP = a.superDash && !prev.superDash;
  a.startP = a.start && !prev.start;
  return a;
}

function held(code: string) {
  return down.has(code);
}

function fromKeyMap(map: Record<KeyAction, string>, extra?: Partial<Record<KeyAction, string[]>>): Actions {
  const a = empty();
  const hit = (id: KeyAction) => held(map[id]) || !!(extra?.[id]?.some((c) => held(c)));
  a.left = hit("left");
  a.right = hit("right");
  a.up = hit("up");
  a.down = hit("down");
  a.punchL = hit("punchL");
  a.punchR = hit("punchR");
  a.kickL = hit("kickL");
  a.kickR = hit("kickR");
  a.special = hit("special");
  a.special2 = hit("special2");
  a.superDash = hit("superDash");
  a.block = hit("block");
  a.start = hit("start");
  return a;
}

export function sampleP1(): Actions {
  const { p1, p2, pads } = assignedPads();
  const keys = fromKeyMap(getKeys(), {
    left: ["ArrowLeft"],
    right: ["ArrowRight"],
    up: ["ArrowUp"],
    down: ["ArrowDown"],
    start: ["Escape"],
  });
  let extra = empty();
  if (!p2 || pads.length < 2) {
    for (const pad of pads) extra = merge(extra, fromPad(pad));
  } else extra = fromPad(p1);
  const a = edges(merge(keys, extra), prevP1);
  prevP1 = { ...a };
  return a;
}

export function sampleP2(): Actions {
  const { p2 } = assignedPads();
  const keys: Actions = {
    ...empty(),
    left: held("Numpad4"),
    right: held("Numpad6"),
    up: held("Numpad8"),
    down: held("Numpad5"),
    punchL: held("Numpad7"),
    punchR: held("Numpad9"),
    kickL: held("Numpad1"),
    kickR: held("Numpad3"),
    special: held("Numpad0"),
    special2: held("NumpadDecimal"),
    superDash: held("ControlRight"),
    block: held("NumpadAdd"),
    start: held("NumpadEnter"),
  };
  const a = edges(merge(keys, fromPad(p2)), prevP2);
  prevP2 = { ...a };
  return a;
}

export function sampleMenu(): Actions {
  const { pads } = assignedPads();
  const k = getKeys();
  const keys = fromKeyMap(k, {
    left: ["ArrowLeft", "KeyA"],
    right: ["ArrowRight", "KeyD"],
    up: ["ArrowUp", "KeyW"],
    down: ["ArrowDown", "KeyS"],
    start: ["Enter", "Space", k.start],
    punchL: ["Enter", "Space", k.punchL, k.kickL],
    kickL: ["Enter", "Space", k.kickL],
    kickR: ["Escape", "Backspace", k.kickR],
  });
  let merged = keys;
  for (const pad of pads) merged = merge(merged, fromPad(pad));
  const a = edges(merged, prevMenu);
  prevMenu = { ...a };
  return a;
}

export function injectKeys(codes: string[]) {
  down.clear();
  for (const c of codes) down.add(c);
  for (const c of virtual) down.add(c);
}
