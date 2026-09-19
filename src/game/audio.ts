import { getSettings } from "./settings";
import { asset } from "./asset";

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
let musicFile: string | null = null;
const MUSIC_BLOBS: Record<string, string> = {};

const MENU_FILE = "/music/menu.mp3?v=19";
const MUSIC_FILES: Record<string, string> = {
  kitchen: "/music/kitchen.mp3",
  sintertanya: "/music/sintertanya.mp3",
  kisterenye: "/music/kisterenye.mp3",
  golgota: "/music/golgota.mp3",
  nepszinhaz: "/music/nepszinhaz.mp3",
  salgotarjan: "/music/salgotarjan.mp3",
  nagybatony: "/music/nagybatony.mp3",
  maconka: "/music/maconka.mp3?v=45l",
  miskolc: "/music/miskolc.mp3?v=45l",
  ozd: "/music/ozd.mp3?v=45l",
  kispest: "/music/kispest.mp3?v=45l",
  hosutca: "/music/hosutca.mp3?v=45l",
  pokol: "/music/pokol.mp3?v=45l",
  arpadhid: "/music/sintertanya.mp3",
};
const MUSIC_VOL = 0.48;

const buffers = new Map<string, AudioBuffer>();
const rawCache = new Map<string, ArrayBuffer>();
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
const FARAJO_ATTACK: VoicePool = {
  files: ["/sfx/farajo_attack1.mp3", "/sfx/farajo_attack2.mp3", "/sfx/farajo_attack3.mp3"],
  last: -1,
};
const FARAJO_DAMAGE: VoicePool = {
  files: ["/sfx/farajo_damage1.mp3", "/sfx/farajo_damage2.mp3", "/sfx/farajo_damage3.mp3"],
  last: -1,
};
const FARAJO_DEFEAT = "/sfx/farajo_defeat.mp3";
const FARAJO_TROMBITA = "/sfx/farajo_special_trombita.mp3";
const FARAJO_GITAR = "/sfx/farajo_special_gitar.mp3";
const GABI_ATTACK: VoicePool = {
  files: ["/sfx/gabi_attack1.mp3", "/sfx/gabi_attack2.mp3", "/sfx/gabi_attack3.mp3"],
  last: -1,
};
const GABI_DAMAGE: VoicePool = {
  files: ["/sfx/gabi_damage1.mp3", "/sfx/gabi_damage2.mp3", "/sfx/gabi_damage3.mp3"],
  last: -1,
};
const GABI_DEFEAT = "/sfx/gabi_defeat.mp3";
const GABI_BAT = "/sfx/gabi_special_baseballuto.mp3";
const GABI_SHOT = "/sfx/gabi_special_agyonloves.mp3";
const GABI_PISTOL = "/sfx/gabi_pisztoly.mp3";
const ISTI_ATTACK: VoicePool = {
  files: ["/sfx/isti_attack1.mp3", "/sfx/isti_attack2.mp3", "/sfx/isti_attack3.mp3"],
  last: -1,
};
const ISTI_DAMAGE: VoicePool = {
  files: ["/sfx/isti_damage1.mp3", "/sfx/isti_damage2.mp3", "/sfx/isti_damage3.mp3"],
  last: -1,
};
const ISTI_DEFEAT = "/sfx/isti_defeat.mp3";
const ISTI_FELUGRAS = "/sfx/isti_special_felugras.mp3";
const ISTI_DOBBANTAS = "/sfx/isti_special_dobbantas.mp3";
const ALFONZ_DEFEAT = "/sfx/alfonz_defeat.mp3";
const ALFONZ_SZIPUA = "/sfx/alfonz_special_szipua.mp3";
const ALFONZ_NAGYPATIKA = "/sfx/alfonz_special_nagypatika.mp3";
const ALFONZ_TAUNT = "/sfx/alfonz_taunt.mp3";
const LEO_ATTACK: VoicePool = {
  files: ["/sfx/leonidasz_attack1.mp3", "/sfx/leonidasz_attack2.mp3", "/sfx/leonidasz_attack3.mp3"],
  last: -1,
};
const LEO_DAMAGE: VoicePool = {
  files: ["/sfx/leonidasz_damage1.mp3", "/sfx/leonidasz_damage2.mp3", "/sfx/leonidasz_damage3.mp3"],
  last: -1,
};
const LEO_DEFEAT = "/sfx/leonidasz_defeat.mp3";
const LEO_HEKTOR1 = "/sfx/leonidasz_special_hektor1.mp3";
const LEO_HEKTOR2 = "/sfx/leonidasz_special_hektor2.mp3";
const LEO_PITBULL = "/sfx/leonidasz_special_pitbull.mp3";
const LEO_TAUNT = "/sfx/leonidasz_taunt.mp3";
const RENIKE_FING = "/sfx/renike_fing.mp3";
const RENIKE_FINGAS = "/sfx/renike_special_fingas.mp3";
const RENIKE_SERPENYO = "/sfx/renike_special_serpenyo.mp3";
const RICSI_HANYAS = "/sfx/ricsi_hanyas.mp3";
const CICA_QUAKE = "/sfx/cica_quake.mp3";
const TITLE_FILE = "/sfx/sinterkombat_title.mp3";
const KO_FILE = "/sfx/ko.mp3";
const KO_IMPACT = "/sfx/ko_impact.mp3?v=1";
const SUPER_DASH_FILE = "/sfx/superdash.mp3";
const BLOCK_FILE = "/sfx/block.mp3?v=1";
const DASH_FILE = "/sfx/dash.mp3?v=1";
const SWING_FILES = [
  "/sfx/swing1.mp3?v=1",
  "/sfx/swing2.mp3?v=1",
  "/sfx/swing3.mp3?v=1",
  "/sfx/swing4.mp3?v=1",
  "/sfx/swing5.mp3?v=1",
  "/sfx/swing6.mp3?v=1",
  "/sfx/swing7.mp3?v=1",
];
let lastSwingIndex = -1;
const CHAR_NAME: Record<string, string> = {
  ricsi: "/sfx/name_ricsi.mp3",
  renike: "/sfx/name_renike.mp3",
  cica: "/sfx/name_cica.mp3",
  agi: "/sfx/name_agi.mp3",
  cricsi: "/sfx/name_ciganyricsi.mp3",
  jezus: "/sfx/name_jezus.mp3",
  hoffer: "/sfx/name_hofferjozsi.mp3",
  farajo: "/sfx/name_farajo.mp3",
  gabi: "/sfx/name_gabi.mp3",
  isti: "/sfx/name_isti.mp3",
  alfonz: "/sfx/name_alfonz.mp3",
  leo: "/sfx/name_leo.mp3",
};
const CHAR_WIN: Record<string, string> = {
  ricsi: "/sfx/ricsiwins.mp3",
  renike: "/sfx/renikewins.mp3",
  cica: "/sfx/cicawins.mp3",
  agi: "/sfx/agiwins.mp3",
  cricsi: "/sfx/ciganyricsiwins.mp3",
  jezus: "/sfx/jezuswins.mp3",
  hoffer: "/sfx/hofferjozsiwins.mp3",
  farajo: "/sfx/farajowins.mp3",
  gabi: "/sfx/gabiwins.mp3",
  isti: "/sfx/istiwins.mp3",
  alfonz: "/sfx/alfonzwins.mp3",
  leo: "/sfx/leowins.mp3",
};
const STAGE_NAME: Record<string, string> = {
  sintertanya: "/sfx/mapname_duranda.mp3",
  kisterenye: "/sfx/mapname_kisterenye.mp3",
  golgota: "/sfx/mapname_golgota.mp3",
  nepszinhaz: "/sfx/mapname_nepszinhazutca.mp3",
  salgotarjan: "/sfx/mapname_salgotarjan.mp3",
  nagybatony: "/sfx/mapname_nagybatony.mp3",
  maconka: "/sfx/mapname_maconka.mp3",
  miskolc: "/sfx/mapname_miskolc.mp3",
  ozd: "/sfx/mapname_ozd.mp3",
  kispest: "/sfx/mapname_kispest.mp3",
  hosutca: "/sfx/mapname_hosutca.mp3",
  pokol: "/sfx/mapname_pokol.mp3",
  arpadhid: "/sfx/mapname_arpadhid.mp3",
};
const CHAR_TAUNT: Record<string, string> = {
  ricsi: "/sfx/ricsi_taunt.mp3",
  renike: "/sfx/renike_taunt.mp3",
  cica: "/sfx/cica_taunt.mp3",
  agi: "/sfx/vampiragi_taunt.mp3",
  cricsi: "/sfx/ciganyricsi_taunt.mp3",
  jezus: "/sfx/jezus_taunt.mp3",
  hoffer: "/sfx/hofferjozsi_taunt.mp3",
  farajo: "/sfx/farajo_taunt.mp3",
  gabi: "/sfx/gabi_taunt.mp3",
  isti: "/sfx/isti_taunt.mp3",
  alfonz: ALFONZ_TAUNT,
  leo: LEO_TAUNT,
};

