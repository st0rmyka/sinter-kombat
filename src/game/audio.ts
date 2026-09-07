import { getSettings } from "./settings";

let ctx: AudioContext | null = null;
let muted = false;
let drone: OscillatorNode | null = null;
let droneGain: GainNode | null = null;
let master: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let announcerGain: GainNode | null = null;
let visibilityHooked = false;
let announcer: AudioBufferSourceNode | null = null;
let musicEl: HTMLAudioElement | null = null;
let musicNode: MediaElementAudioSourceNode | null = null;
let musicKind: "menu" | "stage" | null = null;
let musicSrc: string | null = null;
const MUSIC_BLOBS: Record<string, string> = {};

const MENU_FILE = "/music/menu.mp3";
const MUSIC_FILES: Record<string, string> = {
  kitchen: "/music/kitchen.mp3",
  sintertanya: "/music/sintertanya.mp3",
  kisterenye: "/music/kisterenye.mp3",
};
const MUSIC_VOL = 0.48;

const buffers = new Map<string, AudioBuffer>();
export let lastRoundSfx = 0;

const ROUND_FILES: Record<number, string> = {
  1: "/sfx/roundone.mp3",
  2: "/sfx/roundtwo.mp3",
  3: "/sfx/finalround.mp3",
};

const HIT_FILES = [
  "/sfx/hit1.mp3",
  "/sfx/hit2.mp3",
  "/sfx/hit3.mp3",
  "/sfx/hit4.mp3",
  "/sfx/hit5.mp3",
  "/sfx/hit6.mp3",
  "/sfx/hit8.mp3",
  "/sfx/hit9.mp3",
  "/sfx/hit10.mp3",
];

let lastHitIndex = -1;

type VoicePool = { files: string[]; last: number };

const RICSI_ATTACK: VoicePool = {
  files: ["/sfx/ricsi_attack1.mp3", "/sfx/ricsi_attack2.mp3", "/sfx/ricsi_attack3.mp3", "/sfx/ricsi_attack4.mp3"],
  last: -1,
};
const RICSI_DAMAGE: VoicePool = {
  files: ["/sfx/ricsi_damage1.mp3", "/sfx/ricsi_damage2.mp3", "/sfx/ricsi_damage3.mp3", "/sfx/ricsi_damage4.mp3"],
  last: -1,
};
const RICSI_DEFEAT = "/sfx/ricsi_defeat.mp3";

