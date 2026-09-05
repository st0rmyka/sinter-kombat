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
  let nextId = 1;
  let started = false;

  const host = () => [...clients.values()].find((c) => c.role === "host");
  const guest = () => [...clients.values()].find((c) => c.role === "guest");

  function pub(c) {
    if (!c) return null;
    return { name: c.name, ready: c.ready, char: c.char, role: c.role };
  }

  function lobbyMsg() {
    return {
      type: "lobby",
      host: pub(host()),
      guest: pub(guest()),
      ips: localIPv4s(),
      started,
    };
  }

  function send(c, obj) {
    sendText(c.socket, JSON.stringify(obj));
  }

  function broadcast(obj) {
    const raw = JSON.stringify(obj);
    for (const c of clients.values()) sendText(c.socket, raw);
  }

  function drop(id) {
    const c = clients.get(id);
    if (!c) return;
    clients.delete(id);
    try {
      c.socket.end();
    } catch {
      /* ignore */
    }
    if (c.role === "host" || c.role === "guest") {
      started = false;
      for (const o of clients.values()) {
        o.ready = false;
        send(o, { type: "drop", reason: "disconnect" });
      }
    }
    broadcast(lobbyMsg());
  }

  function maybeStart() {
    if (started) return;
    const h = host();
    const g = guest();
    if (h?.ready && g?.ready) {
      started = true;
      broadcast({ type: "start", p1: h.char, p2: g.char, delay: 3 });
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
      if (role === "host" && host() && host() !== c) {
        send(c, { type: "error", msg: "Már van Host ezen a gépen." });
        return;
      }
      if (role === "guest" && !host()) {
        send(c, { type: "error", msg: "Nincs Host. Előbb valaki Hostoljon." });
        return;
      }
      if (role === "guest" && guest() && guest() !== c) {
        send(c, { type: "error", msg: "A lobby tele van." });
        return;
      }
      c.role = role;
      c.name = String(msg.name ?? (role === "host" ? "HOST" : "JOIN")).slice(0, 18);
      c.char = ["renike","ricsi","cica","agi","cricsi","jezus"].includes(msg.char) ? msg.char : "renike";
      send(c, { type: "hello-ok", role: c.role });
      broadcast(lobbyMsg());
      return;
    }
    if (msg.type === "select") {
      c.char = ["renike","ricsi","cica","agi","cricsi","jezus"].includes(msg.char) ? msg.char : "renike";
      c.ready = false;
      broadcast(lobbyMsg());
      return;
    }
    if (msg.type === "ready") {
      c.ready = !!msg.ready;
      broadcast(lobbyMsg());
      maybeStart();
      return;
    }
    if (msg.type === "input" && started) {
      const other = [...clients.values()].find((x) => x !== c);
      if (other) send(other, { type: "input", frame: msg.frame | 0, bits: msg.bits | 0 });
      return;
    }
    if (msg.type === "go" && c.role === "host" && started) {
      broadcast({ type: "go" });
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
      name: "Player",
      char: "renike",
      ready: false,
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