const CHAR_ATTACK: Record<string, VoicePool> = { ricsi: RICSI_ATTACK, renike: RENIKE_ATTACK, cica: CICA_ATTACK, agi: AGI_ATTACK, cricsi: CRICSI_ATTACK, jezus: JEZUS_ATTACK, hoffer: HOFFER_ATTACK, farajo: FARAJO_ATTACK, gabi: GABI_ATTACK, isti: ISTI_ATTACK, leo: LEO_ATTACK };
const CHAR_DAMAGE: Record<string, VoicePool> = { ricsi: RICSI_DAMAGE, renike: RENIKE_DAMAGE, cica: CICA_DAMAGE, agi: AGI_DAMAGE, cricsi: CRICSI_DAMAGE, jezus: JEZUS_DAMAGE, hoffer: HOFFER_DAMAGE, farajo: FARAJO_DAMAGE, gabi: GABI_DAMAGE, isti: ISTI_DAMAGE, leo: LEO_DAMAGE };
const CHAR_DEFEAT: Record<string, string> = { ricsi: RICSI_DEFEAT, renike: RENIKE_DEFEAT, cica: CICA_DEFEAT, agi: AGI_DEFEAT, cricsi: CRICSI_DEFEAT, jezus: JEZUS_DEFEAT, hoffer: HOFFER_DEFEAT, farajo: FARAJO_DEFEAT, gabi: GABI_DEFEAT, isti: ISTI_DEFEAT, alfonz: ALFONZ_DEFEAT, leo: LEO_DEFEAT };
const CHAR_SPECIAL1: Record<string, string> = { renike: RENIKE_SERPENYO, agi: AGI_KOPES, jezus: JEZUS_OSZLOP, hoffer: HOFFER_DUHROHAM, farajo: FARAJO_TROMBITA, gabi: GABI_BAT, isti: ISTI_FELUGRAS, alfonz: ALFONZ_SZIPUA, leo: LEO_HEKTOR1 };
const CHAR_SPECIAL2: Record<string, string> = { renike: RENIKE_FING, ricsi: RICSI_HANYAS, cica: CICA_QUAKE, agi: AGI_VERSZIVAS, cricsi: CRICSI_KIBLAST, jezus: JEZUS_VEDOGOMB, hoffer: HOFFER_GYEREIDE, farajo: FARAJO_GITAR, gabi: GABI_SHOT, isti: ISTI_DOBBANTAS, alfonz: ALFONZ_NAGYPATIKA, leo: LEO_PITBULL };

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
    ctx.addEventListener("statechange", () => {
      if (ctx?.state === "running" && musicEl && musicEl.paused) {
        void musicEl.play().catch(() => {
          /* still blocked */
        });
      }
    });
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