const RENIKE_ATTACK: VoicePool = {
  files: ["/sfx/renike_attack1.mp3", "/sfx/renike_attack2.mp3", "/sfx/renike_attack3.mp3"],
  last: -1,
};
const RENIKE_DAMAGE: VoicePool = {
  files: ["/sfx/renike_damage1.mp3", "/sfx/renike_damage2.mp3", "/sfx/renike_damage3.mp3"],
  last: -1,
};
const RENIKE_DEFEAT = "/sfx/renike_defeat.mp3";
const CICA_ATTACK: VoicePool = {
  files: ["/sfx/cica_attack1.mp3", "/sfx/cica_attack2.mp3", "/sfx/cica_attack3.mp3"],
  last: -1,
};
const CICA_DAMAGE: VoicePool = {
  files: ["/sfx/cica_damage1.mp3", "/sfx/cica_damage2.mp3", "/sfx/cica_damage3.mp3"],
  last: -1,
};
const CICA_DEFEAT = "/sfx/cica_defeat.mp3";
const AGI_ATTACK: VoicePool = {
  files: ["/sfx/agi_attack1.mp3", "/sfx/agi_attack2.mp3", "/sfx/agi_attack3.mp3"],
  last: -1,
};
const AGI_DAMAGE: VoicePool = {
  files: ["/sfx/agi_damage1.mp3", "/sfx/agi_damage2.mp3", "/sfx/agi_damage3.mp3"],
  last: -1,
};
const AGI_DEFEAT = "/sfx/agi_defeat.mp3";
const AGI_KOPES = "/sfx/agi_kopes.mp3";
const AGI_VERSZIVAS = "/sfx/agi_verszivas.mp3";
const CRICSI_ATTACK: VoicePool = {
  files: ["/sfx/ciganyricsi_attack1.mp3", "/sfx/ciganyricsi_attack2.mp3", "/sfx/ciganyricsi_attack3.mp3"],
  last: -1,
};
const CRICSI_DAMAGE: VoicePool = {
  files: ["/sfx/ciganyricsi_damage1.mp3", "/sfx/ciganyricsi_damage2.mp3", "/sfx/ciganyricsi_damage3.mp3"],
  last: -1,
};
const CRICSI_DEFEAT = "/sfx/ciganyricsi_defeat.mp3";
const CRICSI_KIBLAST = "/sfx/special_kiblast.mp3";
const JEZUS_ATTACK: VoicePool = {
  files: ["/sfx/jezus_attack1.mp3", "/sfx/jezus_attack2.mp3", "/sfx/jezus_attack3.mp3"],
  last: -1,
};
const JEZUS_DAMAGE: VoicePool = {
  files: ["/sfx/jezus_damage1.mp3", "/sfx/jezus_damage2.mp3", "/sfx/jezus_damage3.mp3"],
  last: -1,
};
const JEZUS_DEFEAT = "/sfx/jezus_defeat.mp3";
const JEZUS_OSZLOP = "/sfx/jezus_special_oszlop.mp3";
const JEZUS_VEDOGOMB = "/sfx/jezus_special_vedogomb.mp3";
const HOFFER_ATTACK: VoicePool = {
  files: ["/sfx/hofferjozsi_attack1.mp3", "/sfx/hofferjozsi_attack2.mp3", "/sfx/hofferjozsi_attack3.mp3"],
  last: -1,
};
const HOFFER_DAMAGE: VoicePool = {
  files: ["/sfx/hofferjozsi_damage1.mp3", "/sfx/hofferjozsi_damage2.mp3", "/sfx/hofferjozsi_damage3.mp3"],
  last: -1,
};
const HOFFER_DEFEAT = "/sfx/hofferjozsi_defeat.mp3";
const HOFFER_DUHROHAM = "/sfx/hofferjozsi_special_duhroham.mp3";
const HOFFER_GYEREIDE = "/sfx/hofferjozsi_special_gyereide.mp3";
const RENIKE_FING = "/sfx/renike_fing.mp3";
const RICSI_HANYAS = "/sfx/ricsi_hanyas.mp3";
const CICA_QUAKE = "/sfx/cica_quake.mp3";
const TITLE_FILE = "/sfx/sinterkombat_title.mp3";
const KO_FILE = "/sfx/ko.mp3";
const CHAR_NAME: Record<string, string> = {
  ricsi: "/sfx/name_ricsi.mp3",
  renike: "/sfx/name_renike.mp3",
  cica: "/sfx/name_cica.mp3",
  agi: "/sfx/name_agi.mp3",
  cricsi: "/sfx/name_ciganyricsi.mp3",
  jezus: "/sfx/name_jezus.mp3",
  hoffer: "/sfx/name_hofferjozsi.mp3",
};
const CHAR_WIN: Record<string, string> = {
  ricsi: "/sfx/ricsiwins.mp3",
  renike: "/sfx/renikewins.mp3",
  cica: "/sfx/cicawins.mp3",
  agi: "/sfx/agiwins.mp3",
  cricsi: "/sfx/ciganyricsiwins.mp3",
  jezus: "/sfx/jezuswins.mp3",
  hoffer: "/sfx/hofferjozsiwins.mp3",
};

