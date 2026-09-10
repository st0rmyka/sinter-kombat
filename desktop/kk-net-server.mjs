import { createHash } from "node:crypto";
import os from "node:os";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
export const KK_NET_PATH = "/kk-net";

export function localIPv4s() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const n of list ?? []) {
      const family = n.family === 4 || n.family === "IPv4";
      if (family && !n.internal) out.push(n.address);
    }
  }
  if (!out.includes("127.0.0.1")) out.push("127.0.0.1");
  return out;
}

function acceptKey(key) {
  return createHash("sha1")
    .update(key + GUID)
    .digest("base64");
}

function sendText(socket, text) {
  if (socket.destroyed) return;
  const payload = Buffer.from(text, "utf8");
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  try {
    socket.write(Buffer.concat([header, payload]));
  } catch {
    /* ignore */
  }
}

function decodeFrames(buf) {
  const msgs = [];
  let i = 0;
  while (i + 2 <= buf.length) {
    const finOp = buf[i];
    const opcode = finOp & 0x0f;
    const b1 = buf[i + 1];
    const masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f;
    let off = i + 2;
    if (len === 126) {
      if (off + 2 > buf.length) break;
      len = buf.readUInt16BE(off);
      off += 2;
    } else if (len === 127) {
      if (off + 8 > buf.length) break;
      len = Number(buf.readBigUInt64BE(off));
      off += 8;
    }
    const maskOff = off;
    if (masked) off += 4;
    if (off + len > buf.length) break;
    let payload = buf.subarray(off, off + len);
    if (masked) {
      const mask = buf.subarray(maskOff, maskOff + 4);
      const out = Buffer.alloc(len);
      for (let k = 0; k < len; k++) out[k] = payload[k] ^ mask[k % 4];
      payload = out;
    }
    i = off + len;
    if (opcode === 0x8) msgs.push({ close: true });
    else if (opcode === 0x9) msgs.push({ ping: payload });
    else if (opcode === 0x1) msgs.push({ text: payload.toString("utf8") });
  }
  return { msgs, rest: buf.subarray(i) };
}

function sendPong(socket, payload) {
  const len = payload.length;
  const header = Buffer.alloc(2);
  header[0] = 0x8a;
  header[1] = len;
  try {
    socket.write(Buffer.concat([header, payload]));
  } catch {
    /* ignore */
  }
}