let primed = false;

export function isAudioPrimed() {
  return primed && ctx?.state === "running";
}

/** Call from a real user gesture (click / tap / key). Gamepad does not count. */
export function primeAudio() {
  const c = ac();
  void c.resume();
  try {
    const buf = c.createBuffer(1, 1, c.sampleRate);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start();
  } catch {
    /* ignore */
  }
  primed = true;
  if (musicKind === "stage") {
    if (musicEl) {
      musicEl.muted = mix().music <= 0;
      void musicEl.play().catch(() => {
        /* blocked */
      });
    }
  } else {
    startMenuMusic();
  }
}

export async function unlockAudio() {
  const c = ac();
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      /* gesture required */
    }
    if (ac().state === "running") {
      primed = true;
      if (musicEl && musicEl.paused) {
        musicEl.muted = mix().music <= 0;
        void musicEl.play().catch(() => {
          /* blocked */
        });
      }
    }
    return true;
  }
  primed = true;
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
  const hit = buffers.get(url);
  if (hit) return hit;
  const c = ac();
  let raw = rawCache.get(url);
  if (!raw) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = window.setTimeout(() => ctrl?.abort(), 3500);
    try {
      const res = await fetch(asset(url), ctrl ? { signal: ctrl.signal } : undefined);
      if (!res.ok) throw new Error(url);
      raw = await res.arrayBuffer();
      rawCache.set(url, raw);
    } finally {
      window.clearTimeout(timer);
    }
  }
  const buf = await Promise.race([
    c.decodeAudioData(raw.slice(0)),
    new Promise<AudioBuffer>((_, rej) => window.setTimeout(() => rej(new Error("decode timeout")), 2500)),
  ]);
  buffers.set(url, buf);
  return buf;
}