const CHAR_ATTACK: Record<string, VoicePool> = { ricsi: RICSI_ATTACK, renike: RENIKE_ATTACK, cica: CICA_ATTACK, agi: AGI_ATTACK, cricsi: CRICSI_ATTACK, jezus: JEZUS_ATTACK, hoffer: HOFFER_ATTACK };
const CHAR_DAMAGE: Record<string, VoicePool> = { ricsi: RICSI_DAMAGE, renike: RENIKE_DAMAGE, cica: CICA_DAMAGE, agi: AGI_DAMAGE, cricsi: CRICSI_DAMAGE, jezus: JEZUS_DAMAGE, hoffer: HOFFER_DAMAGE };
const CHAR_DEFEAT: Record<string, string> = { ricsi: RICSI_DEFEAT, renike: RENIKE_DEFEAT, cica: CICA_DEFEAT, agi: AGI_DEFEAT, cricsi: CRICSI_DEFEAT, jezus: JEZUS_DEFEAT, hoffer: HOFFER_DEFEAT };
const CHAR_SPECIAL1: Record<string, string> = { agi: AGI_KOPES, jezus: JEZUS_OSZLOP, hoffer: HOFFER_DUHROHAM };
const CHAR_SPECIAL2: Record<string, string> = { renike: RENIKE_FING, ricsi: RICSI_HANYAS, cica: CICA_QUAKE, agi: AGI_VERSZIVAS, cricsi: CRICSI_KIBLAST, jezus: JEZUS_VEDOGOMB, hoffer: HOFFER_GYEREIDE };

const voices = new Map<string, AudioBufferSourceNode>();

function mix() {
  const s = getSettings();
  const on = s.soundOn && !muted;
  return {
    on,
    sfx: on ? s.sfx : 0,
    music: on ? MUSIC_VOL * s.music : 0,
    announcer: on ? s.announcer : 0,
  };
}

export function applyMix() {
  const c = ctx;
  const m = mix();
  if (c && sfxGain) sfxGain.gain.setTargetAtTime(m.sfx, c.currentTime, 0.02);
  if (c && musicGain) musicGain.gain.setTargetAtTime(m.music, c.currentTime, 0.04);
  if (c && announcerGain) announcerGain.gain.setTargetAtTime(m.announcer, c.currentTime, 0.02);
  if (musicEl) musicEl.muted = !m.on;
}

export function isMuted() {
  return muted || !getSettings().soundOn;
}

export function setMuted(v: boolean) {
  muted = v;
  applyMix();
}

function ac() {
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor({ latencyHint: "interactive" });
  }
  if (!visibilityHooked) {
    visibilityHooked = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && ctx?.state === "suspended") void ctx.resume();
    });
  }
  if (!master) {
    master = ctx.createGain();
    sfxGain = ctx.createGain();
    musicGain = ctx.createGain();
    announcerGain = ctx.createGain();
    sfxGain.connect(master);
    musicGain.connect(master);
    announcerGain.connect(master);
    master.connect(ctx.destination);
    master.gain.value = 1;
    applyMix();
  }
  return ctx;
}

export async function unlockAudio() {
  const c = ac();
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      /* gesture required */
    }
    return true;
  }
  return false;
}

function dest() {
  ac();
  return sfxGain ?? ctx!.destination;
}

function destAnn() {
  ac();
  return announcerGain ?? dest();
}

function playAnnouncerShot(url: string, vol = 1) {
  if (mix().announcer <= 0) return;
  const buf = buffers.get(url);
  if (!buf) {
    void decodeUrl(url)
      .then((decoded) => {
        buffers.set(url, decoded);
        playAnnouncerShot(url, vol);
      })
      .catch(() => {
        /* missing */
      });
    return;
  }
  const c = ac();
  if (c.state === "suspended") void c.resume();
  const src = c.createBufferSource();
  const g = c.createGain();
  src.buffer = buf;
  g.gain.value = vol;
  src.connect(g).connect(destAnn());
  src.onended = () => {
    try {
      src.disconnect();
      g.disconnect();
    } catch {
      /* ignore */
    }
  };
  src.start();
}

function beep(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0) {
  if (mix().sfx <= 0) return;
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur);
  g.gain.value = vol;
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g).connect(dest());
  o.start();
  o.stop(c.currentTime + dur);
}