export function createKitchenNet() {
  const clients = new Map();
  const rooms = new Map();
  let nextId = 1;
  const ROSTER = ["renike", "ricsi", "cica", "agi", "cricsi", "jezus", "hoffer", "farajo"];

  function validChar(id) {
    return ROSTER.includes(id) ? id : "renike";
  }

  function genCode() {
    for (let i = 0; i < 80; i++) {
      const c = String(1000 + Math.floor(Math.random() * 9000));
      const r = rooms.get(c);
      if (!r || r.clients.size === 0) {
        if (r) rooms.delete(c);
        return c;
      }
    }
    return String(1000 + Math.floor(Math.random() * 9000));
  }

  function roomOf(c) {
    return c?.code ? rooms.get(c.code) : null;
  }

  function hostOf(r) {
    if (!r) return null;
    return [...r.clients].find((x) => x.role === "host") ?? null;
  }

  function guestOf(r) {
    if (!r) return null;
    return [...r.clients].find((x) => x.role === "guest") ?? null;
  }

  function pub(c) {
    if (!c) return null;
    return { name: c.name, ready: c.ready, char: c.char, role: c.role, locked: !!c.locked };
  }

  function lobbyMsg(r) {
    return {
      type: "lobby",
      host: pub(hostOf(r)),
      guest: pub(guestOf(r)),
      code: r?.code ?? null,
      ips: localIPv4s(),
      started: !!r?.started,
      phase: r?.phase ?? "lobby",
    };
  }

  function send(c, obj) {
    sendText(c.socket, JSON.stringify(obj));
  }

  function broadcast(r, obj) {
    if (!r) return;
    const raw = JSON.stringify(obj);
    for (const c of r.clients) sendText(c.socket, raw);
  }

  function drop(id) {
    const c = clients.get(id);
    if (!c) return;
    clients.delete(id);
    const r = roomOf(c);
    try {
      c.socket.end();
    } catch {
      /* ignore */
    }
    if (r) {
      r.clients.delete(c);
      r.started = false;
      r.phase = "lobby";
      for (const o of r.clients) {
        o.ready = false;
        o.locked = false;
        send(o, { type: "drop", reason: "disconnect" });
      }
      if (r.clients.size === 0) rooms.delete(r.code);
      else broadcast(r, lobbyMsg(r));
    }
  }

  function onMessage(c, data) {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    if (msg.type === "hello") {
      const role = msg.role === "guest" ? "guest" : "host";
      if (role === "host") {
        const code = genCode();
        const r = { code, clients: new Set([c]), started: false, phase: "lobby" };
        rooms.set(code, r);
        c.role = "host";
        c.code = code;
        c.name = String(msg.name ?? "HOST").slice(0, 18);
        c.char = validChar(msg.char);
        c.ready = false;
        c.locked = false;
        send(c, { type: "hello-ok", role: "host", code });
        send(c, lobbyMsg(r));
        return;
      }
      const code = String(msg.code ?? "").replace(/\D/g, "").slice(0, 4);
      const r = rooms.get(code);
      if (!code || code.length !== 4 || !r) {
        send(c, { type: "error", msg: "Nincs ilyen kód." });
        return;
      }
      if (!hostOf(r)) {
        send(c, { type: "error", msg: "A szoba üres. A Host lépjen be előbb." });
        return;
      }
      if (guestOf(r)) {
        send(c, { type: "error", msg: "A szoba tele van." });
        return;
      }
      c.role = "guest";
      c.code = code;
      c.name = String(msg.name ?? "JOIN").slice(0, 18);
      c.char = validChar(msg.char);
      c.ready = false;
      c.locked = false;
      r.clients.add(c);
      send(c, { type: "hello-ok", role: "guest", code });
      broadcast(r, lobbyMsg(r));
      return;
    }
    const r = roomOf(c);
    if (!r) return;
    if (msg.type === "select") {
      c.char = validChar(msg.char);
      c.ready = false;
      c.locked = false;
      broadcast(r, lobbyMsg(r));
      return;
    }
    if (msg.type === "pick") {
      c.char = validChar(msg.char);
      c.locked = !!msg.locked;
      broadcast(r, {
        type: "pick",
        role: c.role,
        char: c.char,
        locked: c.locked,
      });
      const h = hostOf(r);
      const g = guestOf(r);
      if (r.phase === "select" && h?.locked && g?.locked) {
        r.phase = "stage";
        broadcast(r, { type: "open-stage", p1: h.char, p2: g.char });
      }
      return;
    }
    if (msg.type === "ready") {
      c.ready = !!msg.ready;
      broadcast(r, lobbyMsg(r));
      const h = hostOf(r);
      const g = guestOf(r);
      if (r.phase === "lobby" && h?.ready && g?.ready) {
        r.phase = "select";
        h.locked = false;
        g.locked = false;
        broadcast(r, { type: "open-select" });
      }
      return;
    }
    if (msg.type === "stage" && c.role === "host" && r.phase === "stage") {
      const h = hostOf(r);
      const g = guestOf(r);
      if (!h || !g) return;
      r.started = true;
      r.phase = "fight";
      broadcast(r, {
        type: "start",
        p1: h.char,
        p2: g.char,
        stage: String(msg.stage ?? "sintertanya"),
        delay: 3,
      });
      return;
    }
    if (msg.type === "input" && r.started) {
      const other = [...r.clients].find((x) => x !== c);
      if (other) send(other, { type: "input", frame: msg.frame | 0, bits: msg.bits | 0 });
      return;
    }
    if (msg.type === "go" && c.role === "host" && r.started) {
      broadcast(r, { type: "go" });
    }
  }

  function handleUpgrade(req, socket) {
    const path = (req.url ?? "").split("?")[0];
    if (path !== KK_NET_PATH) return false;
    const key = req.headers["sec-websocket-key"];
    if (!key) {
      socket.destroy();
      return true;
    }
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        `Sec-WebSocket-Accept: ${acceptKey(String(key))}\r\n` +
        "\r\n",
    );
    const id = nextId++;
    const c = {
      id,
      socket,
      role: null,
      code: null,
      name: "Player",
      char: "renike",
      ready: false,
      locked: false,
      buf: Buffer.alloc(0),
    };
    clients.set(id, c);
    socket.on("data", (chunk) => {
      c.buf = Buffer.concat([c.buf, chunk]);
      const { msgs, rest } = decodeFrames(c.buf);
      c.buf = rest;
      for (const m of msgs) {
        if (m.close) {
          drop(id);
          return;
        }
        if (m.ping) sendPong(socket, m.ping);
        if (m.text) onMessage(c, m.text);
      }
    });
    socket.on("close", () => drop(id));
    socket.on("error", () => drop(id));
    socket.setTimeout(0);
    return true;
  }

  function attach(httpServer) {
    if (!httpServer || httpServer.__kkNet) return;
    httpServer.__kkNet = true;
    const prev = httpServer.listeners("upgrade").slice();
    httpServer.removeAllListeners("upgrade");
    httpServer.on("upgrade", (req, socket, head) => {
      if (handleUpgrade(req, socket)) return;
      for (const fn of prev) fn.call(httpServer, req, socket, head);
    });
  }

  return { handleUpgrade, attach, localIPv4s, lobbyMsg };
}

const defaultNet = createKitchenNet();

export function attachKitchenNet(httpServer) {
  defaultNet.attach(httpServer);
}

export function writeNetInfo(res, port) {
  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify({ ips: localIPv4s(), port: Number(port) || 8080 }));
}