export function sfxPreloadList(): string[] {
  return [...sfxMenuList(), ...sfxFightList(Object.keys(CHAR_NAME))];
}

export function sfxMenuList(): string[] {
  return [TITLE_FILE, ...Object.values(CHAR_NAME), ...Object.values(STAGE_NAME)];
}

export function sfxFightList(ids: string[]): string[] {
  const extra: string[] = [...Object.values(ROUND_FILES), ...HIT_FILES, ...SWING_FILES, KO_FILE, KO_IMPACT, SUPER_DASH_FILE, BLOCK_FILE, DASH_FILE];
  const seen = new Set<string>(extra);
  const add = (url?: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    extra.push(url);
  };
  for (const id of ids) {
    for (const f of CHAR_ATTACK[id]?.files ?? []) add(f);
    for (const f of CHAR_DAMAGE[id]?.files ?? []) add(f);
    add(CHAR_DEFEAT[id]);
    add(CHAR_SPECIAL1[id]);
    add(CHAR_SPECIAL2[id]);
    add(CHAR_WIN[id]);
    add(CHAR_TAUNT[id]);
    if (id === "cica") add(CICA_QUAKE);
    if (id === "renike") {
      add(RENIKE_FING);
      add(RENIKE_FINGAS);
      add(RENIKE_SERPENYO);
    }
    if (id === "ricsi") add(RICSI_HANYAS);
    if (id === "farajo") {
      add(FARAJO_TROMBITA);
      add(FARAJO_GITAR);
    }
    if (id === "gabi") add(GABI_PISTOL);
    if (id === "leo") add(LEO_HEKTOR2);
  }
  return extra;
}

export function musicPreloadList(): string[] {
  return [MENU_FILE, ...Object.values(MUSIC_FILES)];
}

export function musicMenuList(): string[] {
  return [MENU_FILE];
}

export function musicFightList(stage?: string): string[] {
  if (stage && MUSIC_FILES[stage]) return [MUSIC_FILES[stage]!];
  return Object.values(MUSIC_FILES);
}