async function decodeUrl(url: string) {
  const c = ac();
  const res = await fetch(url);
  if (!res.ok) throw new Error(url);
  const raw = await res.arrayBuffer();
  return await c.decodeAudioData(raw.slice(0));
}

export function sfxPreloadList(): string[] {
  return [
    ...Object.values(ROUND_FILES),
    ...HIT_FILES,
    ...RICSI_ATTACK.files,
    ...RICSI_DAMAGE.files,
    RICSI_DEFEAT,
    ...RENIKE_ATTACK.files,
    ...RENIKE_DAMAGE.files,
    RENIKE_DEFEAT,
    ...CICA_ATTACK.files,
    ...CICA_DAMAGE.files,
    CICA_DEFEAT,
    ...AGI_ATTACK.files,
    ...AGI_DAMAGE.files,
    AGI_DEFEAT,
    AGI_KOPES,
    AGI_VERSZIVAS,
    CRICSI_DEFEAT,
    ...CRICSI_ATTACK.files,
    ...CRICSI_DAMAGE.files,
    CRICSI_KIBLAST,
    ...JEZUS_ATTACK.files,
    ...JEZUS_DAMAGE.files,
    JEZUS_DEFEAT,
    JEZUS_OSZLOP,
    JEZUS_VEDOGOMB,
    HOFFER_DEFEAT,
    ...HOFFER_ATTACK.files,
    ...HOFFER_DAMAGE.files,
    HOFFER_DUHROHAM,
    HOFFER_GYEREIDE,
    RENIKE_FING,
    RICSI_HANYAS,
    CICA_QUAKE,
    TITLE_FILE,
    KO_FILE,
    ...Object.values(CHAR_NAME),
    ...Object.values(CHAR_WIN),
  ];
}

export function musicPreloadList(): string[] {
  return [MENU_FILE, ...Object.values(MUSIC_FILES)];
}

export async function preloadSfx(onItem?: () => void) {
  ac();
  const urls = sfxPreloadList();
  await Promise.all(
    urls.map(async (url) => {
      if (buffers.has(url)) {
        onItem?.();
        return;
      }
      try {
        buffers.set(url, await decodeUrl(url));
      } catch {
        /* missing clip must not block the match */
      }
      onItem?.();
    }),
  );
  await Promise.all(
    [MENU_FILE, ...Object.values(MUSIC_FILES)].map(async (url) => {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          MUSIC_BLOBS[url] = URL.createObjectURL(blob);
        }
      } catch {
        /* ignore */
      }
      onItem?.();
    }),
  );
}

function playBuffer(url: string, vol = 0.95) {
  if (mix().announcer <= 0) return;
  const buf = buffers.get(url);
  if (!buf) return;
  const c = ac();
  if (c.state === "suspended") void c.resume();
  if (announcer) {
    try {
      announcer.stop();
    } catch {
      /* already ended */
    }
    announcer = null;
  }
  const src = c.createBufferSource();
  const g = c.createGain();
  src.buffer = buf;
  g.gain.value = vol;
  src.connect(g).connect(destAnn());
  src.onended = () => {
    if (announcer === src) announcer = null;
    try {
      src.disconnect();
      g.disconnect();
    } catch {
      /* ignore */
    }
  };
  src.start();
  announcer = src;
}

function playOneShot(url: string, vol: number, rate: number) {
  if (mix().sfx <= 0) return;
  const buf = buffers.get(url);
  if (!buf) {
    void decodeUrl(url)
      .then((decoded) => {
        buffers.set(url, decoded);
        playOneShot(url, vol, rate);
      })
      .catch(() => {
        /* clip missing */
      });
    return;
  }
  const c = ac();
  if (c.state === "suspended") void c.resume();
  const src = c.createBufferSource();
  const g = c.createGain();
  src.buffer = buf;
  src.playbackRate.value = rate;
  g.gain.value = vol;
  src.connect(g).connect(dest());
  src.onended = () => {
    try {
      src.disconnect();
      g.disconnect();
    } catch {
      /* ignore */
    }
  };
  src.start();
}

