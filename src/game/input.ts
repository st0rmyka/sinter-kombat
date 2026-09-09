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

function connectedPads() {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return [] as Gamepad[];
  return [...navigator.getGamepads()]
    .filter((g): g is Gamepad => !!g && g.buttons.length >= 4)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export function getPadCount() {
  return connectedPads().length;
}

export function rumble(index: number, ms: number, mag: number) {
  const pad = connectedPads()[index];
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
  const pads = connectedPads();
  const keys = fromKeyMap(getKeys(), {
    left: ["ArrowLeft"],
    right: ["ArrowRight"],
    up: ["ArrowUp"],
    down: ["ArrowDown"],
    start: ["Escape"],
  });
  let merged = keys;
  if (pads.length <= 1) {
    for (const p of pads) merged = merge(merged, fromPad(p));
  } else {
    merged = merge(merged, fromPad(pads[0]));
  }
  const a = edges(merged, prevP1);
  prevP1 = { ...a };
  return a;
}

export function sampleP2(): Actions {
  const pads = connectedPads();
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
  const pad = pads.length >= 2 ? pads[1] : undefined;
  const a = edges(merge(keys, fromPad(pad)), prevP2);
  prevP2 = { ...a };
  return a;
}

export function sampleMenu(): Actions {
  const pads = connectedPads();
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