export async function preloadSfx(onItem?: () => void, urls?: string[], musicUrls?: string[]) {
  ac();
  const list = urls ?? sfxPreloadList();
  await Promise.all(
    list.map(async (url) => {
      if (buffers.has(url) || rawCache.has(url)) {
        onItem?.();
        return;
      }
      try {
        const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
        const t = window.setTimeout(() => ctrl?.abort(), 2500);
        const res = await fetch(asset(url), ctrl ? { signal: ctrl.signal } : undefined);
        window.clearTimeout(t);
        if (res.ok) rawCache.set(url, await res.arrayBuffer());
      } catch {
        /* missing clip must not block the match */
      }
      onItem?.();
    }),
  );
  const music = musicUrls ?? musicPreloadList();
  await Promise.all(
    music.map(async (url) => {
      if (MUSIC_BLOBS[url]) {
        onItem?.();
        return;
      }
      try {
        const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
        const t = window.setTimeout(() => ctrl?.abort(), 4000);
        const res = await fetch(asset(url), ctrl ? { signal: ctrl.signal } : undefined);
        window.clearTimeout(t);
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

function playLeoHektor() {
  playOneShot(LEO_HEKTOR1, 1.22, 1);
  window.setTimeout(() => playOneShot(LEO_HEKTOR2, 1.22, 1), 800);
}

function pickHitUrl() {
  let i = Math.floor(Math.random() * HIT_FILES.length);
  if (i === lastHitIndex) i = (i + 1) % HIT_FILES.length;
  lastHitIndex = i;
  return HIT_FILES[i];
}

function pickSwingUrl() {
  let i = Math.floor(Math.random() * SWING_FILES.length);
  if (i === lastSwingIndex) i = (i + 1) % SWING_FILES.length;
  lastSwingIndex = i;
  return SWING_FILES[i]!;
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
  if (id === "isti") return base * 0.84;
  return base;
}

type FarajoMode = "trumpet" | "guitar";
type FarajoBed = {
  src: AudioBufferSourceNode | null;
  gain: GainNode | null;
  mode: FarajoMode | null;
  want: FarajoMode | null;
  startedAt: number;
  startOffset: number;
  resume: number;
};
const farajoBeds: Record<string, FarajoBed> = {
  p1: { src: null, gain: null, mode: null, want: null, startedAt: 0, startOffset: 0, resume: 0 },
  p2: { src: null, gain: null, mode: null, want: null, startedAt: 0, startOffset: 0, resume: 0 },
};

function farajoUrl(mode: FarajoMode) {
  return mode === "guitar" ? FARAJO_GITAR : FARAJO_TROMBITA;
}

function stopFarajoBed(side: string, save: boolean) {
  const b = farajoBeds[side];
  if (!b) return;
  const c = ctx;
  if (save && b.mode === "guitar" && b.src && c) {
    const buf = buffers.get(FARAJO_GITAR);
    const dur = buf?.duration ?? 0;
    if (dur > 0.05) b.resume = (b.startOffset + Math.max(0, c.currentTime - b.startedAt)) % dur;
  }
  if (b.src) {
    b.src.onended = null;
    try {
      b.src.stop();
    } catch {
      /* already ended */
    }
    try {
      b.src.disconnect();
      b.gain?.disconnect();
    } catch {
      /* ignore */
    }
  }
  b.src = null;
  b.gain = null;
  b.mode = null;
}

function startFarajoBed(side: string, mode: FarajoMode) {
  const b = farajoBeds[side] ?? (farajoBeds[side] = { src: null, gain: null, mode: null, want: null, startedAt: 0, startOffset: 0, resume: 0 });
  if (b.mode === mode && b.src) return;
  stopFarajoBed(side, true);
  if (mix().sfx <= 0) return;
  const url = farajoUrl(mode);
  const play = (buf: AudioBuffer) => {
    const c = ac();
    if (c.state === "suspended") void c.resume();
    const src = c.createBufferSource();
    const g = c.createGain();
    const dur = Math.max(0.05, buf.duration);
    const offset = mode === "guitar" ? ((b.resume % dur) + dur) % dur : 0;
    src.buffer = buf;
    src.loop = mode === "guitar";
    g.gain.value = 1;
    src.connect(g).connect(dest());
    src.onended = () => {
      if (b.src === src) {
        b.src = null;
        b.gain = null;
        b.mode = null;
        if (b.want === "guitar") {
          b.resume = 0;
          startFarajoBed(side, "guitar");
          return;
        }
      }
      try {
        src.disconnect();
        g.disconnect();
      } catch {
        /* ignore */
      }
    };
    try {
      src.start(0, Math.min(offset, Math.max(0, dur - 0.01)));
    } catch {
      src.start(0);
    }
    b.src = src;
    b.gain = g;
    b.mode = mode;
    b.startedAt = c.currentTime;
    b.startOffset = offset;
  };
  const buf = buffers.get(url);
  if (buf) {
    play(buf);
    return;
  }
  void decodeUrl(url)
    .then((decoded) => {
      buffers.set(url, decoded);
      if (farajoBeds[side]?.want !== mode) return;
      if (farajoBeds[side]?.mode === mode && farajoBeds[side]?.src) return;
      play(decoded);
    })
    .catch(() => {
      /* clip missing */
    });
}

function syncFarajoBed(side: string, mode: FarajoMode | null) {
  const b = farajoBeds[side] ?? (farajoBeds[side] = { src: null, gain: null, mode: null, want: null, startedAt: 0, startOffset: 0, resume: 0 });
  b.want = mode;
  if (!mode) {
    stopFarajoBed(side, true);
    return;
  }
  startFarajoBed(side, mode);
}

function resetFarajoBeds() {
  for (const side of ["p1", "p2"]) {
    stopFarajoBed(side, false);
    if (farajoBeds[side]) {
      farajoBeds[side].resume = 0;
      farajoBeds[side].want = null;
    }
  }
}

let sfxTap: ((k: string, id?: string) => void) | null = null;
export function setSfxTap(fn: ((k: string, id?: string) => void) | null) {
  sfxTap = fn;
}

export const sfxPlay = {
  hit: () => {
    sfxTap?.("hit");
    playHit(0.92);
  },
  heavy: () => {
    sfxTap?.("heavy");
    playHit(1);
  },
  block: () => {
    sfxTap?.("block");
    playOneShot(BLOCK_FILE, 0.52, 0.96 + Math.random() * 0.08);
  },
  ko: () => {
    sfxTap?.("ko");
    playOneShot(KO_IMPACT, 0.55, 1);
    playOneShot(KO_FILE, 1, 1);
  },
  win: () => beep(440, 0.25, "triangle", 0.08, 220),
  fatality: () => {
    beep(80, 0.5, "sawtooth", 0.18, -50);
    beep(160, 0.4, "square", 0.1, -80);
  },
  dash: () => {
    sfxTap?.("dash");
    playOneShot(DASH_FILE, 0.42, 0.96 + Math.random() * 0.08);
  },
  swing: () => {
    sfxTap?.("swing");
    playOneShot(pickSwingUrl(), 0.34, 0.94 + Math.random() * 0.1);
  },
  superDash: () => {
    sfxTap?.("superDash");
    playOneShot(SUPER_DASH_FILE, 1, 1);
  },
  charAttack: (id: string) => {
    sfxTap?.("attack", id);
    const pool = CHAR_ATTACK[id];
    if (!pool) return;
    playVoice(id, pickFrom(pool), voiceVol(id, 0.96), 0.98 + Math.random() * 0.04);
  },
  charDamage: (id: string) => {
    sfxTap?.("damage", id);
    const pool = CHAR_DAMAGE[id];
    if (!pool) return;
    playVoice(id, pickFrom(pool), voiceVol(id, 1), 0.98 + Math.random() * 0.04);
  },
  charDefeat: (id: string) => {
    sfxTap?.("defeat", id);
    const url = CHAR_DEFEAT[id];
    if (!url) return;
    playVoice(id, url, voiceVol(id, 1), 1);
  },
  charSpecial1: (id: string) => {
    sfxTap?.("special1", id);
    if (id === "farajo") return;
    const url = CHAR_SPECIAL1[id];
    if (!url) {
      const pool = CHAR_ATTACK[id];
      if (!pool) return;
      playVoice(id, pickFrom(pool), voiceVol(id, 0.96), 0.98 + Math.random() * 0.04);
      return;
    }
    if (id === "jezus") playOneShot(url, 2.4, 1);
    else if (id === "agi") playOneShot(url, 1, 1);
    else if (id === "hoffer" || id === "renike") playOneShot(url, voiceVol(id, 1), 1);
    else if (id === "gabi") playOneShot(url, 1, 1);
    else if (id === "isti") playOneShot(url, 1.12, 1);
    else if (id === "alfonz") playOneShot(url, 1, 1);
    else if (id === "leo") playLeoHektor();
    else playVoice(id, url, voiceVol(id, 1), 1);
  },
  charSpecial2: (id: string) => {
    sfxTap?.("special2", id);
    if (id === "farajo") return;
    const url = CHAR_SPECIAL2[id];
    if (!url) return;
    if (id === "jezus") playOneShot(url, 2.4, 1);
    else if (id === "agi" || id === "cricsi") playOneShot(url, 1, 1);
    else if (id === "hoffer") playOneShot(url, voiceVol(id, 1), 1);
    else if (id === "renike") {
      playOneShot(RENIKE_FINGAS, voiceVol(id, 1), 1);
      playOneShot(url, 1, 1);
    } else if (id === "gabi") {
      playOneShot(url, 1, 1);
      playOneShot(GABI_PISTOL, 1, 1);
    } else if (id === "isti") playOneShot(url, voiceVol(id, 0.9), 1);
    else if (id === "alfonz") playOneShot(url, 1, 1);
    else if (id === "leo") playOneShot(url, 1.22, 1);
    else playVoice(id, url, voiceVol(id, 1), 1);
  },
  quake: () => {
    sfxTap?.("quake");
    playOneShot(CICA_QUAKE, voiceVol("cica", 0.95), 0.96 + Math.random() * 0.08);
  },
  charName: (id: string) => {
    const url = CHAR_NAME[id];
    if (!url) return;
    playAnnouncerShot(url, 1);
  },
  stageName: (id: string) => {
    const url = STAGE_NAME[id];
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
  charTaunt: (id: string) => {
    const url = CHAR_TAUNT[id];
    if (!url) return;
    playOneShot(url, voiceVol(id, 1), 1);
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
  farajoBed: (side: string, mode: FarajoMode | null) => syncFarajoBed(side, mode),
  farajoReset: () => resetFarajoBeds(),
  stageHoldForGuitar: (on: boolean) => setGuitarStageHold(on),
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
  const resolved = MUSIC_BLOBS[url] ?? asset(url);
  if (!musicEl) {
    musicEl = new Audio(resolved);
    musicEl.loop = true;
    musicEl.preload = "auto";
    musicEl.crossOrigin = "anonymous";
  } else if (musicKind !== kind || musicFile !== url) {
    musicEl.src = resolved;
  }
  musicKind = kind;
  musicFile = url;
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
  const c = ac();
  if (c.state === "suspended") void c.resume();
  if (musicKind === "menu" && musicEl && !musicEl.paused && c.state === "running") return;
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
  el.muted = mix().music <= 0;
  void el.play().catch(() => {
    /* autoplay blocked until next gesture */
  });
}

let guitarHold = false;

function setGuitarStageHold(on: boolean) {
  if (on === guitarHold) return;
  guitarHold = on;
  if (!musicEl || musicKind !== "stage") return;
  if (on) {
    if (!musicEl.paused) musicEl.pause();
    return;
  }
  musicEl.muted = mix().music <= 0;
  void musicEl.play().catch(() => {
    /* autoplay */
  });
}

export function startStageMusic(stage: string, restart = true) {
  const url = MUSIC_FILES[stage] ?? MUSIC_FILES.kitchen;
  if (!url) return;
  guitarHold = false;
  const c = ac();
  if (c.state === "suspended") void c.resume();
  if (!restart && musicKind === "stage" && musicFile === url && musicEl) {
    musicEl.muted = mix().music <= 0;
    if (musicEl.paused) {
      void musicEl.play().catch(() => {
        /* autoplay */
      });
    }
    return;
  }
  const el = ensureMusicEl(url, "stage");
  if (!el) return;
  hookMusicGraph(el);
  stopKitchenDrone();
  if (restart) {
    try {
      el.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
  el.muted = mix().music <= 0;
  void el.play().catch(() => {
    /* autoplay blocked until next gesture */
  });
}

export function stopStageMusic() {
  guitarHold = false;
  if (!musicEl) return;
  musicEl.pause();
  try {
    musicEl.currentTime = 0;
  } catch {
    /* ignore */
  }
}
