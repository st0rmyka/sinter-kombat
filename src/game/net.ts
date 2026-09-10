export type NetRole = "host" | "guest";
export type NetChar = "renike" | "ricsi" | "cica" | "agi" | "cricsi" | "jezus" | "hoffer" | "farajo";

export type LobbyPlayer = {
  name: string;
  ready: boolean;
  char: NetChar;
  role: NetRole;
};

export type LobbyState = {
  host: LobbyPlayer | null;
  guest: LobbyPlayer | null;
  ips: string[];
  started: boolean;
  code: string | null;
  phase: "lobby" | "select" | "stage" | "fight";
};

type StartMsg = { type: "start"; p1: NetChar; p2: NetChar; delay: number; stage?: string };

export type NetHandlers = {
  onLobby?: (s: LobbyState) => void;
  onStart?: (s: StartMsg) => void;
  onGo?: () => void;
  onInput?: (frame: number, bits: number) => void;
  onDrop?: (reason: string) => void;
  onError?: (msg: string) => void;
  onStatus?: (s: string) => void;
  onHelloOk?: (role: NetRole, code: string) => void;
  onOpenSelect?: () => void;
  onOpenStage?: (p1: NetChar, p2: NetChar) => void;
  onPick?: (role: NetRole, char: NetChar, locked: boolean) => void;
};

export function packBits(a: {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  punchL: boolean;
  punchR: boolean;
  kickL: boolean;
  kickR: boolean;
  special: boolean;
  special2?: boolean;
  superDash?: boolean;
  block: boolean;
}): number {
  let b = 0;
  if (a.left) b |= 1 << 0;
  if (a.right) b |= 1 << 1;
  if (a.up) b |= 1 << 2;
  if (a.down) b |= 1 << 3;
  if (a.punchL) b |= 1 << 4;
  if (a.punchR) b |= 1 << 5;
  if (a.kickL) b |= 1 << 6;
  if (a.kickR) b |= 1 << 7;
  if (a.special) b |= 1 << 8;
  if (a.block) b |= 1 << 9;
  if (a.special2) b |= 1 << 10;
  if (a.superDash) b |= 1 << 11;
  return b;
}

export function unpackBits(
  bits: number,
  prev: number,
): {
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
} {
  const left = !!(bits & (1 << 0));
  const right = !!(bits & (1 << 1));
  const up = !!(bits & (1 << 2));
  const down = !!(bits & (1 << 3));
  const punchL = !!(bits & (1 << 4));
  const punchR = !!(bits & (1 << 5));
  const kickL = !!(bits & (1 << 6));
  const kickR = !!(bits & (1 << 7));
  const special = !!(bits & (1 << 8));
  const block = !!(bits & (1 << 9));
  const special2 = !!(bits & (1 << 10));
  const superDash = !!(bits & (1 << 11));
  return {
    left,
    right,
    up,
    down,
    punchL,
    punchR,
    kickL,
    kickR,
    special,
    special2,
    superDash,
    block,
    start: false,
    leftP: left && !(prev & (1 << 0)),
    rightP: right && !(prev & (1 << 1)),
    upP: up && !(prev & (1 << 2)),
    downP: down && !(prev & (1 << 3)),
    punchLP: punchL && !(prev & (1 << 4)),
    punchRP: punchR && !(prev & (1 << 5)),
    kickLP: kickL && !(prev & (1 << 6)),
    kickRP: kickR && !(prev & (1 << 7)),
    specialP: special && !(prev & (1 << 8)),
    special2P: special2 && !(prev & (1 << 10)),
    superDashP: superDash && !(prev & (1 << 11)),
    startP: false,
  };
}

export async function fetchNetInfo(): Promise<{ ips: string[]; port: number }> {
  try {
    const r = await fetch("/api/net/info", { cache: "no-store" });
    if (!r.ok) throw new Error("info");
    return r.json();
  } catch {
    return { ips: ["127.0.0.1"], port: Number(location.port) || 8080 };
  }
}

export function joinWsUrl(input: string): string {
  let s = input.trim();
  s = s.replace(/^https?:\/\//i, "").replace(/^wss?:\/\//i, "");
  s = s.replace(/\/kk-net\/?$/, "");
  const slash = s.indexOf("/");
  if (slash >= 0) s = s.slice(0, slash);
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const hasPort = /]:\d+$/.test(s) || /^[0-9.]+:\d+$/.test(s) || /^[a-zA-Z0-9.-]+:\d+$/.test(s);
  const hostport = hasPort ? s : `${s}:${location.port || 8080}`;
  return `${proto}//${hostport}/kk-net`;
}

