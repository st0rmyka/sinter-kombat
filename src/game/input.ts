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
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  };
  const onUp = (e: KeyboardEvent) => down.delete(e.code);
  const clear = () => down.clear();
  window.addEventListener("keydown", onDown);
  window.addEventListener("keyup", onUp);
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clear();
  });
  return () => {
    window.removeEventListener("keydown", onDown);
    window.removeEventListener("keyup", onUp);
    window.removeEventListener("blur", clear);
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
  return [...navigator.getGamepads()].filter((g): g is Gamepad => !!g);
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

function pressed(pad: Gamepad | undefined, i: number) {
  return !!pad?.buttons[i]?.pressed;
}

function trigger(pad: Gamepad | undefined, i: number) {
  const b = pad?.buttons[i];
  if (!b) return false;
  return b.pressed || b.value > 0.45;
}

function stick(pad: Gamepad | undefined, axis: number, sign: 1 | -1) {
  const v = pad?.axes[axis] ?? 0;
  return sign < 0 ? v < -0.38 : v > 0.38;
}

function fromPad(pad: Gamepad | undefined): Actions {
  const a = empty();
  if (!pad) return a;
  a.left = pressed(pad, 14) || stick(pad, 0, -1);
  a.right = pressed(pad, 15) || stick(pad, 0, 1);
  a.up = pressed(pad, 12) || stick(pad, 1, -1);
  a.down = pressed(pad, 13) || stick(pad, 1, 1);
  a.kickL = pressed(pad, 0);
  a.kickR = pressed(pad, 1);
  a.punchR = pressed(pad, 2);
  a.punchL = pressed(pad, 3);
  a.special = pressed(pad, 4);
  a.special2 = pressed(pad, 5);
  a.superDash = trigger(pad, 6);
  a.block = trigger(pad, 7);
  a.start = pressed(pad, 9) || pressed(pad, 8);
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

export function sampleP1(): Actions {
  const pads = connectedPads();
  const keys: Actions = {
    ...empty(),
    left: down.has("KeyA") || down.has("ArrowLeft"),
    right: down.has("KeyD") || down.has("ArrowRight"),
    up: down.has("KeyW") || down.has("ArrowUp") || down.has("Space"),
    down: down.has("KeyS") || down.has("ArrowDown"),
    punchL: down.has("KeyJ"),
    punchR: down.has("KeyK"),
    kickL: down.has("KeyN"),
    kickR: down.has("KeyM"),
    special: down.has("KeyL"),
    special2: down.has("Semicolon") || down.has("KeyQuote"),
    superDash: down.has("ControlLeft"),
    block: down.has("ShiftLeft") || down.has("ShiftRight"),
    start: down.has("Enter") || down.has("Escape"),
  };
  const a = edges(merge(keys, fromPad(pads[0])), prevP1);
  prevP1 = { ...a };
  return a;
}

export function sampleP2(): Actions {
  const pads = connectedPads();
  const keys: Actions = {
    ...empty(),
    left: down.has("KeyF"),
    right: down.has("KeyH"),
    up: down.has("KeyT"),
    down: down.has("KeyG"),
    punchL: down.has("KeyU"),
    punchR: down.has("KeyI"),
    kickL: down.has("KeyO"),
    kickR: down.has("KeyP"),
    special: down.has("BracketLeft"),
    special2: down.has("BracketRight"),
    superDash: down.has("ControlRight") || down.has("Minus"),
    block: down.has("Slash"),
    start: down.has("Digit0"),
  };
  const pad = pads.length >= 2 ? pads[1] : undefined;
  const a = edges(merge(keys, fromPad(pad)), prevP2);
  prevP2 = { ...a };
  return a;
}

export function sampleMenu(): Actions {
  const pads = connectedPads();
  const keys: Actions = {
    ...empty(),
    left: down.has("KeyA") || down.has("ArrowLeft"),
    right: down.has("KeyD") || down.has("ArrowRight"),
    up: down.has("KeyW") || down.has("ArrowUp"),
    down: down.has("KeyS") || down.has("ArrowDown"),
    start: down.has("Enter") || down.has("Space"),
    punchL: down.has("Enter") || down.has("Space") || down.has("KeyJ"),
    punchR: down.has("KeyK"),
    kickL: down.has("KeyN") || down.has("Enter") || down.has("Space"),
    kickR: down.has("KeyM") || down.has("Escape") || down.has("Backspace"),
  };
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