function pickHitUrl() {
  let i = Math.floor(Math.random() * HIT_FILES.length);
  if (i === lastHitIndex) i = (i + 1) % HIT_FILES.length;
  lastHitIndex = i;
  return HIT_FILES[i];
}

function playHit(vol: number) {
  playOneShot(pickHitUrl(), vol * (0.88 + Math.random() * 0.16), 0.94 + Math.random() * 0.12);
}

function pickFrom(pool: VoicePool) {
  let i = Math.floor(Math.random() * pool.files.length);
  if (i === pool.last) i = (i + 1) % pool.files.length;
  pool.last = i;
  return pool.files[i];
}

function playVoice(who: string, url: string, vol: number, rate = 1) {
  if (mix().sfx <= 0) return;
  const buf = buffers.get(url);
  if (!buf) {
    void decodeUrl(url)
      .then((decoded) => {
        buffers.set(url, decoded);
        playVoice(who, url, vol, rate);
      })
      .catch(() => {
        /* clip missing */
      });
    return;
  }
  const c = ac();
  if (c.state === "suspended") void c.resume();
  const prev = voices.get(who);
  if (prev) {
    try {
      prev.stop();
    } catch {
      /* already ended */
    }
    voices.delete(who);
  }
  const src = c.createBufferSource();
  const g = c.createGain();
  src.buffer = buf;
  src.playbackRate.value = rate;
  g.gain.value = vol;
  src.connect(g).connect(dest());
  src.onended = () => {
    if (voices.get(who) === src) voices.delete(who);
    try {
      src.disconnect();
      g.disconnect();
    } catch {
      /* ignore */
    }
  };
  src.start();
  voices.set(who, src);
}

function voiceVol(id: string, base: number) {
  if (id === "hoffer" || id === "cica") return base * 0.32;
  return base;
}

export const sfxPlay = {
  hit: () => playHit(0.92),
  heavy: () => playHit(1),
  block: () => beep(420, 0.08, "triangle", 0.08),
  ko: () => {
    if (buffers.has(KO_FILE)) {
      playBuffer(KO_FILE, 1);
      return;
    }
    void decodeUrl(KO_FILE)
      .then((buf) => {
        buffers.set(KO_FILE, buf);
        playBuffer(KO_FILE, 1);
      })
      .catch(() => {
        beep(70, 0.4, "sawtooth", 0.14, -40);
      });
  },
  win: () => beep(440, 0.25, "triangle", 0.08, 220),
  fatality: () => {
    beep(80, 0.5, "sawtooth", 0.18, -50);
    beep(160, 0.4, "square", 0.1, -80);
  },
  dash: () => beep(240, 0.08, "square", 0.07, 180),
  charAttack: (id: string) => {
    const pool = CHAR_ATTACK[id];
    if (!pool) return;
    playVoice(id, pickFrom(pool), voiceVol(id, 0.96), 0.98 + Math.random() * 0.04);
  },
  charDamage: (id: string) => {
    const pool = CHAR_DAMAGE[id];
    if (!pool) return;
    playVoice(id, pickFrom(pool), voiceVol(id, 1), 0.98 + Math.random() * 0.04);
  },
  charDefeat: (id: string) => {
    const url = CHAR_DEFEAT[id];
    if (!url) return;
    playVoice(id, url, voiceVol(id, 1), 1);
  },
  charSpecial1: (id: string) => {
    const url = CHAR_SPECIAL1[id];
    if (!url) {
      sfxPlay.charAttack(id);
      return;
    }
    if (id === "jezus") playOneShot(url, 2.4, 1);
    else if (id === "agi") playOneShot(url, 1, 1);
    else if (id === "hoffer") playOneShot(url, voiceVol(id, 1), 1);
    else playVoice(id, url, voiceVol(id, 1), 1);
  },
  charSpecial2: (id: string) => {
    const url = CHAR_SPECIAL2[id];
    if (!url) return;
    if (id === "jezus") playOneShot(url, 2.4, 1);
    else if (id === "agi" || id === "cricsi") playOneShot(url, 1, 1);
    else if (id === "hoffer") playOneShot(url, voiceVol(id, 1), 1);
    else playVoice(id, url, voiceVol(id, 1), 1);
  },
  quake: () => playOneShot(CICA_QUAKE, voiceVol("cica", 0.95), 0.96 + Math.random() * 0.08),
  charName: (id: string) => {
    const url = CHAR_NAME[id];
    if (!url) return;
    playAnnouncerShot(url, 1);
  },
  charWin: (id: string) => {
    const url = CHAR_WIN[id];
    if (!url) return;
    if (buffers.has(url)) {
      playBuffer(url, 1);
      return;
    }
    void decodeUrl(url)
      .then((buf) => {
        buffers.set(url, buf);
        playBuffer(url, 1);
      })
      .catch(() => {
        /* announcer missing */
      });
  },
  title: () => {
    if (buffers.has(TITLE_FILE)) {
      playBuffer(TITLE_FILE, 1);
      return;
    }
    void decodeUrl(TITLE_FILE)
      .then((buf) => {
        buffers.set(TITLE_FILE, buf);
        playBuffer(TITLE_FILE, 1);
      })
      .catch(() => {
        /* title sting missing */
      });
  },
  round: (n: number) => {
    lastRoundSfx = n;
    const url = ROUND_FILES[n] ?? ROUND_FILES[3];
    if (buffers.has(url)) {
      playBuffer(url);
      return;
    }
    void decodeUrl(url)
      .then((buf) => {
        buffers.set(url, buf);
        playBuffer(url);
      })
      .catch(() => {
        /* announcer missing */
      });
  },
};