export class NetPlay {
  ws: WebSocket | null = null;
  role: NetRole | null = null;
  roomCode: string | null = null;
  helloOk = false;
  lobby: LobbyState = { host: null, guest: null, ips: [], started: false, code: null, phase: "lobby" };
  handlers: NetHandlers = {};
  status = "offline";

  setHandlers(h: NetHandlers) {
    this.handlers = h;
  }

  get me(): LobbyPlayer | null {
    return this.role === "guest" ? this.lobby.guest : this.lobby.host;
  }

  send(obj: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
  }

  connect(opts: { role: NetRole; url?: string; name?: string; char?: NetChar; code?: string }) {
    this.disconnect();
    this.role = opts.role;
    this.helloOk = false;
    this.roomCode = opts.code ?? null;
    const url =
      opts.url ??
      `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/kk-net`;
    this.status = "connecting";
    this.handlers.onStatus?.(this.status);
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.status = "error";
      this.handlers.onError?.("Nem sikerült csatlakozni. Mindketten ugyanazon a linken legyetek.");
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.status = "open";
      this.handlers.onStatus?.(this.status);
      this.send({
        type: "hello",
        role: opts.role,
        name: opts.name ?? (opts.role === "host" ? "HOST" : "JOIN"),
        char: opts.char ?? (opts.role === "host" ? "renike" : "ricsi"),
        code: opts.code,
      });
    };
    ws.onerror = () => {
      if (this.ws !== ws) return;
      this.status = "error";
      this.handlers.onError?.(
        "Nincs online szerver ezen a linken. A kódos módhoz mindkét játékosnak ugyanazon a Grok/webes címen kell lennie (itch.io egymagában nem elég).",
      );
    };
    ws.onclose = (e) => {
      if (this.ws !== ws) return;
      this.status = "closed";
      this.handlers.onStatus?.(this.status);
      if (!this.helloOk) {
        if (e.code === 1000) return;
        this.handlers.onError?.(
          "Nem sikerült csatlakozni a szerverhez. Ugyanazt a webes címet nyissátok meg mindketten.",
        );
        return;
      }
      if (e.code !== 1000) this.handlers.onDrop?.(`close ${e.code}`);
    };
    ws.onmessage = (ev) => {
      if (this.ws !== ws) return;
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      const t = msg.type;
      if (t === "error") this.handlers.onError?.(String(msg.msg ?? "hiba"));
      if (t === "hello-ok") {
        this.role = (msg.role === "guest" ? "guest" : "host") as NetRole;
        this.roomCode = String(msg.code ?? "");
        this.helloOk = true;
        this.handlers.onHelloOk?.(this.role, this.roomCode);
      }
      if (t === "lobby") {
        this.lobby = {
          host: (msg.host as LobbyPlayer) ?? null,
          guest: (msg.guest as LobbyPlayer) ?? null,
          ips: (msg.ips as string[]) ?? [],
          started: !!msg.started,
          code: (msg.code as string) ?? this.roomCode,
          phase: (msg.phase as LobbyState["phase"]) ?? "lobby",
        };
        if (this.lobby.code) this.roomCode = this.lobby.code;
        this.handlers.onLobby?.(this.lobby);
      }
      if (t === "open-select") this.handlers.onOpenSelect?.();
      if (t === "open-stage") {
        this.handlers.onOpenStage?.(msg.p1 as NetChar, msg.p2 as NetChar);
      }
      if (t === "pick") {
        this.handlers.onPick?.(msg.role as NetRole, msg.char as NetChar, !!msg.locked);
      }
      if (t === "start") this.handlers.onStart?.(msg as StartMsg);
      if (t === "go") this.handlers.onGo?.();
      if (t === "input") this.handlers.onInput?.(Number(msg.frame) || 0, Number(msg.bits) || 0);
      if (t === "drop") this.handlers.onDrop?.(String(msg.reason ?? "drop"));
    };
  }

  select(char: NetChar) {
    this.send({ type: "select", char });
  }
  pick(char: NetChar, locked: boolean) {
    this.send({ type: "pick", char, locked });
  }
  ready(v: boolean) {
    this.send({ type: "ready", ready: v });
  }
  input(frame: number, bits: number) {
    this.send({ type: "input", frame, bits });
  }
  go() {
    this.send({ type: "go" });
  }
  stage(id: string) {
    this.send({ type: "stage", stage: id });
  }
  disconnect() {
    this.helloOk = false;
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.ws = null;
    this.role = null;
    this.roomCode = null;
    this.lobby = { host: null, guest: null, ips: [], started: false, code: null, phase: "lobby" };
    this.status = "offline";
  }
}