export function startKitchenDrone() {
  startMenuMusic();
}

export function stopKitchenDrone() {
  try {
    drone?.stop();
  } catch {
    /* ignore */
  }
  drone = null;
  droneGain = null;
}

function ensureMusicEl(url: string, kind: "menu" | "stage") {
  const resolved = MUSIC_BLOBS[url] ?? url;
  if (!musicEl) {
    musicEl = new Audio(resolved);
    musicEl.loop = true;
    musicEl.preload = "auto";
    musicEl.crossOrigin = "anonymous";
  } else if (musicKind !== kind || musicSrc !== resolved) {
    musicEl.src = resolved;
  }
  musicKind = kind;
  musicSrc = resolved;
  return musicEl;
}

function hookMusicGraph(el: HTMLAudioElement) {
  const c = ac();
  if (!musicGain) {
    musicGain = c.createGain();
    musicGain.connect(master ?? c.destination);
  }
  if (!musicNode) {
    musicNode = c.createMediaElementSource(el);
    musicNode.connect(musicGain);
  }
  applyMix();
  el.volume = 1;
}

export function startMenuMusic() {
  if (musicKind === "menu" && musicEl && !musicEl.paused && ctx?.state === "running") return;
  const switched = musicKind !== "menu";
  const el = ensureMusicEl(MENU_FILE, "menu");
  if (!el) return;
  hookMusicGraph(el);
  stopKitchenDrone();
  if (switched) {
    try {
      el.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
  void unlockAudio().then(() => {
    el.muted = mix().music <= 0;
    void el.play().catch(() => {
      /* autoplay blocked until next gesture */
    });
  });
}

export function startStageMusic(stage: string) {
  const url = MUSIC_FILES[stage] ?? MUSIC_FILES.kitchen;
  if (!url) return;
  const el = ensureMusicEl(url, "stage");
  if (!el) return;
  hookMusicGraph(el);
  stopKitchenDrone();
  try {
    el.currentTime = 0;
  } catch {
    /* ignore */
  }
  void unlockAudio().then(() => {
    el.muted = mix().music <= 0;
    void el.play().catch(() => {
      /* autoplay blocked until next gesture */
    });
  });
}

export function stopStageMusic() {
  if (!musicEl) return;
  musicEl.pause();
  try {
    musicEl.currentTime = 0;
  } catch {
    /* ignore */
  }
}
