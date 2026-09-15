import { getHudScale } from "./settings";
import { getPadCount, rumble, sampleP1, sampleP2, sampleMenu, injectKeys, type Actions } from "./input";
import { sfxPlay, preloadSfx, lastRoundSfx, startStageMusic, stopStageMusic, startMenuMusic, sfxMenuList, sfxFightList, musicMenuList, musicFightList, setSfxTap } from "./audio";
import { packBits, unpackBits } from "./net";
import { asset } from "./asset";

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys?: (codes: string[]) => void;
      getState?: () => string;
      getX?: () => number;
      getY?: () => number;
      getFacing?: () => number;
      getX2?: () => number;
      getPose?: () => string;
      getScreen?: () => string;
      skipToFight?: () => void;
      skipIntro?: () => void;
      sprayBlood?: () => void;
      fillMeter?: () => void;
      playAs?: (id: string) => void;
      getLastRoundSfx?: () => number;
      getMeter?: () => number;
      getMeter2?: () => number;
      getHp2?: () => number;
      getState2?: () => string;
      getY2?: () => number;
      place?: (x1: number, x2: number) => void;
      getWins1?: () => number;
      getWins2?: () => number;
      koP2?: () => void;
      getCallout?: () => string | null;
      getWinner?: () => string | null;
      getRageT?: () => number;
      getPullT?: () => number;
    };
  }
}

export type CharId = "renike" | "ricsi" | "cica" | "agi" | "cricsi" | "jezus" | "hoffer" | "farajo" | "gabi" | "isti";
export const CHAR_IDS: CharId[] = ["renike", "ricsi", "cica", "agi", "cricsi", "jezus", "hoffer", "farajo", "gabi", "isti"];
export type StageId = "kitchen" | "sintertanya" | "kisterenye" | "golgota" | "nepszinhaz" | "salgotarjan" | "nagybatony" | "maconka" | "miskolc" | "ozd" | "kispest" | "hosutca" | "pokol";
export const STAGE_IDS: StageId[] = ["sintertanya", "kisterenye", "golgota", "nepszinhaz", "salgotarjan", "nagybatony", "maconka", "miskolc", "ozd", "kispest", "hosutca", "pokol"];
export const GAME_VERSION = "v0.48";
/** Special splash texts (Büdi, Dühroham, stb.) — keep strings, hide in-game. */
export const SHOW_SPECIAL_CALLOUTS = false;
export type Difficulty = "easy" | "normal" | "hard" | "szopni";
export type DummyMode = "idle" | "cpu" | "p2";
export type TrainPress = { id: number; k: string };
export const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard", "szopni"];
export function difficultyLabel(d: Difficulty) {
  if (d === "easy") return "Könnyű";
  if (d === "normal") return "Normál";
  if (d === "hard") return "Nehéz";
  return "SZOPNI FOGSZ";
}
export type Screen = "title" | "select" | "stage" | "vs" | "fight" | "pause" | "result" | "online" | "lobby";
export type Pose =
  | "idle"
  | "punch"
  | "kick"
  | "hurt"
  | "special"
  | "jump"
  | "walk0"
  | "walk1"
  | "walk2"
  | "walk3"
  | "punchL"
  | "punchR"
  | "kickL"
  | "kickR"
  | "block"
  | "dash"
  | "jumpPunchL"
  | "jumpPunchR"
  | "jumpKickL"
  | "jumpKickR"
  | "lowPunchL"
  | "lowPunchR"
  | "lowKickL"
  | "lowKickR"
  | "special2"
  | "crouch";

type AtkId = "punchL" | "punchR" | "kickL" | "kickR" | "special" | "special2";
type FState = "idle" | "walk" | "jump" | "attack" | "hurt" | "block" | "crouch" | "ko" | "win" | "dash";

type Atk = {
  id: AtkId;
  pose: Pose;
  startup: number;
  active: number;
  recover: number;
  dmg: number;
  hitstun: number;
  blockstun: number;
  knock: number;
  cost: number;
  hx: number;
  hy: number;
  hw: number;
  hh: number;
  cancel: AtkId[];
  low?: boolean;
  unblockable?: boolean;
  zone?: "cloud" | "beam" | "quake" | "spit" | "ki" | "pillar" | "spin" | "brush" | "note" | "solo" | "bat" | "shot" | "meteor" | "stomp";
  pounce?: boolean;
  heal?: number;
  shield?: boolean;
  armor?: boolean;
  rage?: boolean;
  pull?: boolean;
};

const PUNCH_L: Atk = {
  id: "punchL",
  pose: "punchL",
  startup: 0.05,
  active: 0.06,
  recover: 0.14,
  dmg: 6,
  hitstun: 0.32,
  blockstun: 0.12,
  knock: 70,
  cost: 0,
  hx: 48,
  hy: 168,
  hw: 78,
  hh: 44,
  cancel: ["punchL", "punchR", "kickL", "kickR", "special"],
};
const PUNCH_R: Atk = {
  id: "punchR",
  pose: "punchR",
  startup: 0.08,
  active: 0.08,
  recover: 0.16,
  dmg: 10,
  hitstun: 0.36,
  blockstun: 0.16,
  knock: 150,
  cost: 0,
  hx: 54,
  hy: 160,
  hw: 92,
  hh: 52,
  cancel: ["kickL", "kickR", "special"],
};
const KICK_L: Atk = {
  id: "kickL",
  pose: "kickL",
  startup: 0.1,
  active: 0.08,
  recover: 0.18,
  dmg: 12,
  hitstun: 0.38,
  blockstun: 0.18,
  knock: 190,
  cost: 0,
  hx: 56,
  hy: 128,
  hw: 110,
  hh: 70,
  cancel: ["kickR", "punchR", "special"],
};
const KICK_R: Atk = {
  id: "kickR",
  pose: "kickR",
  startup: 0.13,
  active: 0.1,
  recover: 0.24,
  dmg: 16,
  hitstun: 0.44,
  blockstun: 0.22,
  knock: 380,
  cost: 0,
  hx: 58,
  hy: 108,
  hw: 128,
  hh: 86,
  cancel: ["special"],
};
const SPECIAL: Atk = {
  id: "special",
  pose: "special",
  startup: 0.18,
  active: 0.14,
  recover: 0.3,
  dmg: 26,
  hitstun: 0.58,
  blockstun: 0.28,
  knock: 560,
  cost: 50,
  hx: 42,
  hy: 250,
  hw: 188,
  hh: 200,
  cancel: [],
};

const SPECIAL2_FART: Atk = {
  id: "special2",
  pose: "special2",
  startup: 0.22,
  active: 0.2,
  recover: 0.32,
  dmg: 18,
  hitstun: 0.5,
  blockstun: 0,
  knock: 240,
  cost: 50,
  hx: 36,
  hy: 110,
  hw: 150,
  hh: 110,
  cancel: [],
  unblockable: true,
  zone: "cloud",
};
const SPECIAL2_PUKE: Atk = {
  id: "special2",
  pose: "special2",
  startup: 0.2,
  active: 0.34,
  recover: 0.26,
  dmg: 22,
  hitstun: 0.52,
  blockstun: 0,
  knock: 420,
  cost: 50,
  hx: 40,
  hy: 305,
  hw: 540,
  hh: 92,
  cancel: [],
  unblockable: true,
  zone: "beam",
};

const SPECIAL_TIGER: Atk = {
  id: "special",
  pose: "special",
  startup: 0.18,
  active: 0.16,
  recover: 0.34,
  dmg: 20,
  hitstun: 0.5,
  blockstun: 0.26,
  knock: 460,
  cost: 50,
  hx: 28,
  hy: 200,
  hw: 210,
  hh: 150,
  cancel: [],
  pounce: true,
};
const SPECIAL2_QUAKE: Atk = {
  id: "special2",
  pose: "special2",
  startup: 0.2,
  active: 0.72,
  recover: 0.34,
  dmg: 8,
  hitstun: 0.3,
  blockstun: 0.22,
  knock: 200,
  cost: 50,
  hx: 8,
  hy: 92,
  hw: 220,
  hh: 88,
  cancel: [],
  low: true,
  zone: "quake",
};

const SPECIAL_SPIT: Atk = {
  id: "special",
  pose: "special",
  startup: 0.14,
  active: 0.1,
  recover: 0.3,
  dmg: 16,
  hitstun: 0.42,
  blockstun: 0.18,
  knock: 160,
  cost: 50,
  hx: 48,
  hy: 290,
  hw: 44,
  hh: 36,
  cancel: [],
  zone: "spit",
};
const SPECIAL2_VAMP: Atk = {
  id: "special2",
  pose: "special2",
  startup: 0,
  active: 0.26,
  recover: 0.34,
  dmg: 16,
  hitstun: 0.52,
  blockstun: 0.22,
  knock: 90,
  cost: 50,
  hx: 36,
  hy: 210,
  hw: 108,
  hh: 86,
  cancel: [],
  heal: 12,
};

const SPECIAL_SUPERMAN: Atk = {
  id: "special",
  pose: "special",
  startup: 0.14,
  active: 0.2,
  recover: 0.3,
  dmg: 24,
  hitstun: 0.62,
  blockstun: 0.26,
  knock: 640,
  cost: 50,
  hx: 36,
  hy: 230,
  hw: 250,
  hh: 150,
  cancel: [],
  pounce: true,
};
const SPECIAL2_KI: Atk = {
  id: "special2",
  pose: "special2",
  startup: 0.18,
  active: 0.28,
  recover: 0.36,
  dmg: 22,
  hitstun: 0.56,
  blockstun: 0,
  knock: 380,
  cost: 50,
  hx: 8,
  hy: 280,
  hw: 280,
  hh: 280,
  cancel: [],
  unblockable: true,
  zone: "ki",
};

const SPECIAL_PILLAR: Atk = {
  id: "special",
  pose: "special",
  startup: 0.28,
  active: 0.16,
  recover: 0.4,
  dmg: 4,
  hitstun: 0.18,
  blockstun: 0,
  knock: 40,
  cost: 50,
  hx: 0,
  hy: 0,
  hw: 1,
  hh: 1,
  cancel: [],
  zone: "pillar",
  heal: 2,
};
const SPECIAL2_AURA: Atk = {
  id: "special2",
  pose: "special2",
  startup: 0.18,
  active: 0.12,
  recover: 0.22,
  dmg: 0,
  hitstun: 0,
  blockstun: 0,
  knock: 0,
  cost: 50,
  hx: 0,
  hy: 0,
  hw: 1,
  hh: 1,
  cancel: [],
  shield: true,
};

const SPECIAL_SPIN: Atk = {
  id: "special",
  pose: "special",
  startup: 0.1,
  active: 2.0,
  recover: 0.2,
  dmg: 5,
  hitstun: 0.18,
  blockstun: 0.14,
  knock: 90,
  cost: 50,
  hx: -70,
  hy: 250,
  hw: 200,
  hh: 250,
  cancel: [],
  zone: "spin",
  armor: true,
};
const SPECIAL_THROW: Atk = {
  id: "special2",
  pose: "special2",
  startup: 0.18,
  active: 0.12,
  recover: 0.3,
  dmg: 18,
  hitstun: 0.46,
  blockstun: 0.2,
  knock: 340,
  cost: 50,
  hx: 40,
  hy: 210,
  hw: 90,
  hh: 70,
  cancel: [],
  zone: "brush",
};

const SPECIAL_RAGE: Atk = {
  id: "special",
  pose: "special",
  startup: 0.16,
  active: 0.2,
  recover: 0.28,
  dmg: 0,
  hitstun: 0,
  blockstun: 0,
  knock: 0,
  cost: 50,
  hx: 0,
  hy: 0,
  hw: 1,
  hh: 1,
  cancel: [],
  rage: true,
};
const SPECIAL_PULL: Atk = {
  id: "special2",
  pose: "special2",
  startup: 0.18,
  active: 0.62,
  recover: 0.2,
  dmg: 0,
  hitstun: 0,
  blockstun: 0,
  knock: 0,
  cost: 50,
  hx: 0,
  hy: 0,
  hw: 1,
  hh: 1,
  cancel: [],
  pull: true,
  unblockable: true,
};

const SPECIAL_TRUMPET: Atk = {
  id: "special",
  pose: "special",
  startup: 0.18,
  active: 2.25,
  recover: 0.28,
  dmg: 5.25,
  hitstun: 0.38,
  blockstun: 0.16,
  knock: 140,
  cost: 50,
  hx: 48,
  hy: 290,
  hw: 44,
  hh: 36,
  cancel: [],
  zone: "note",
};
const SPECIAL_GUITAR: Atk = {
  id: "special2",
  pose: "special2",
  startup: 0,
  active: 30,
  recover: 0.32,
  dmg: 0,
  hitstun: 0,
  blockstun: 0,
  knock: 0,
  cost: 10,
  hx: 28,
  hy: 210,
  hw: 190,
  hh: 170,
  cancel: [],
  zone: "solo",
  heal: 5,
};

const SPECIAL_BAT: Atk = {
  id: "special",
  pose: "special",
  startup: 0.08,
  active: 0.72,
  recover: 0.2,
  dmg: 7,
  hitstun: 0.16,
  blockstun: 0.1,
  knock: 210,
  cost: 50,
  hx: 14,
  hy: 260,
  hw: 108,
  hh: 170,
  cancel: [],
  zone: "bat",
};
const SPECIAL_SHOT: Atk = {
  id: "special2",
  pose: "special2",
  startup: 0.42,
  active: 0.16,
  recover: 0.34,
  dmg: 28,
  hitstun: 0.55,
  blockstun: 0,
  knock: 320,
  cost: 50,
  hx: 48,
  hy: 310,
  hw: 40,
  hh: 28,
  cancel: [],
  zone: "shot",
  unblockable: true,
};
const SPECIAL_METEOR: Atk = {
  id: "special",
  pose: "special",
  startup: 0.38,
  active: 0.55,
  recover: 0.3,
  dmg: 26,
  hitstun: 0.55,
  blockstun: 0,
  knock: 280,
  cost: 50,
  hx: -48,
  hy: 260,
  hw: 110,
  hh: 220,
  cancel: [],
  zone: "meteor",
  unblockable: true,
};
const SPECIAL_STOMP: Atk = {
  id: "special2",
  pose: "special2",
  startup: 0.14,
  active: 0.12,
  recover: 0.18,
  dmg: 14,
  hitstun: 0.42,
  blockstun: 0.16,
  knock: 60,
  cost: 50,
  hx: -36,
  hy: 100,
  hw: 150,
  hh: 100,
  cancel: [],
  zone: "stomp",
};

function special1For(id: CharId): Atk {
  if (id === "cica") return SPECIAL_TIGER;
  if (id === "agi") return SPECIAL_SPIT;
  if (id === "cricsi") return SPECIAL_SUPERMAN;
  if (id === "jezus") return SPECIAL_PILLAR;
  if (id === "hoffer") return SPECIAL_RAGE;
  if (id === "farajo") return SPECIAL_TRUMPET;
  if (id === "gabi") return SPECIAL_BAT;
  if (id === "isti") return SPECIAL_METEOR;
  return SPECIAL;
}
function special2For(id: CharId): Atk {
  if (id === "renike") return SPECIAL2_FART;
  if (id === "ricsi") return SPECIAL2_PUKE;
  if (id === "cica") return SPECIAL2_QUAKE;
  if (id === "cricsi") return SPECIAL2_KI;
  if (id === "jezus") return SPECIAL2_AURA;
  if (id === "hoffer") return SPECIAL_PULL;
  if (id === "farajo") return SPECIAL_GUITAR;
  if (id === "gabi") return SPECIAL_SHOT;
  if (id === "isti") return SPECIAL_STOMP;
  return SPECIAL2_VAMP;
}

const ATK_BY_ID: Record<AtkId, Atk> = {
  punchL: PUNCH_L,
  punchR: PUNCH_R,
  kickL: KICK_L,
  kickR: KICK_R,
  special: SPECIAL,
  special2: SPECIAL2_FART,
};
const ANIM_ATKS: AtkId[] = ["punchL", "punchR", "kickL", "kickR", "special"];

const JUMP_POSE: Partial<Record<AtkId, Pose>> = {
  punchL: "jumpPunchL",
  punchR: "jumpPunchR",
  kickL: "jumpKickL",
  kickR: "jumpKickR",
};
const LOW_POSE: Partial<Record<AtkId, Pose>> = {
  punchL: "lowPunchL",
  punchR: "lowPunchR",
  kickL: "lowKickL",
  kickR: "lowKickR",
};

type ComboRoute = { name: string; seq: AtkId[]; bonus: number };
const COMBOS: ComboRoute[] = [
  { name: "MOSOGATÓ", seq: ["punchL", "punchR", "kickL", "kickR"], bonus: 10 },
  { name: "KONYHAI VIHAR", seq: ["punchL", "punchR", "kickR", "special"], bonus: 14 },
  { name: "SERPENYŐ LÁNCOLAT", seq: ["punchL", "punchR", "special"], bonus: 10 },
  { name: "DUPLA JAB", seq: ["punchL", "punchL", "punchR"], bonus: 6 },
  { name: "FAZOSS", seq: ["punchL", "kickL", "kickR"], bonus: 8 },
  { name: "KERESZT", seq: ["punchL", "punchR", "kickR"], bonus: 7 },
];

function matchCombo(chain: AtkId[]): ComboRoute | null {
  let best: ComboRoute | null = null;
  for (const c of COMBOS) {
    if (chain.length < c.seq.length) continue;
    const slice = chain.slice(-c.seq.length);
    if (c.seq.every((id, i) => id === slice[i]) && (!best || c.seq.length > best.seq.length)) best = c;
  }
  return best;
}

export const CHARACTERS: Record<
  CharId,
  { name: string; title: string; special: string; special2: string; fatality: string }
> = {
  renike: {
    name: "RENIKE",
    title: "A Rózsaszín Vihar",
    special: "SERPENYŐ",
    special2: "BÜDI",
    fatality: "",
  },
  ricsi: {
    name: "RICSI",
    title: "A Kopasz Kalapács",
    special: "ÜVEGES",
    special2: "HÁNYÓSUGÁR",
    fatality: "",
  },
  cica: {
    name: "CICA",
    title: "A Tuxedo Bestia",
    special: "TIGRISUGRÁS",
    special2: "FÖLDRENGETŐ",
    fatality: "KAROM FATALITY",
  },
  agi: {
    name: "ÁGI",
    title: "A Vámpír",
    special: "KÖPÉS",
    special2: "VÉRSZÍVÁS",
    fatality: "VAMPÍR FATALITY",
  },
  cricsi: {
    name: "CIGÁNYRICSI",
    title: "A GymBeam Harcos",
    special: "SUPERMAN PUNCH",
    special2: "KI ROBBANÁS",
    fatality: "KI FATALITY",
  },
  jezus: {
    name: "JÉZUS",
    title: "A Megváltó",
    special: "FÉNYOSZLOP",
    special2: "SZENT AURA",
    fatality: "ÁLDÁS FATALITY",
  },
  hoffer: {
    name: "HOFFER JÓZSI",
    title: "Az Idegbeteg",
    special: "DÜHROHAM",
    special2: "GYERE IDE!",
    fatality: "",
  },
  farajo: {
    name: "FÁRAJÓ",
    title: "A Zenész",
    special: "TROMBITA",
    special2: "GITÁRSZÓLÓ",
    fatality: "",
  },
  gabi: {
    name: "GABI",
    title: "Az Elmeháborodott",
    special: "BASEBALLÜTŐ",
    special2: "AGYONLÖVÉS",
    fatality: "",
  },
  isti: {
    name: "MC ISTI",
    title: "A TikTok Sztár",
    special: "FELUGRÁS",
    special2: "DOBBANTÁS",
    fatality: "",
  },
};

export const CHAR_SKILLS: Record<CharId, { s1: string; s2: string }> = {
  renike: {
    s1: "L1 Serpenyő — közepes hatótávú ütés, blokkolható.",
    s2: "R1 Büdi — fingós gázfelhő, területi támadás.",
  },
  ricsi: {
    s1: "L1 Üveges — borosüveges ütés, blokkolható.",
    s2: "R1 Hányósugár — előre lövő sugaras támadás.",
  },
  cica: {
    s1: "L1 Tigrisugrás — nagy hatótávú vetődés az ellenfélnek.",
    s2: "R1 Földrengető — három földütés, területi támadás. Guggolva-blokkolva védhető.",
  },
  agi: {
    s1: "L1 Köpés — projectile, leköpi az ellenfelet.",
    s2: "R1 Vérszívás — sebez és gyógyít.",
  },
  cricsi: {
    s1: "L1 Superman Punch — hosszú hatótávú kiütő ütés, blokkolható.",
    s2: "R1 KI Robbanás — AOE gömb, nem blokkolható.",
  },
  jezus: {
    s1: "L1 Fényoszlop — 5 mp-ig az ellenfél pozícióján sebez, Jézust gyógyítja.",
    s2: "R1 Szent Aura — 5 mp védőgömb: elnyeli a sebzést, nem támadhat, átmegy az ellenfélen (pl. sarokból a másik térfélre).",
  },
  hoffer: {
    s1: "L1 Dühroham — 5 mp: +30% mozgás és támadási sebesség, vörös tónus, a hatás alatt max 13% önsebzés.",
    s2: "R1 GYERE IDE! — az ellenfél 3 mp-ig elveszti az irányítást és lassan Hoffer felé sétál.",
  },
  farajo: {
    s1: "L1 Trombita — 2,25 mp helyben fúj, hangjegyek szinuszban az ellenfél felé, blokkolható, támadással megszakítható.",
    s2: "R1 Gitárszóló — amíg nyomva tartod és van energia, gyógyítja Fárajót.",
  },
  gabi: {
    s1: "L1 Baseballütő — öt közel csapás baseballütővel, knockback, blokkolható.",
    s2: "R1 Agyonlövés — pisztollyal céloz a fejre, majd lő. Blokkolható projectile.",
  },
  isti: {
    s1: "L1 Felugrás — kiugrik a képernyőről, majd az ellenfélre zuhan. Nem blokkolható.",
    s2: "R1 Dobbantás — földön lévő ellenfelet a levegőbe löki MC Isti felé.",
  },
};

export const STAGES: Record<StageId, { id: StageId; name: string; nameHu: string; art: string; blur: string }> = {
  kitchen: { id: "kitchen", name: "KITCHEN", nameHu: "Konyha", art: "/stages/kitchen.jpg?v=31", blur: "/stages/blur/kitchen.jpg?v=2" },
  sintertanya: { id: "sintertanya", name: "DURANDA", nameHu: "Duranda", art: "/stages/sintertanya.jpg?v=31", blur: "/stages/blur/sintertanya.jpg?v=2" },
  kisterenye: { id: "kisterenye", name: "KISTERENYE", nameHu: "Kisterenye", art: "/stages/kisterenye.jpg?v=31", blur: "/stages/blur/kisterenye.jpg?v=2" },
  golgota: { id: "golgota", name: "GOLGOTA", nameHu: "Golgota", art: "/stages/golgota.jpg?v=19", blur: "/stages/blur/golgota.jpg?v=2" },
  nepszinhaz: { id: "nepszinhaz", name: "NEPSZINHAZ", nameHu: "Népszínház utca", art: "/stages/nepszinhaz.jpg?v=19", blur: "/stages/blur/nepszinhaz.jpg?v=2" },
  salgotarjan: { id: "salgotarjan", name: "SALGOTARJAN", nameHu: "Salgótarján", art: "/stages/salgotarjan.jpg?v=29", blur: "/stages/blur/salgotarjan.jpg?v=2" },
  nagybatony: { id: "nagybatony", name: "NAGYBATONY", nameHu: "Nagybátony - Vasút", art: "/stages/nagybatony.jpg?v=29", blur: "/stages/blur/nagybatony.jpg?v=2" },
  maconka: { id: "maconka", name: "MACONKA", nameHu: "Maconka - Víztározó", art: "/stages/maconka.jpg?v=40", blur: "/stages/blur/maconka.jpg?v=40" },
  miskolc: { id: "miskolc", name: "MISKOLC", nameHu: "Miskolc - Avas", art: "/stages/miskolc.jpg?v=40", blur: "/stages/blur/miskolc.jpg?v=40" },
  ozd: { id: "ozd", name: "OZD", nameHu: "Ózd - Hétes Telep", art: "/stages/ozd.jpg?v=40", blur: "/stages/blur/ozd.jpg?v=40" },
  kispest: { id: "kispest", name: "KISPEST", nameHu: "Budapest - Kispest", art: "/stages/kispest.jpg?v=40", blur: "/stages/blur/kispest.jpg?v=40" },
  hosutca: { id: "hosutca", name: "HOS UTCA", nameHu: "Budapest - Hős Utca", art: "/stages/hosutca.jpg?v=40", blur: "/stages/blur/hosutca.jpg?v=40" },
  pokol: { id: "pokol", name: "POKOL", nameHu: "A Pokol", art: "/stages/pokol.jpg?v=40", blur: "/stages/blur/pokol.jpg?v=40" },
};

export const ROUND_CALL: Record<number, string> = {
  1: "Első Kör. HARC!",
  2: "Második Kör. HARC!",
  3: "VÉGSŐ KÖR. HARC!",
};

export function winLine(id: CharId) {
  const n = { renike: "Renike", ricsi: "Ricsi", cica: "Cica", agi: "Ági", cricsi: "Cigányricsi", jezus: "Jézus", hoffer: "Hoffer Józsi", farajo: "Fárajó", gabi: "Gabi", isti: "MC Isti" }[id];
  return `${n} a Győztes!`;
}

export const VICTORY_ART: Partial<Record<CharId, string>> = {
  renike: "/ui/victory/Victory_Renike.png",
  ricsi: "/ui/victory/Victory_Ricsi.png",
  cica: "/ui/victory/Victory_Cica.png",
  agi: "/ui/victory/Victory_Vampir_Agi.png",
  cricsi: "/ui/victory/Victory_Ciganyricsi.png",
  jezus: "/ui/victory/Victory_Jezus.png",
  hoffer: "/ui/victory/Victory_Hoffer_Jozsi.png",
  farajo: "/ui/victory/Victory_Farajo.png",
  gabi: "/ui/victory/Victory_Gabi.png",
  isti: "/ui/victory/Victory_Isti.png",
};

export const VS_ART: Partial<Record<CharId, string>> = {
  renike: "/ui/vs/renike.jpg",
  ricsi: "/ui/vs/ricsi.jpg",
  cica: "/ui/vs/cica.jpg",
  agi: "/ui/vs/agi.jpg",
  cricsi: "/ui/vs/cricsi.jpg",
  jezus: "/ui/vs/jezus.jpg",
  hoffer: "/ui/vs/hoffer.jpg",
  farajo: "/ui/vs/farajo.jpg",
  gabi: "/ui/vs/gabi.jpg",
  isti: "/ui/vs/isti.jpg",
};

export function vsJpgUrl(id: CharId) {
  return `/ui/vs/${id}.jpg?v=37`;
}
export function vsPngUrl(id: CharId) {
  return `/ui/vs/${id}.png?v=37`;
}
export function victoryUrl(id: CharId) {
  const base = VICTORY_ART[id]?.split("?")[0];
  return base ? `${base}?v=270` : "";
}

const W = 1280;
const H = 720;
const GROUND = 668;
const WALK_FWD = 460;
const WALK_BACK = 250;
const DASH_SPEED = 980;
const DASH_DUR = 0.18;
const SUPER_DASH_COST = 40;
const SUPER_DASH_SPEED = DASH_SPEED * 1.5;
const SUPER_DASH_DUR = (DASH_DUR * 1.3) / 1.5;
const METER_HIT_ATT = 12;
const METER_HIT_DEF = 6;
const METER_BLOCK_ATT = 4;
const METER_BLOCK_DEF = 8;
const TAP_WIN = 0.28;
const GRAV = 5100;
const JUMP_V = 1760;
const BUFFER = 0.14;
const STEP = 1 / 60;
const MAX_HP = 300;
const ROUND_TIME = 45;
const BLOOD_TINT = ["#3a0509", "#5c0810", "#7a0c18", "#a11020", "#c41828", "#6b0a12"];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  kind: "spark" | "burst" | "clang" | "smoke" | "num" | "blood" | "rock";
  text?: string;
  stick?: boolean;
  frame?: number;
  tint?: string;
};

type ReplayF = {
  x: number;
  y: number;
  facing: 1 | -1;
  pose: Pose;
  state: FState;
  flash: number;
  squash: number;
  bleed: number;
  superDash: boolean;
  rageT: number;
  shieldT: number;
  pullT: number;
  atk: Atk | null;
  atkT: number;
  dashDir: 1 | -1;
  dashT: number;
  crouchGuard: boolean;
  hp: number;
  meter: number;
};
type ReplaySfx = { i: number; k: string; id?: string };
type ReplaySnap = {
  f1: ReplayF;
  f2: ReplayF;
  particles: Particle[];
  trauma: number;
  timer: number;
  combo: number;
  comboSide: 1 | 2 | 0;
};
const REPLAY_SEC = 4.6;
const REPLAY_HZ = 60;
const REPLAY_MAX = Math.ceil(REPLAY_SEC * REPLAY_HZ);
const REPLAY_PLAY = 4.2;
const REPLAY_TAIL = 1.8;

function snapFighter(f: Fighter): ReplayF {
  return {
    x: f.x,
    y: f.y,
    facing: f.facing,
    pose: f.pose,
    state: f.state,
    flash: f.flash,
    squash: f.squash,
    bleed: f.bleed,
    superDash: f.superDash,
    rageT: f.rageT,
    shieldT: f.shieldT,
    pullT: f.pullT,
    atk: f.atk,
    atkT: f.atkT,
    dashDir: f.dashDir,
    dashT: f.dashT,
    crouchGuard: f.crouchGuard,
    hp: f.hp,
    meter: f.meter,
  };
}
function applyFighter(f: Fighter, s: ReplayF) {
  f.x = s.x;
  f.y = s.y;
  f.facing = s.facing;
  f.pose = s.pose;
  f.state = s.state;
  f.flash = s.flash;
  f.squash = s.squash;
  f.bleed = s.bleed;
  f.superDash = s.superDash;
  f.rageT = s.rageT;
  f.shieldT = s.shieldT;
  f.pullT = s.pullT;
  f.atk = s.atk;
  f.atkT = s.atkT;
  f.dashDir = s.dashDir;
  f.dashT = s.dashT;
  f.crouchGuard = s.crouchGuard;
  f.hp = s.hp;
  f.meter = s.meter;
}

type Box = { x: number; y: number; w: number; h: number; foot: number };
type Fighter = {
  id: CharId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  meter: number;
  wins: number;
  state: FState;
  pose: Pose;
  atk: Atk | null;
  atkT: number;
  hasHit: boolean;
  stun: number;
  invuln: number;
  flash: number;
  squash: number;
  bleed: number;
  combo: number;
  chain: AtkId[];
  comboTag: string;
  bufPunchL: number;
  bufPunchR: number;
  bufKickL: number;
  bufKickR: number;
  bufSpecial: number;
  bufSpecial2: number;
  spec2Spawned: boolean;
  dashT: number;
  dashDir: 1 | -1;
  superDash: boolean;
  tapL: number;
  tapR: number;
  walkT: number;
  airAtk: boolean;
  crouchGuard: boolean;
  shieldT: number;
  spinAcc: number;
  rageT: number;
  rageAcc: number;
  pullT: number;
  lastHurtT: number;
  sameAtkId: AtkId | "";
  sameAtkN: number;
};

type ImgBag = {
  renike: Record<Pose, HTMLImageElement>;
  ricsi: Record<Pose, HTMLImageElement>;
  cica: Record<Pose, HTMLImageElement>;
  agi: Record<Pose, HTMLImageElement>;
  cricsi: Record<Pose, HTMLImageElement>;
  jezus: Record<Pose, HTMLImageElement>;
  hoffer: Record<Pose, HTMLImageElement>;
  farajo: Record<Pose, HTMLImageElement>;
  gabi: Record<Pose, HTMLImageElement>;
  isti: Record<Pose, HTMLImageElement>;
  anims: Record<CharId, Partial<Record<AtkId, HTMLImageElement[]>>>;
  stage: HTMLImageElement;
};

export type Hud = {
  screen: Screen;
  p1: CharId;
  p2: CharId;
  hp1: number;
  hp2: number;
  meter1: number;
  meter2: number;
  wins1: number;
  wins2: number;
  timer: number;
  round: number;
  callout: string | null;
  combo: number;
  comboSide: 1 | 2 | 0;
  comboName: string | null;
  finish: boolean;
  winner: CharId | null;
  fatality: string | null;
  versusCpu: boolean;
  difficulty: Difficulty;
  selectSlot: 1 | 2;
  loading: boolean;
  pads: number;
  stage: StageId;
  netWait: boolean;
  loadPct: number;
  vsLoading: boolean;
  vsLoadPct: number;
  training: boolean;
  dummy: DummyMode;
  trainMeter: boolean;
  p1Hist: TrainPress[];
  p2Hist: TrainPress[];
};

function overlap(a: Box, b: Box) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function measureBox(im: HTMLImageElement): Box {
  const w = im.naturalWidth || im.width;
  const h = im.naturalHeight || im.height;
  if (!w || !h) return { x: 0, y: 0, w: 1, h: 1, foot: 1 };
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) return { x: 0, y: 0, w, h, foot: h };
  try {
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, w, h).data;
    let x0 = w,
      y0 = h,
      x1 = 0,
      y1 = 0;
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        if (d[(y * w + x) * 4 + 3] > 12) {
          if (x < x0) x0 = x;
          if (y < y0) y0 = y;
          if (x > x1) x1 = x;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 <= x0 || y1 <= y0) return { x: 0, y: 0, w, h, foot: h };
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, foot: y1 };
  } catch {
    return { x: 0, y: 0, w, h, foot: h };
  }
}

export class KitchenKombat {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  onHud: (h: Hud) => void;
  images: ImgBag | null = null;
  boxes: Record<CharId, Partial<Record<Pose, Box>>> | null = null;
  stage: HTMLImageElement | null = null;
  menuBg: HTMLImageElement | null = null;
  koArt: HTMLImageElement | null = null;
  stageArts: Partial<Record<StageId, HTMLImageElement>> = {};
  brushImg: HTMLImageElement | null = null;
  tornadoImg: HTMLImageElement | null = null;
  noteImg: HTMLImageElement | null = null;
  noteImgs: HTMLImageElement[] = [];
  bulletImg: HTMLImageElement | null = null;
  rageBuf: HTMLCanvasElement | null = null;
  screen: Screen = "title";
  phase: "intro" | "fight" | "ko" | "replay" | "finish" | "fatality" | "end" = "intro";
  versusCpu = true;
  training = false;
  dummy: DummyMode = "idle";
  trainMeter = false;
  p1Bits = 0;
  p2Bits = 0;
  p1Hist: TrainPress[] = [];
  p2Hist: TrainPress[] = [];
  histSeq = 0;
  prevP1Bits = 0;
  prevP2Bits = 0;
  difficulty: Difficulty = "normal";
  cpuPlan: AtkId[] = [];
  cpuAirOffense = false;
  cpuGuard = false;
  cpuDashCd = 0;
  cpuJumpCd = 0;
  cpuAtkCd = 0;
  cpuEscapeCd = 0;
  cpuPressure = 0;
  cpuHpMark = MAX_HP;
  p1id: CharId = "renike";
  p2id: CharId = "ricsi";
  stageId: StageId = "sintertanya";
  f1!: Fighter;
  f2!: Fighter;
  timer = ROUND_TIME;
  round = 1;
  time = 0;
  introT = 0;
  finishT = 0;
  winAnnounceId: CharId | null = null;
  winAnnounceT = 0;
  callout: string | null = null;
  calloutT = 0;
  combo = 0;
  comboSide: 1 | 2 | 0 = 0;
  comboT = 0;
  comboName: string | null = null;
  trauma = 0;
  hitstop = 0;
  particles: Particle[] = [];
  replayBuf: ReplaySnap[] = [];
  replayAcc = 0;
  replaySkipLock = 0;
  replaySfx: ReplaySfx[] = [];
  replayCum: number[] = [];
  replaySfxAt = 0;
  replayPlayI = -1;
  replayTailT = 0;
  replayHold: [{ id: CharId; img: HTMLImageElement } | null, { id: CharId; img: HTMLImageElement } | null] = [null, null];
  replayCamX = W / 2;
  replayCamY = H / 2;
  winner: CharId | null = null;
  fatality: string | null = null;
  running = false;
  acc = 0;
  last = 0;
  raf = 0;
  reduced = false;
  paused = false;
  selectSlot: 1 | 2 = 1;
  hudKey = "";
  loadPct = 0;
  menuReady = false;
  fightReady = false;
  vsLoadPct = 0;
  loadedChars = new Set<CharId>();
  loadedStages = new Set<StageId>();
  fxLoaded = false;
  dummyKeys: string[] = [];
  zones: {
    owner: Fighter;
    kind: "cloud" | "beam" | "quake" | "spit" | "ki" | "pillar" | "brush" | "note" | "solo" | "shot";
    x: number;
    y: number;
    w: number;
    h: number;
    life: number;
    dmg: number;
    dir: 1 | -1;
    hit: boolean;
    arm: number;
    jumped: boolean;
    pulsesLeft?: number;
    pulseEvery?: number;
    pulseAcc?: number;
    y0?: number;
    phase?: number;
    amp?: number;
    noteI?: number;
    maxLife?: number;
  }[] = [];
  netRole: "host" | "guest" | null = null;
  netDelay = 8;
  netFrame = 0;
  netLocal = new Map<number, number>();
  netRemote = new Map<number, number>();
  netPrevHost = 0;
  netPrevGuest = 0;
  netSend: ((frame: number, bits: number) => void) | null = null;
  netSignalGo: (() => void) | null = null;
  netWaiting = false;
  netGo = false;
  netGoSent = false;
  netWaitAt = 0;
  netMiss = 0;
  netOk = 0;
  netGoPulse = 0;

  constructor(canvas: HTMLCanvasElement, onHud: (h: Hud) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.onHud = onHud;
    this.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    setSfxTap((k, id) => {
      if (this.training || (this.phase !== "fight" && this.phase !== "intro")) return;
      this.replaySfx.push({ i: this.replayBuf.length, k, id });
    });
    this.bootFighters();
    this.canvas.addEventListener("pointerdown", () => {
      if (this.phase === "replay" && this.replaySkipLock <= 0) this.endReplay();
    });
    window.__controlsTest = {
      getYaw: () => (this.f1.facing === 1 ? 0 : Math.PI),
      getSpeed: () => Math.abs(this.f1.vx),
      getState: () => this.f1.state,
      getX: () => this.f1.x,
      getY: () => this.f1.y,
      getFacing: () => this.f1.facing,
      getX2: () => this.f2.x,
      getPose: () => this.f1.pose,
      getScreen: () => this.screen,
      setKeys: (codes: string[]) => {
        this.dummyKeys = codes;
        injectKeys(codes);
      },
      skipToFight: () => {
        this.versusCpu = false;
        this.p1id = "renike";
        this.p2id = "ricsi";
        this.beginMatch();
        this.fightReady = true;
        this.beginRound();
        this.phase = "fight";
        this.introT = 0;
        this.callout = null;
        this.calloutT = 0;
        this.screen = "fight";
        this.paused = false;
        this.pushHud();
      },
      skipIntro: () => {
        this.phase = "fight";
        this.introT = 0;
        this.callout = null;
        this.calloutT = 0;
        this.paused = false;
        this.pushHud();
      },
      sprayBlood: () => {
        this.spawnBlood(this.f1.x + this.f1.facing * 52, GROUND - 180, this.f1.facing, true);
      },
      fillMeter: () => {
        this.f1.meter = 100;
      },
      getLastRoundSfx: () => lastRoundSfx,
      getMeter: () => this.f1.meter,
      getMeter2: () => this.f2.meter,
      getHp2: () => this.f2.hp,
      getState2: () => this.f2.state,
      getY2: () => this.f2.y,
      place: (x1: number, x2: number) => {
        this.f1.x = x1;
        this.f2.x = x2;
      },
      getWins1: () => this.f1.wins,
      getWins2: () => this.f2.wins,
      koP2: () => this.onKo(this.f1, this.f2),
      getCallout: () => this.callout,
      getWinner: () => this.winner,
      getRageT: () => this.f1.rageT,
      getPullT: () => this.f2.pullT,
      playAs: (id: string) => {
        const who = (CHAR_IDS as string[]).includes(id) ? (id as CharId) : "renike";
        this.versusCpu = false;
        this.p1id = who;
        this.p2id = CHAR_IDS.find((c) => c !== who) ?? "ricsi";
        this.beginMatch();
        this.fightReady = true;
        this.beginRound();
        this.phase = "fight";
        this.introT = 0;
        this.callout = null;
        this.calloutT = 0;
        this.screen = "fight";
        this.paused = false;
        this.f1.meter = 100;
        this.pushHud();
      },
    };
  }

  bootFighters() {
    this.f1 = this.makeFighter("renike", 340, 1);
    this.f2 = this.makeFighter("ricsi", 940, -1);
  }

  makeFighter(id: CharId, x: number, facing: 1 | -1): Fighter {
    return {
      id,
      x,
      y: 0,
      vx: 0,
      vy: 0,
      facing,
      hp: MAX_HP,
      meter: 0,
      wins: 0,
      state: "idle",
      pose: "idle",
      atk: null,
      atkT: 0,
      hasHit: false,
      stun: 0,
      invuln: 0,
      flash: 0,
      squash: 1,
      bleed: 0,
      combo: 0,
      chain: [],
      comboTag: "",
      bufPunchL: 0,
      bufPunchR: 0,
      bufKickL: 0,
      bufKickR: 0,
      bufSpecial: 0,
      bufSpecial2: 0,
      spec2Spawned: false,
      dashT: 0,
      dashDir: 1,
      superDash: false,
      tapL: 0,
      tapR: 0,
      walkT: 0,
      airAtk: false,
      crouchGuard: false,
      shieldT: 0,
      spinAcc: 0,
      rageT: 0,
      rageAcc: 0,
      pullT: 0,
      lastHurtT: 9,
      sameAtkId: "",
      sameAtkN: 0,
    };
  }

  async load() {
    const emptyImg = () => {
      const im = new Image();
      im.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
      return im;
    };
    const bags = {
      renike: {} as Record<Pose, HTMLImageElement>,
      ricsi: {} as Record<Pose, HTMLImageElement>,
      cica: {} as Record<Pose, HTMLImageElement>,
      agi: {} as Record<Pose, HTMLImageElement>,
      cricsi: {} as Record<Pose, HTMLImageElement>,
      jezus: {} as Record<Pose, HTMLImageElement>,
      hoffer: {} as Record<Pose, HTMLImageElement>,
      farajo: {} as Record<Pose, HTMLImageElement>,
      gabi: {} as Record<Pose, HTMLImageElement>,
      isti: {} as Record<Pose, HTMLImageElement>,
    };
    const anims: ImgBag["anims"] = { renike: {}, ricsi: {}, cica: {}, agi: {}, cricsi: {}, jezus: {}, hoffer: {}, farajo: {}, gabi: {}, isti: {} };
    for (const id of CHAR_IDS) bags[id].idle = emptyImg();
    this.images = { ...bags, anims, stage: emptyImg() };
    this.boxes = { renike: {}, ricsi: {}, cica: {}, agi: {}, cricsi: {}, jezus: {}, hoffer: {}, farajo: {}, gabi: {}, isti: {} };
    this.menuReady = true;
    this.loadPct = 1;
    this.hudKey = "";
    this.pushHud();
    const eat = (src: string, im: HTMLImageElement) => {
      if ((im.naturalWidth || 0) < 8) return;
      if (src.includes("mainmenu")) this.menuBg = im;
      if (src.includes("/ui/ko.png")) this.koArt = im;
    };
    const fire = (src: string) => {
      try {
        const im = new Image();
        im.decoding = "async";
        im.onload = () => eat(src, im);
        im.onerror = () => undefined;
        im.src = asset(src);
      } catch {
        /* ignore */
      }
    };
    const later = [
      "/ui/mainmenu-v35.jpg",
      "/ui/ko.png?v=1",
      "/ui/selection.jpg",
      ...CHAR_IDS.map((id) => `/portraits/${id}-icon.png?v=10`),
      ...STAGE_IDS.map((id) => STAGES[id]?.blur).filter((u): u is string => !!u),
      ...CHAR_IDS.map((id) => vsJpgUrl(id)),
      ...CHAR_IDS.map((id) => vsPngUrl(id)),
    ];
    window.setTimeout(() => {
      later.forEach(fire);
      void preloadSfx(() => undefined, sfxMenuList(), musicMenuList()).catch(() => undefined);
    }, 40);
  }

  async ensureFight(p1: CharId = this.p1id, p2: CharId = this.p2id, stageId: StageId = this.stageId) {
    const emptyImg = () => {
      const im = new Image();
      im.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
      return im;
    };
    const stageOk = (this.stageArts[stageId]?.naturalWidth || 0) > 32;
    const already =
      this.images &&
      this.loadedChars.has(p1) &&
      this.loadedChars.has(p2) &&
      stageOk &&
      this.fxLoaded;
    if (already) {
      this.stage = this.stageArts[stageId] ?? this.stage;
      if (this.images && this.stage) this.images.stage = this.stage;
      this.fightReady = true;
      this.vsLoadPct = 1;
      this.hudKey = "";
      this.pushHud();
      return;
    }
    this.fightReady = false;
    this.vsLoadPct = 0.02;
    this.hudKey = "";
    this.pushHud();
    if (!this.images || !this.boxes) {
      this.fightReady = true;
      this.vsLoadPct = 1;
      this.pushHud();
      return;
    }
    const load = (src: string) =>
      new Promise<HTMLImageElement>((res) => {
        const im = new Image();
        let settled = false;
        const done = (el: HTMLImageElement) => {
          if (settled) return;
          settled = true;
          res(el);
        };
        im.onload = () => done(im);
        im.onerror = () => done(emptyImg());
        window.setTimeout(() => done(im.naturalWidth > 8 ? im : emptyImg()), 3500);
        im.src = asset(src);
      });
    const poses: Pose[] = [
      "idle","punch","kick","hurt","special","jump","walk0","walk1","walk2","walk3",
      "punchL","punchR","kickL","kickR","block","dash","jumpPunchL","jumpPunchR",
      "jumpKickL","jumpKickR","lowPunchL","lowPunchR","lowKickL","lowKickR","special2","crouch",
    ];
    const bust = "?v=86";
    const poseFile = (p: Pose) => (p === "special2" ? "spec2" : p);
    const ids: CharId[] = p1 === p2 ? [p1] : [p1, p2];
    const jobs: Array<() => Promise<void>> = [];
    for (const id of ids) {
      if (this.loadedChars.has(id)) continue;
      for (const p of poses) {
        if (p === "idle" && this.images[id].idle && (this.images[id].idle.naturalWidth || 0) > 32) continue;
        jobs.push(async () => {
          const im = await loadTick(`/sprites/${id}/${poseFile(p)}.png${bust}`);
          if ((im.naturalWidth || im.width) > 8) {
            this.images![id][p] = im;
            this.boxes![id][p] = measureBox(im);
          }
        });
      }
      for (const atk of ANIM_ATKS) {
        jobs.push(async () => {
          this.images!.anims[id][atk] = await Promise.all([0, 1, 2, 3].map((i) => loadTick(`/sprites/${id}/${atk}${i}.png${bust}`)));
        });
      }
      jobs.push(async () => {
        this.images!.anims[id].special2 = await Promise.all([0, 1, 2, 3, 4, 5].map((i) => loadTick(`/sprites/${id}/special2${i}.png${bust}`)));
      });
      const vic = victoryUrl(id);
      if (vic) jobs.push(async () => { await loadTick(vic); });
    }
    if (!stageOk) {
      jobs.push(async () => {
        const im = await loadTick(STAGES[stageId].art);
        if ((im.naturalWidth || im.width) > 32) {
          this.stageArts[stageId] = im;
          this.loadedStages.add(stageId);
          this.stage = im;
          this.images!.stage = im;
        }
      });
    } else {
      this.stage = this.stageArts[stageId] ?? this.stage;
      if (this.images && this.stage) this.images.stage = this.stage;
    }
    if (!this.fxLoaded) {
      jobs.push(async () => { this.brushImg = await loadTick(`/fx/brush.png${bust}`); });
      jobs.push(async () => { this.tornadoImg = await loadTick(`/fx/tornado.png${bust}`); });
      jobs.push(async () => { this.noteImg = await loadTick(`/fx/note.png${bust}`); });
      for (const i of [0, 1, 2, 3]) {
        jobs.push(async () => { this.noteImgs[i] = await loadTick(`/fx/note${i}.png${bust}`); });
      }
    }
    const audioN = sfxFightList(ids).length + musicFightList(stageId).length;
    const total = Math.max(1, jobs.length + audioN);
    let doneN = 0;
    const tick = () => {
      doneN += 1;
      this.vsLoadPct = Math.min(0.99, doneN / total);
      this.hudKey = "";
      this.pushHud();
    };
    const loadTick = async (src: string) => {
      try {
        const im = await load(src);
        tick();
        return im;
      } catch {
        tick();
        return emptyImg();
      }
    };
    const runPool = async (list: Array<() => Promise<void>>, n = 10) => {
      let i = 0;
      const worker = async () => {
        while (i < list.length) {
          const job = list[i++];
          if (job) await job();
        }
      };
      await Promise.all(Array.from({ length: Math.min(n, Math.max(1, list.length)) }, () => worker()));
    };
    try {
      await runPool(jobs, 8);
      await Promise.race([
        preloadSfx(tick, sfxFightList(ids), musicFightList(stageId)).catch(() => undefined),
        new Promise<void>((r) => window.setTimeout(r, 4000)),
      ]);
    } catch (err) {
      console.error("fight load", err);
    }
    for (const id of ids) {
      this.loadedChars.add(id);
      const im = this.images?.[id]?.idle;
      if (im && (im.naturalWidth || 0) > 32 && this.boxes) this.boxes[id].idle = measureBox(im);
    }
    this.loadedStages.add(stageId);
    this.fxLoaded = true;
    this.fightReady = true;
    this.vsLoadPct = 1;
    this.hudKey = "";
    this.pushHud();
  }

  start() {
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.acc += dt;
      if (this.acc > 0.12) this.acc = 0.12;
      while (this.acc >= STEP) {
        try {
          this.step(STEP);
        } catch (err) {
          console.error("step", err);
        }
        if (this.netRole && this.netWaiting) break;
        this.acc -= STEP;
      }
      try {
        this.draw();
      } catch (err) {
        console.error("draw", err);
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  resize() {
    const wrap = this.canvas.parentElement;
    void wrap;
    this.canvas.width = W;
    this.canvas.height = H;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
  }

  pauseToggle() {
    if (this.screen === "fight") {
      this.paused = !this.paused;
      this.screen = this.paused ? "pause" : "fight";
      this.pushHud();
    } else if (this.screen === "pause") {
      this.paused = false;
      this.screen = "fight";
      this.pushHud();
    }
  }

  chooseMode(cpu: boolean, diff: Difficulty, training = false) {
    this.versusCpu = training ? true : cpu;
    this.difficulty = diff;
    this.training = training;
    this.dummy = training ? "idle" : "cpu";
    this.trainMeter = training ? this.trainMeter : false;
    this.screen = "select";
    this.selectSlot = 1;
    this.pushHud();
  }

  goStage(p1: CharId, p2: CharId) {
    this.p1id = p1;
    this.p2id = p2;
    this.screen = "stage";
    this.pushHud();
  }

  pick(id: CharId) {
    if (this.selectSlot === 1) {
      this.p1id = id;
      this.selectSlot = 2;
      this.pushHud();
      return;
    }
    this.p2id = id;
    this.screen = "stage";
    this.pushHud();
  }

  confirmStage(id: StageId = this.stageId) {
    this.stageId = id;
    this.stage = this.stageArts[id] ?? this.stage;
    this.beginMatch();
  }

  openOnline() {
    this.screen = "online";
    this.pushHud();
  }

  openLobby() {
    this.screen = "lobby";
    this.pushHud();
  }

  beginOnline(
    p1: CharId,
    p2: CharId,
    role: "host" | "guest",
    send: (frame: number, bits: number) => void,
    signalGo?: () => void,
  ) {
    this.netRole = role;
    this.versusCpu = false;
    this.p1id = p1;
    this.p2id = p2;
    this.netDelay = 8;
    this.netFrame = 0;
    this.netLocal.clear();
    this.netRemote.clear();
    this.netPrevHost = 0;
    this.netPrevGuest = 0;
    this.netSend = send;
    this.netSignalGo = signalGo ?? null;
    this.netWaiting = false;
    this.netGo = false;
    this.netGoSent = false;
    this.netWaitAt = 0;
    this.netMiss = 0;
    this.netOk = 0;
    this.netGoPulse = 0;
    for (let i = 0; i < this.netDelay; i++) {
      this.netLocal.set(i, 0);
      this.netRemote.set(i, 0);
    }
    this.round = 1;
    this.winner = null;
    this.fatality = null;
    this.f1 = this.makeFighter(this.p1id, 340, 1);
    this.f2 = this.makeFighter(this.p2id, 940, -1);
    startStageMusic(this.stageId);
    this.screen = "vs";
    this.introT = 1.6;
    this.fightReady = false;
    this.vsLoadPct = 0.02;
    this.pushHud();
    void this.ensureFight(this.p1id, this.p2id, this.stageId).then(() => {
      if (this.netGo) this.beginRound();
    });
  }

  pushRemoteInput(frame: number, bits: number) {
    this.netRemote.set(frame, bits);
  }

  onlineGo() {
    this.netGo = true;
    if (this.screen === "vs") this.beginRound();
  }

  endOnline(back: "title" | "online" = "title") {
    this.netRole = null;
    this.netSend = null;
    this.netLocal.clear();
    this.netRemote.clear();
    this.netWaiting = false;
    this.paused = false;
    this.training = false;
    this.trainMeter = false;
    this.screen = back;
    stopStageMusic();
    startMenuMusic();
    this.pushHud();
  }

  specialCallout(text: string, t: number) {
    if (!SHOW_SPECIAL_CALLOUTS) return;
    this.callout = text;
    this.calloutT = t;
  }

  beginMatch(keepMusic = false) {
    this.round = 1;
    this.winner = null;
    this.fatality = null;
    this.paused = false;
    this.cpuPlan = [];
    this.cpuAirOffense = false;
    this.cpuGuard = false;
    this.f1 = this.makeFighter(this.p1id, 340, 1);
    this.f2 = this.makeFighter(this.p2id, 940, -1);
    this.replayBuf = [];
    this.replayAcc = 0;
    this.replaySfx = [];
    this.replayTailT = 0;
    this.screen = "vs";
    this.introT = 1.6;
    this.fightReady = false;
    this.vsLoadPct = 0.02;
    startStageMusic(this.stageId, !keepMusic);
    this.pushHud();
    void this.ensureFight(this.p1id, this.p2id, this.stageId);
  }

  beginRound() {
    const w1 = this.f1.wins;
    const w2 = this.f2.wins;
    const m1 = this.f1.meter;
    const m2 = this.f2.meter;
    this.f1 = this.makeFighter(this.p1id, 340, 1);
    this.f2 = this.makeFighter(this.p2id, 940, -1);
    this.f1.wins = w1;
    this.f2.wins = w2;
    this.f1.meter = m1;
    this.f2.meter = m2;
    this.timer = ROUND_TIME;
    this.phase = "intro";
    this.introT = this.training ? 1.2 : 2.8;
    this.callout = this.training ? "GYAKORLÁS" : (ROUND_CALL[this.round] ?? ROUND_CALL[3]);
    this.calloutT = this.training ? 1.2 : 2.8;
    this.particles = [];
    this.zones = [];
    this.replayBuf = [];
    this.replayAcc = 0;
    this.replaySfx = [];
    this.replayTailT = 0;
    this.combo = 0;
    this.comboName = null;
    this.winAnnounceId = null;
    this.winAnnounceT = 0;
    this.cpuPlan = [];
    this.cpuAirOffense = false;
    sfxPlay.farajoReset();
    this.cpuGuard = false;
    this.cpuDashCd = 0;
    this.cpuJumpCd = 0;
    this.cpuAtkCd = 0;
    this.cpuEscapeCd = 0;
    this.cpuPressure = 0;
    this.cpuHpMark = MAX_HP;
    this.p1Hist = [];
    this.p2Hist = [];
    this.p1Bits = 0;
    this.p2Bits = 0;
    this.prevP1Bits = 0;
    this.prevP2Bits = 0;
    this.screen = "fight";
    this.paused = false;
    if (!this.training) sfxPlay.round(this.round);
    this.pushHud();
  }

  step(dt: number) {
    if (this.screen === "title" || this.screen === "select" || this.screen === "stage" || this.screen === "result" || this.screen === "online" || this.screen === "lobby") {
      sfxPlay.farajoBed("p1", null);
      sfxPlay.farajoBed("p2", null);
      return;
    }
    if (this.screen === "pause") {
      sfxPlay.farajoBed("p1", null);
      sfxPlay.farajoBed("p2", null);
      return;
    }
    if (this.screen === "vs") {
      if (this.fightReady) this.introT -= dt;
      if (this.netRole) {
        this.netGoPulse += dt;
        if (this.netRole === "host" && this.fightReady && this.introT <= 0 && this.netGoPulse >= 0.25) {
          this.netGoPulse = 0;
          this.netGoSent = true;
          this.netGo = true;
          this.netSignalGo?.();
        }
        if (this.netGo && this.fightReady) this.beginRound();
      } else if (this.fightReady && this.introT <= 0) this.beginRound();
      this.pushHud();
      return;
    }
    if (this.paused) return;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this.maybeRecordReplay();
      this.draw();
      return;
    }
    if (this.netRole && (this.phase === "fight" || this.phase === "intro")) {
      const bits = packBits(sampleP1());
      const sendAt = this.netFrame + this.netDelay;
      if (!this.netLocal.has(sendAt)) {
        this.netLocal.set(sendAt, bits);
        this.netSend?.(sendAt, bits);
      }
      if (this.netLocal.get(this.netFrame) === undefined || this.netRemote.get(this.netFrame) === undefined) {
        if (!this.netWaiting) this.netWaitAt = performance.now();
        this.netWaiting = true;
        this.netMiss += 1;
        if (this.netMiss > 10 && this.netDelay < 12) {
          this.netDelay += 1;
          this.netMiss = 0;
        }
        if (performance.now() - this.netWaitAt > 200) this.pushHud();
        return;
      }
    }
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - dt * 2.4);
    if (this.calloutT > 0) {
      this.calloutT -= dt;
      if (this.calloutT <= 0) this.callout = null;
    }
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) {
        this.combo = 0;
        this.comboSide = 0;
        this.comboName = null;
        this.f1.comboTag = "";
        this.f2.comboTag = "";
      }
    }
    if (this.phase === "intro") {
      this.introT -= dt;
      if (this.introT <= 0 && this.calloutT <= 0) this.phase = "fight";
    }
    if (this.phase === "replay") {
      this.finishT -= dt;
      this.replaySkipLock = Math.max(0, this.replaySkipLock - dt);
      const n = this.replayBuf.length;
      const cum = this.replayCum;
      const total = cum.length ? cum[cum.length - 1]! + 0.0001 : REPLAY_PLAY;
      const elapsed = Math.max(0, total - this.finishT);
      let i = 0;
      if (n > 0 && cum.length) {
        while (i + 1 < cum.length && cum[i + 1]! <= elapsed) i++;
        i = Math.min(n - 1, i);
        this.applyReplay(this.replayBuf[i]!);
        const from = this.replayPlayI + 1;
        this.replayPlayI = i;
        for (let f = from; f <= i; f++) this.pumpReplaySfx(f);
      }
      const a = sampleP1();
      const b = sampleP2();
      const m = sampleMenu();
      const skip =
        this.replaySkipLock <= 0 &&
        (a.punchLP || a.punchRP || a.kickLP || a.kickRP || a.specialP || a.special2P || a.startP || a.superDashP ||
          b.punchLP || b.punchRP || b.kickLP || b.kickRP || b.specialP || b.startP ||
          m.punchLP || m.kickLP || m.startP);
      if (skip || this.finishT <= 0) this.endReplay();
      else this.pushHud();
      return;
    }
    if (this.phase === "ko" || this.phase === "finish" || this.phase === "fatality") {
      this.finishT -= dt;
      this.tickBody(this.f1, dt);
      this.tickBody(this.f2, dt);
      this.tickParticles(dt);
      if (this.phase === "ko" && this.replayTailT > 0 && !this.training) {
        this.replayTailT -= dt;
        this.maybeRecordReplay();
      }
      if (this.phase === "finish") {
        const wa = sampleP1();
        if (wa.specialP || wa.punchLP || wa.punchRP || wa.kickLP || wa.kickRP) this.doFatality(this.f1.hp > 0 ? this.f1 : this.f2);
      }
      if (this.winAnnounceT > 0) {
        this.winAnnounceT -= dt;
        if (this.winAnnounceT <= 0 && this.winAnnounceId) {
          sfxPlay.charWin(this.winAnnounceId);
          this.callout = winLine(this.winAnnounceId);
          this.calloutT = 5.2;
          this.winAnnounceId = null;
        }
      }
      if (this.finishT <= 0) {
        if (this.phase === "ko" && this.replayBuf.length > 12) {
          this.startReplay();
          this.pushHud();
          return;
        }
        if (this.phase === "fatality" || this.f1.wins >= 2 || this.f2.wins >= 2) this.goResult();
        else {
          this.round += 1;
          this.beginRound();
        }
      }
      this.pushHud();
      return;
    }
    const p1 = sampleP1();
    if (p1.startP && !this.netRole) {
      this.pauseToggle();
      return;
    }
    let a1 = p1;
    let a2: Actions;
    if (this.training) {
      if (this.dummy === "p2") a2 = sampleP2();
      else if (this.dummy === "cpu") a2 = this.cpu(dt);
      else a2 = this.idleActions();
    } else {
      a2 = this.versusCpu ? this.cpu(dt) : sampleP2();
    }
    this.p1Bits = this.bitsOf(a1);
    this.p2Bits = this.bitsOf(a2);
    if (this.training) {
      this.pushTrainHist(this.p1Hist, this.p1Bits, this.prevP1Bits);
      this.prevP1Bits = this.p1Bits;
      if (this.dummy === "p2") {
        this.pushTrainHist(this.p2Hist, this.p2Bits, this.prevP2Bits);
        this.prevP2Bits = this.p2Bits;
      }
    }
    if (this.netRole) {
      const bits = packBits(p1);
      const sendAt = this.netFrame + this.netDelay;
      if (!this.netLocal.has(sendAt)) {
        this.netLocal.set(sendAt, bits);
        this.netSend?.(sendAt, bits);
      }
      const L = this.netLocal.get(this.netFrame);
      const R = this.netRemote.get(this.netFrame);
      if (L === undefined || R === undefined) {
        if (!this.netWaiting) this.netWaitAt = performance.now();
        this.netWaiting = true;
        this.netMiss += 1;
        if (this.netMiss > 10 && this.netDelay < 12) {
          this.netDelay += 1;
          this.netMiss = 0;
        }
        if (performance.now() - this.netWaitAt > 200) this.pushHud();
        return;
      }
      const wasWait = this.netWaiting;
      this.netWaiting = false;
      this.netMiss = 0;
      this.netOk += 1;
      if (this.netOk > 240 && this.netDelay > 5) {
        this.netDelay -= 1;
        this.netOk = 0;
      }
      const hostBits = this.netRole === "host" ? L : R;
      const guestBits = this.netRole === "host" ? R : L;
      a1 = unpackBits(hostBits, this.netPrevHost);
      a2 = unpackBits(guestBits, this.netPrevGuest);
      this.netPrevHost = hostBits;
      this.netPrevGuest = guestBits;
      this.netFrame += 1;
      if (this.netFrame % 90 === 0) {
        for (const m of [this.netLocal, this.netRemote]) {
          for (const k of m.keys()) if (k < this.netFrame - 16) m.delete(k);
        }
      }
      if (wasWait) this.pushHud();
    }
    if (this.phase === "fight" && !this.training) {
      this.timer = Math.max(0, this.timer - dt);
      if (this.timer <= 0) this.timeOver();
    }
    this.control(this.f1, a1, dt);
    this.control(this.f2, a2, dt);
    this.syncFarajoAudio();
    this.tickBody(this.f1, dt);
    this.tickBody(this.f2, dt);
    this.face();
    this.separate();
    this.maybeSpec2(this.f1);
    this.maybeSpec2(this.f2);
    this.tickBeamDrip(this.f1);
    this.tickBeamDrip(this.f2);
    this.combat(this.f1, this.f2);
    this.combat(this.f2, this.f1);
    this.tickZones(dt);
    this.tickParticles(dt);
    this.maybeRecordReplay();
    if (this.training && this.comboT <= 0) {
      this.f1.hp = MAX_HP;
      this.f2.hp = MAX_HP;
    }
    if (this.training && this.trainMeter) {
      this.f1.meter = 100;
      this.f2.meter = 100;
    }
    this.pushHud();
  }

  idleActions(): Actions {
    return {
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
    };
  }

  bitsOf(a: Actions) {
    let b = 0;
    if (a.left) b |= 1;
    if (a.right) b |= 2;
    if (a.up) b |= 4;
    if (a.down) b |= 8;
    if (a.punchL) b |= 16;
    if (a.punchR) b |= 32;
    if (a.kickL) b |= 64;
    if (a.kickR) b |= 128;
    if (a.special) b |= 256;
    if (a.block) b |= 512;
    if (a.special2) b |= 1024;
    if (a.superDash) b |= 2048;
    return b;
  }

  pushTrainHist(hist: TrainPress[], bits: number, prev: number) {
    const rose = bits & ~prev;
    if (!rose) return;
    const labels: [number, string][] = [
      [4, "↑"],
      [8, "↓"],
      [1, "←"],
      [2, "→"],
      [16, "△"],
      [32, "□"],
      [64, "✕"],
      [128, "○"],
      [256, "L1"],
      [1024, "R1"],
      [512, "R2"],
      [2048, "L2"],
    ];
    for (const [bit, k] of labels) {
      if (rose & bit) {
        this.histSeq += 1;
        hist.push({ id: this.histSeq, k });
      }
    }
    while (hist.length > 10) hist.shift();
  }

  cycleDummy(dir: 1 | -1) {
    const modes: DummyMode[] = ["idle", "cpu", "p2"];
    const i = (modes.indexOf(this.dummy) + dir + modes.length) % modes.length;
    this.dummy = modes[i]!;
    this.versusCpu = this.dummy !== "p2";
    this.pushHud();
  }

  cycleTrainDiff(dir: 1 | -1) {
    const i = (DIFFICULTIES.indexOf(this.difficulty) + dir + DIFFICULTIES.length) % DIFFICULTIES.length;
    this.difficulty = DIFFICULTIES[i]!;
    this.pushHud();
  }

  toggleTrainMeter() {
    this.trainMeter = !this.trainMeter;
    if (this.trainMeter) {
      this.f1.meter = 100;
      this.f2.meter = 100;
    }
    this.pushHud();
  }

  cpuPress(a: Actions, id: AtkId, low = false) {
    if (low) a.down = true;
    if (id === "punchL") {
      a.punchL = true;
      a.punchLP = true;
    } else if (id === "punchR") {
      a.punchR = true;
      a.punchRP = true;
    } else if (id === "kickL") {
      a.kickL = true;
      a.kickLP = true;
    } else if (id === "kickR") {
      a.kickR = true;
      a.kickRP = true;
    } else if (id === "special") {
      a.special = true;
      a.specialP = true;
    } else if (id === "special2") {
      a.special2 = true;
      a.special2P = true;
    }
  }

  cpuStartString(a: Actions, combo: number, spec: number, dist: number, meter: number, id?: CharId) {
    const jesus = id === "jezus";
    const farajo = id === "farajo";
    if (farajo && meter >= 50 && dist > 100 && Math.random() < Math.max(0.28, spec * 2.4)) {
      this.cpuPlan = [];
      this.cpuPress(a, "special");
      return;
    }
    if (farajo && meter >= 10 && Math.random() < Math.max(0.18, spec * 1.6)) {
      this.cpuPlan = [];
      this.cpuPress(a, "special2");
      return;
    }
    if (id === "isti" && meter >= 50 && Math.random() < Math.max(0.28, spec * 2.2)) {
      this.cpuPlan = [];
      const stomp = dist < 150 && Math.random() < 0.42;
      this.cpuPress(a, stomp ? "special2" : "special");
      return;
    }
    if (meter >= 50 && Math.random() < (jesus ? Math.max(0.42, spec * 3.2) : spec)) {
      this.cpuPlan = [];
      if (jesus) this.cpuPress(a, dist > 140 || Math.random() < 0.62 ? "special" : "special2");
      else this.cpuPress(a, Math.random() < 0.55 ? "special2" : "special");
      return;
    }
    if (dist < 105 && Math.random() < 0.18) {
      this.cpuPress(a, "kickL", true);
      this.cpuPlan = combo >= 0.75 ? ["kickR"] : [];
      return;
    }
    const strings: AtkId[][] = [
      ["punchL", "punchR", "kickL", "kickR"],
      ["punchL", "punchR", "kickR"],
      ["punchL", "kickL", "kickR"],
      ["punchR", "kickL", "kickR"],
      ["kickL", "kickR"],
    ];
    const seq = strings[(Math.random() * strings.length) | 0]!;
    this.cpuPress(a, seq[0]!);
    this.cpuPlan = combo >= 0.99 || Math.random() < combo ? seq.slice(1) : [];
  }

  cpu(dt: number): Actions {
    const me = this.f2;
    const you = this.f1;
    const a: Actions = {
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
    };
    this.cpuDashCd = Math.max(0, this.cpuDashCd - dt);
    this.cpuJumpCd = Math.max(0, this.cpuJumpCd - dt);
    this.cpuAtkCd = Math.max(0, this.cpuAtkCd - dt);
    this.cpuEscapeCd = Math.max(0, this.cpuEscapeCd - dt);
    const dmg = this.cpuHpMark - me.hp;
    this.cpuHpMark = me.hp;
    if (dmg > 0) this.cpuPressure = Math.min(1.25, this.cpuPressure + dmg / (MAX_HP * 0.1));
    else this.cpuPressure = Math.max(0, this.cpuPressure - dt * 0.3);
    if (this.phase !== "fight" || me.state === "hurt" || me.state === "ko") {
      this.cpuGuard = false;
      return a;
    }

    const easy = this.difficulty === "easy";
    const hell = this.difficulty === "szopni";
    const hard = this.difficulty === "hard";
    const spec = easy
      ? { block: 0.077, atk: 0.136, dash: 0.11, jumpIn: 0.051, combo: 0.034, special: 0.051, antiAir: 0.025, jumpDef: 0.017, punish: 0.051 }
      : hell
        ? { block: 1, atk: 1, dash: 0.85, jumpIn: 0.42, combo: 1, special: 0.38, antiAir: 1, jumpDef: 0.22, punish: 1 }
        : hard
          ? { block: 0.36, atk: 0.42, dash: 0.31, jumpIn: 0.136, combo: 0.34, special: 0.15, antiAir: 0.24, jumpDef: 0.068, punish: 0.3 }
          : { block: 0.17, atk: 0.22, dash: 0.15, jumpIn: 0.068, combo: 0.11, special: 0.077, antiAir: 0.085, jumpDef: 0.034, punish: 0.11 };

    const dx = you.x - me.x;
    const dist = Math.abs(dx);
    const faceIn = dx > 0;

    if (me.state === "attack") {
      if (me.id === "farajo" && me.atk?.zone === "solo" && me.meter > 0.4) {
        a.special2 = true;
      }
      if (me.atk && me.hasHit && this.cpuPlan.length) {
        const nxt = this.cpuPlan[0]!;
        if (me.atk.cancel.includes(nxt) && me.atkT >= me.atk.startup) {
          this.cpuPress(a, nxt);
          this.cpuPlan.shift();
        }
      }
      return a;
    }

    if (me.y > 18) {
      if (faceIn) a.right = true;
      else a.left = true;
      if ((this.cpuAirOffense || hell || (hard && Math.random() < 0.34)) && dist < 240 && !me.airAtk) {
        if (me.vy < 80 || this.cpuAirOffense) {
          this.cpuPress(a, Math.random() < 0.7 ? "kickR" : "punchR");
          this.cpuAirOffense = false;
        }
      }
      return a;
    }
    this.cpuAirOffense = false;

    const cornered = me.x <= 140 || me.x >= W - 140;
    const escapeDir: 1 | -1 = me.x <= W * 0.5 ? 1 : -1;
    const escapeP = easy ? 0.015 : hell ? 0.52 : hard ? 0.26 : 0.07;
    if (
      cornered &&
      me.meter >= SUPER_DASH_COST &&
      me.y <= 0 &&
      this.cpuEscapeCd <= 0 &&
      me.state !== "dash" &&
      me.state !== "attack"
    ) {
      const pressured = this.cpuPressure > 0.4 || me.hp < MAX_HP * 0.42;
      if (pressured && Math.random() < escapeP) {
        a.superDash = true;
        a.superDashP = true;
        if (escapeDir > 0) a.right = true;
        else a.left = true;
        this.cpuGuard = false;
        this.cpuEscapeCd = hell ? 1.5 : hard ? 2.3 : 3.4;
        this.cpuPressure *= 0.25;
        return a;
      }
    }

    const yat = you.atk;
    const youAtk = you.state === "attack" && !!yat;
    const youRecover = !!(yat && youAtk && you.atkT > yat.startup + yat.active);

    if (this.cpuGuard) {
      if (!hell || !youAtk || dist > 240) this.cpuGuard = false;
      else if (youRecover && Math.random() < spec.punish) {
        this.cpuGuard = false;
        this.cpuStartString(a, spec.combo, spec.special, dist, me.meter, me.id);
        this.cpuAtkCd = 0.08;
        return a;
      } else {
        a.block = true;
        if (yat?.low) a.down = true;
        return a;
      }
    }

    if (youAtk && yat && dist < 220) {
      if (youRecover && Math.random() < spec.punish) {
        this.cpuStartString(a, spec.combo, spec.special, dist, me.meter, me.id);
        this.cpuAtkCd = hell ? 0.08 : hard ? 0.32 : easy ? 0.8 : 0.63;
        return a;
      }
      if (Math.random() < spec.block) {
        if (hell) this.cpuGuard = true;
        a.block = true;
        if (yat.low) a.down = true;
        return a;
      }
      if (Math.random() < spec.jumpDef) {
        a.up = true;
        a.upP = true;
        this.cpuAirOffense = true;
        this.cpuJumpCd = 1.4;
        return a;
      }
    }

    if (you.y > 40 && dist < 210 && Math.random() < spec.antiAir) {
      this.cpuPress(a, dist < 130 ? "punchR" : "kickR");
      return a;
    }

    if (me.id === "jezus" && me.meter >= 50 && me.y <= 0) {
      if (youAtk && dist < 260 && Math.random() < 0.38) {
        this.cpuPress(a, "special2");
        this.cpuAtkCd = 0.4;
        return a;
      }
      if (dist > 90 && Math.random() < 0.2) {
        this.cpuPress(a, "special");
        this.cpuAtkCd = hell ? 0.35 : 0.7;
        return a;
      }
    }

    if (me.id === "farajo" && me.y <= 0) {
      if (me.meter >= 10 && me.hp < MAX_HP * 0.7 && Math.random() < (hell ? 0.22 : hard ? 0.12 : 0.08)) {
        this.cpuPress(a, "special2");
        this.cpuAtkCd = 0.35;
        return a;
      }
      if (me.meter >= 50 && dist > 110 && Math.random() < (hell ? 0.26 : hard ? 0.14 : easy ? 0.06 : 0.1)) {
        this.cpuPress(a, "special");
        this.cpuAtkCd = hell ? 0.4 : hard ? 0.7 : 1.0;
        return a;
      }
    }

    if (me.id === "isti" && me.y <= 0 && me.meter >= 50) {
      const pMeteor = hell ? 0.24 : hard ? 0.13 : easy ? 0.05 : 0.085;
      const pStomp = hell ? 0.2 : hard ? 0.11 : easy ? 0.05 : 0.075;
      if (you.y <= 8 && dist < 230 && Math.random() < pStomp) {
        this.cpuPress(a, "special2");
        this.cpuAtkCd = hell ? 0.35 : hard ? 0.65 : 1.0;
        return a;
      }
      if (Math.random() < pMeteor) {
        this.cpuPress(a, "special");
        this.cpuAtkCd = hell ? 0.4 : hard ? 0.7 : 1.05;
        return a;
      }
    }

    if (dist > 185) {
      if (faceIn) a.right = true;
      else a.left = true;
      if (dist > 240 && dist < 500 && me.y <= 0 && this.cpuJumpCd <= 0 && Math.random() < spec.jumpIn * dt * 2.2) {
        a.up = true;
        a.upP = true;
        this.cpuAirOffense = true;
        this.cpuJumpCd = hell ? 1.1 : hard ? 1.55 : easy ? 2.4 : 2.13;
      } else if (dist > 260 && me.state !== "dash" && me.y <= 0 && this.cpuDashCd <= 0 && Math.random() < spec.dash) {
        this.startDash(me, faceIn ? 1 : -1);
        this.cpuDashCd = hell ? 0.7 : hard ? 1.09 : easy ? 1.84 : 1.55;
      }
      if (dist > 200 && me.meter >= special1For(me.id).cost && Math.random() < (me.id === "jezus" ? 0.28 : me.id === "farajo" || me.id === "isti" ? spec.special * dt * 4.4 : spec.special * dt * 1.8)) {
        this.cpuPress(a, me.id === "jezus" || me.id === "farajo" || me.id === "isti" || Math.random() < 0.45 ? "special" : "special2");
      }
      return a;
    }

    if (dist < 70 && easy && Math.random() < 0.6) {
      if (faceIn) a.left = true;
      else a.right = true;
    } else if (dist > 108) {
      if (faceIn) a.right = true;
      else a.left = true;
    }

    const youBlock = you.state === "block";
    const youOpen =
      you.state === "idle" ||
      you.state === "walk" ||
      you.state === "crouch" ||
      you.state === "hurt" ||
      youBlock;
    if (dist < 195 && youOpen && this.cpuAtkCd <= 0 && Math.random() < (youBlock ? Math.max(spec.atk, 0.48) : spec.atk)) {
      if (youBlock && !you.crouchGuard && Math.random() < 0.55) {
        this.cpuPress(a, Math.random() < 0.55 ? "kickL" : "punchL", true);
        this.cpuPlan = Math.random() < spec.combo ? ["kickR"] : [];
      } else {
        this.cpuStartString(a, spec.combo, spec.special, dist, me.meter, me.id);
      }
      this.cpuAtkCd = hell ? 0.06 : hard ? 0.28 : easy ? 0.72 : 0.48;
    }

    return a;
  }

  control(f: Fighter, a: Actions, dt: number) {
    f.tapL = Math.max(0, f.tapL - dt);
    f.tapR = Math.max(0, f.tapR - dt);
    f.bufPunchL = Math.max(0, f.bufPunchL - dt);
    f.bufPunchR = Math.max(0, f.bufPunchR - dt);
    f.bufKickL = Math.max(0, f.bufKickL - dt);
    f.bufKickR = Math.max(0, f.bufKickR - dt);
    f.bufSpecial = Math.max(0, f.bufSpecial - dt);
    f.bufSpecial2 = Math.max(0, f.bufSpecial2 - dt);
    if (a.punchLP) f.bufPunchL = BUFFER;
    if (a.punchRP) f.bufPunchR = BUFFER;
    if (a.kickLP) f.bufKickL = BUFFER;
    if (a.kickRP) f.bufKickR = BUFFER;
    if (a.specialP) f.bufSpecial = BUFFER;
    if (a.special2P) f.bufSpecial2 = BUFFER;
    if (f.flash > 0) f.flash -= dt;
    if (f.invuln > 0) f.invuln -= dt;
    f.squash += (1 - f.squash) * Math.min(1, dt * 10);
    f.bleed = Math.max(0, f.bleed - dt * 0.35);
    if (f.shieldT > 0) f.shieldT = Math.max(0, f.shieldT - dt);
    if (f.rageT > 0) {
      const before = f.rageT;
      f.rageT = Math.max(0, f.rageT - dt);
      f.rageAcc += MAX_HP * 0.13 * ((before - f.rageT) / 5);
      const take = Math.floor(f.rageAcc);
      if (take > 0 && f.state !== "ko" && f.hp > 0) {
        f.rageAcc -= take;
        f.hp = Math.max(0, f.hp - take);
        f.lastHurtT = 0;
        f.flash = Math.max(f.flash, 0.05);
        if (f.hp <= 0) {
          const other = f === this.f1 ? this.f2 : this.f1;
          this.onKo(other, f);
        }
      }
    } else {
      f.rageAcc = 0;
    }
    if (f.pullT > 0) f.pullT = Math.max(0, f.pullT - dt);
    f.lastHurtT += dt;
    if (
      this.phase === "fight" &&
      !this.training &&
      f.hp > 0 &&
      f.state !== "ko" &&
      f.lastHurtT >= 3 &&
      f.hp < MAX_HP * 0.15
    ) {
      f.hp = Math.min(MAX_HP * 0.15, f.hp + MAX_HP * 0.03 * dt);
    }

    if (f.state === "hurt") {
      if (
        f.id === "agi" &&
        f.hp > 0 &&
        f.y <= 4 &&
        f.bufSpecial2 > 0 &&
        f.meter >= SPECIAL2_VAMP.cost &&
        this.phase === "fight"
      ) {
        f.stun = 0;
        this.startAttack(f, SPECIAL2_VAMP, false, false, false);
        return;
      }
      f.atk = null;
      f.spec2Spawned = false;
      f.stun -= dt;
      f.pose = "hurt";
      if (f.stun <= 0 && f.hp > 0) {
        if (f.pullT > 0) {
          f.state = f.y > 4 ? "jump" : "walk";
          f.pose = f.y > 4 ? "jump" : "walk0";
        } else {
          f.state = f.y > 4 ? "jump" : "idle";
          f.pose = f.y > 4 ? "jump" : "idle";
        }
      }
      return;
    }
    if (f.state === "ko" || f.state === "win") return;

    if (this.phase === "intro") {
      if (f.y <= 0) {
        f.vx = 0;
        f.state = "idle";
        f.pose = "idle";
        f.crouchGuard = false;
      }
      return;
    }

    if (f.pullT > 0) {
      if (a.superDashP && this.trySuperDash(f, a)) {
        f.pullT = 0;
        return;
      }
      const other = f === this.f1 ? this.f2 : this.f1;
      const dir: 1 | -1 = other.x >= f.x ? 1 : -1;
      f.facing = dir;
      const dist = Math.abs(other.x - f.x);
      f.vx = dist < 110 ? 0 : dir * 155;
      f.atk = null;
      f.superDash = false;
      if (f.y > 4) {
        f.state = "jump";
        f.pose = "jump";
      } else {
        f.state = "walk";
        f.walkT += dt;
        f.pose = (`walk${Math.floor(f.walkT * 10) % 4}`) as Pose;
      }
      return;
    }

    if (f.state === "dash") {
      f.dashT -= dt;
      f.vx = f.dashDir * (f.superDash ? SUPER_DASH_SPEED : DASH_SPEED) * (f.rageT > 0 ? 1.3 : 1);
      f.pose = "dash";
      if (f.superDash) f.invuln = Math.max(f.invuln, 0.04);
      if (f.dashT <= 0) {
        f.state = "idle";
        f.vx *= 0.3;
        f.pose = "idle";
        f.superDash = false;
      }
      if (!f.superDash) this.tryAttack(f, a);
      return;
    }

    if (f.state === "attack" && f.atk) {
      f.atkT += dt * (f.rageT > 0 ? 1.3 : 1);
      if (f.atk.zone === "spin") {
        f.pose = "special";
        const axis = (a.right ? 1 : 0) + (a.left ? -1 : 0);
        if (f.y <= 0) {
          const fwd = axis === f.facing;
          f.vx = axis * (fwd ? WALK_FWD : WALK_BACK) * 1.3;
        }
        this.tickSpin(f, dt);
        const total = f.atk.startup + f.atk.active + f.atk.recover;
        if (f.atkT >= total) {
          f.state = f.y > 4 ? "jump" : "idle";
          f.atk = null;
          f.pose = f.y > 4 ? "jump" : "idle";
          f.vx *= 0.4;
        }
        return;
      }
      if (f.atk.zone === "bat") {
        f.pose = "special";
        f.vx = 0;
        this.tickBat(f, dt);
        const total = f.atk.startup + f.atk.active + f.atk.recover;
        if (f.atkT >= total) {
          f.state = "idle";
          f.atk = null;
          f.pose = "idle";
        }
        return;
      }
      if (f.atk.zone === "meteor") {
        this.tickMeteor(f, dt);
        const total = f.atk.startup + f.atk.active + f.atk.recover;
        if (f.atkT >= total) {
          f.state = f.y > 4 ? "jump" : "idle";
          f.atk = null;
          f.pose = f.y > 4 ? "jump" : "idle";
          f.invuln = 0;
        }
        return;
      }
      if (f.atk.zone === "stomp") {
        this.tickStomp(f, dt);
        const total = f.atk.startup + f.atk.active + f.atk.recover;
        if (f.atkT >= total) {
          f.state = f.y > 4 ? "jump" : "idle";
          f.atk = null;
          f.pose = f.y > 4 ? "jump" : "idle";
        }
        return;
      }
      if (f.atk.zone === "note") {
        f.pose = "special";
        f.vx = 0;
        this.tickTrumpet(f, dt);
        const total = f.atk.startup + f.atk.active + f.atk.recover;
        if (f.atkT >= total) {
          f.state = "idle";
          f.atk = null;
          f.pose = "idle";
        }
        return;
      }
      if (f.atk.zone === "solo") {
        f.pose = "special2";
        f.vx = 0;
        const holding = a.special2 && f.meter > 0.4;
        if (f.atkT >= f.atk.startup) {
          if (holding) {
            f.meter = Math.max(0, f.meter - 16 * dt);
            this.tickSolo(f, dt);
            if (f.atkT > f.atk.startup + 0.4) f.atkT = f.atk.startup + 0.05;
          } else if (f.atkT < f.atk.startup + f.atk.active) {
            f.atkT = f.atk.startup + f.atk.active;
          }
        }
        const total = f.atk.startup + f.atk.active + f.atk.recover;
        if (f.atkT >= total) {
          f.state = "idle";
          f.atk = null;
          f.pose = "idle";
        }
        return;
      }
      f.pose = f.atk.pose;
      const total = f.atk.startup + f.atk.active + f.atk.recover;
      const canCancel = f.hasHit && f.atkT >= f.atk.startup;
      if (canCancel) {
        const nxt = this.buffered(f);
        if (nxt && f.atk.cancel.includes(nxt.id)) {
          this.startAttack(f, nxt, true);
          return;
        }
      }
      if (f.atkT >= total) {
        const air = f.y > 4;
        f.state = air ? "jump" : "idle";
        f.atk = null;
        f.pose = air ? "jump" : "idle";
      }
      return;
    }

    const grounded = f.y <= 0;
    if (grounded && a.superDashP && this.trySuperDash(f, a)) return;
    if (grounded && (f.state === "idle" || f.state === "walk" || f.state === "block")) {
      if (a.leftP) {
        if (f.tapL > 0) {
          this.startDash(f, -1);
          return;
        }
        f.tapL = TAP_WIN;
      }
      if (a.rightP) {
        if (f.tapR > 0) {
          this.startDash(f, 1);
          return;
        }
        f.tapR = TAP_WIN;
      }
    }

    if (this.tryAttack(f, a)) return;

    if (a.up && grounded) {
      f.vy = JUMP_V;
      f.y = 2;
      f.state = "jump";
      f.pose = "jump";
      f.squash = 1;
      f.crouchGuard = false;
      return;
    }

    const axis = (a.right ? 1 : 0) + (a.left ? -1 : 0);
    if (a.block && grounded) {
      f.state = "block";
      f.crouchGuard = !!a.down;
      f.pose = "block";
      f.vx = 0;
      return;
    }
    if (a.down && grounded) {
      f.state = "crouch";
      f.crouchGuard = false;
      f.pose = "crouch";
      f.vx = 0;
      return;
    }
    f.crouchGuard = false;
    if (axis !== 0 && grounded) {
      const fwd = axis === f.facing;
      const mul = f.rageT > 0 ? 1.3 : 1;
      f.vx = axis * (fwd ? WALK_FWD : WALK_BACK) * mul;
      f.state = "walk";
      f.walkT += dt;
      const rate = f.id === "agi" ? 8 : 12;
      const frame = Math.floor(f.walkT * rate) % 4;
      f.pose = (`walk${frame}`) as Pose;
    } else if (grounded) {
      f.vx = 0;
      f.state = "idle";
      f.pose = "idle";
    } else {
      if (axis) f.vx = axis * 400 * (f.rageT > 0 ? 1.3 : 1);
      f.pose = "jump";
    }
  }

  addMeter(f: Fighter, n: number) {
    if (n <= 0 || f.rageT > 0) return;
    if (f.id === "jezus" && this.zones.some((z) => z.kind === "pillar" && z.owner === f && z.life > 0)) n *= 0.5;
    f.meter = Math.min(100, f.meter + n);
  }

  hurtHp(f: Fighter, n: number) {
    if (n <= 0) return;
    f.hp = Math.max(0, f.hp - n);
    f.lastHurtT = 0;
  }

  startDash(f: Fighter, dir: 1 | -1, superD = false) {
    f.state = "dash";
    f.dashDir = dir;
    f.superDash = superD;
    f.dashT = superD ? SUPER_DASH_DUR : DASH_DUR;
    f.pose = "dash";
    f.vx = dir * (superD ? SUPER_DASH_SPEED : DASH_SPEED);
    f.tapL = 0;
    f.tapR = 0;
    if (superD) {
      f.meter = Math.max(0, f.meter - SUPER_DASH_COST);
      f.invuln = SUPER_DASH_DUR;
    }
    if (superD) sfxPlay.superDash();
    else sfxPlay.dash();
  }

  trySuperDash(f: Fighter, a: Actions) {
    if (f.y > 0) return false;
    if (f.state === "attack" || f.state === "dash" || f.state === "hurt" || f.state === "ko" || f.state === "win") return false;
    if (f.meter < SUPER_DASH_COST) return false;
    let dir: 1 | -1 = f.facing;
    if (a.left && !a.right) dir = -1;
    else if (a.right && !a.left) dir = 1;
    this.startDash(f, dir, true);
    return true;
  }

  buffered(f: Fighter): Atk | null {
    if (f.bufSpecial2 > 0) {
      const s2 = special2For(f.id);
      if (f.meter >= s2.cost) return s2;
    }
    if (f.bufSpecial > 0) {
      const s1 = special1For(f.id);
      if (f.meter >= s1.cost) return s1;
    }
    if (f.bufKickR > 0) return KICK_R;
    if (f.bufKickL > 0) return KICK_L;
    if (f.bufPunchR > 0) return PUNCH_R;
    if (f.bufPunchL > 0) return PUNCH_L;
    return null;
  }

  tryAttack(f: Fighter, a: Actions) {
    if (this.phase === "intro") return false;
    if (f.shieldT > 0) return false;
    if (f.pullT > 0) return false;
    const nxt = this.buffered(f);
    if (!nxt) return false;
    if (nxt.id === "special" || nxt.id === "special2") {
      if (f.meter < nxt.cost) return false;
    }
    const air = f.y > 4;
    if (air) {
      if (nxt.id === "special" || nxt.id === "special2") return false;
      if (f.airAtk) return false;
      if (!JUMP_POSE[nxt.id]) return false;
    }
    const low = !air && a.down && nxt.id !== "special" && nxt.id !== "special2";
    this.startAttack(f, nxt, false, air, low);
    return true;
  }

  startAttack(f: Fighter, atk: Atk, chained: boolean, air = f.y > 4, low = false) {
    if (chained) {
      air = f.y > 4;
      low = !air && !!f.atk?.low && atk.id !== "special" && atk.id !== "special2";
    }
    const pose = air ? (JUMP_POSE[atk.id] ?? atk.pose) : low ? (LOW_POSE[atk.id] ?? atk.pose) : atk.pose;
    if (f.sameAtkId === atk.id) f.sameAtkN += 1;
    else {
      f.sameAtkId = atk.id;
      f.sameAtkN = 1;
    }
    f.state = "attack";
    if (air) {
      f.atk = {
        ...atk,
        pose,
        hx: atk.hx + 10,
        hy: atk.id.startsWith("kick") ? 150 : 175,
        hw: atk.hw + 24,
        hh: atk.id.startsWith("kick") ? 320 : 280,
      };
      f.airAtk = true;
      f.vx *= 0.88;
    } else if (low) {
      f.atk = {
        ...atk,
        pose,
        low: true,
        dmg: Math.max(4, Math.round(atk.dmg * 0.9)),
        hx: atk.hx + 8,
        hy: atk.id.startsWith("kick") ? 52 : 62,
        hw: atk.hw + 16,
        hh: atk.id.startsWith("kick") ? 58 : 48,
      };
      f.vx *= 0.2;
    } else {
      f.atk = atk;
      f.vx *= 0.3;
      if (atk.pounce) {
        if (f.id === "cricsi") {
          f.vx = f.facing * 900;
          f.vy = 360;
        } else {
          f.vx = f.facing * 760;
          f.vy = 520;
        }
        f.y = Math.max(f.y, 14);
      }
    }
    f.atkT = chained ? atk.startup * 0.55 : 0;
    f.hasHit = false;
    f.pose = pose;
    if (atk.id === "special" || atk.id === "special2") f.meter = Math.max(0, f.meter - atk.cost);
    f.bufPunchL = f.bufPunchR = f.bufKickL = f.bufKickR = f.bufSpecial = f.bufSpecial2 = 0;
    f.spec2Spawned = false;
    f.spinAcc = 0;
    if (f.id === "farajo" && (atk.id === "special" || atk.id === "special2")) {
      /* Farajo special SFX: farajoBed while the move is live */
    } else if (atk.id === "special2") sfxPlay.charSpecial2(f.id);
    else if (atk.id === "special") sfxPlay.charSpecial1(f.id);
    else {
      sfxPlay.charAttack(f.id);
      sfxPlay.swing();
    }
  }

  syncFarajoAudio() {
    const live = (f: Fighter): "trumpet" | "guitar" | null => {
      if (f.id !== "farajo" || f.state !== "attack" || !f.atk) return null;
      if (this.paused || this.screen !== "fight" || this.phase === "ko" || this.phase === "finish" || this.phase === "end") return null;
      const t = f.atkT;
      const open = t < f.atk.startup + f.atk.active;
      if (!open) return null;
      if (f.atk.zone === "note") return "trumpet";
      if (f.atk.zone === "solo") return "guitar";
      return null;
    };
    sfxPlay.farajoBed("p1", live(this.f1));
    sfxPlay.farajoBed("p2", live(this.f2));
    sfxPlay.stageHoldForGuitar(live(this.f1) === "guitar" || live(this.f2) === "guitar");
  }

  tickBody(f: Fighter, dt: number) {
    f.x += f.vx * dt;
    if (f.y > 0 || f.vy > 0) {
      f.vy -= GRAV * dt;
      f.y += f.vy * dt;
      if (f.y <= 0) {
        f.y = 0;
        f.vy = 0;
        f.airAtk = false;
        if (f.state === "jump") {
          f.state = "idle";
          f.pose = "idle";
          f.squash = 0.84;
        }
        if (f.state === "ko") f.pose = "hurt";
      }
    }
    f.x = Math.max(80, Math.min(W - 80, f.x));
  }

  separate() {
    if (this.f1.shieldT > 0 || this.f2.shieldT > 0) return;
    if (this.f1.superDash || this.f2.superDash) return;
    const hb1 = this.hurtbox(this.f1);
    const hb2 = this.hurtbox(this.f2);
    const vOverlap = hb1.y < hb2.y + hb2.h && hb2.y < hb1.y + hb1.h;
    if (!vOverlap) return;
    const gap = 90;
    const dx = this.f2.x - this.f1.x;
    if (Math.abs(dx) < gap) {
      const push = (gap - Math.abs(dx)) / 2;
      const s = dx >= 0 ? 1 : -1;
      this.f1.x -= push * s;
      this.f2.x += push * s;
    }
  }

  face() {
    const locked = (f: Fighter) => f.state === "attack" || f.state === "hurt" || f.state === "ko" || f.pullT > 0;
    if (!locked(this.f1)) this.f1.facing = this.f1.x <= this.f2.x ? 1 : -1;
    if (!locked(this.f2)) this.f2.facing = this.f2.x <= this.f1.x ? 1 : -1;
  }

  hurtbox(f: Fighter): Box {
    const crouch = f.state === "crouch" || (f.state === "block" && f.crouchGuard) || (f.state === "attack" && !!f.atk?.low);
    const h = crouch ? 155 : 250;
    return { x: f.x - 40, y: GROUND - f.y - h, w: 80, h, foot: 0 };
  }
  hitbox(f: Fighter, atk: Atk): Box {
    const x = f.facing === 1 ? f.x + atk.hx : f.x - atk.hx - atk.hw;
    return { x, y: GROUND - f.y - atk.hy, w: atk.hw, h: atk.hh, foot: 0 };
  }

  combat(att: Fighter, def: Fighter) {
    if (!att.atk || att.hasHit || att.state !== "attack") return;
    if (att.atk.zone === "cloud" || att.atk.zone === "quake" || att.atk.zone === "spit" || att.atk.zone === "ki" || att.atk.zone === "pillar" || att.atk.zone === "spin" || att.atk.zone === "brush" || att.atk.zone === "note" || att.atk.zone === "solo" || att.atk.zone === "bat" || att.atk.zone === "shot" || att.atk.zone === "meteor" || att.atk.zone === "stomp" || att.atk.shield || att.atk.rage || att.atk.pull) return;
    if (att.atkT < att.atk.startup || att.atkT > att.atk.startup + att.atk.active) return;
    if (def.invuln > 0 || def.state === "ko") return;
    const hb = this.hitbox(att, att.atk);
    const hurt = this.hurtbox(def);
    if (!overlap(hb, hurt)) return;
    att.hasHit = true;
    if (def.shieldT > 0) {
      def.flash = 0.12;
      this.spawnGuardSmoke(hb.x + hb.w / 2, hb.y + hb.h / 2, att.facing);
      sfxPlay.block();
      this.specialCallout("SZENT AURA", 0.35);
      return;
    }
    if (def.state === "attack" && def.atk?.armor) {
      att.hasHit = true;
      def.flash = 0.1;
      this.hurtHp(def, Math.max(1, Math.round(att.atk.dmg * 0.4)));
      if (att.atk.id !== "special" && att.atk.id !== "special2") this.addMeter(att, METER_HIT_ATT);
      this.addMeter(def, METER_HIT_DEF);
      sfxPlay.charDamage(def.id);
      if (def.hp <= 0) this.onKo(att, def);
      return;
    }
    const facingOk = def.facing === (def.x <= att.x ? 1 : -1);
    const guarding = def.state === "block" && facingOk;
    const low = !!att.atk.low;
    const blocked = guarding && !att.atk.unblockable && (low ? def.crouchGuard : true);
    const dir = att.facing;
    const attPad = att === this.f1 ? 0 : 1;
    const defPad = att === this.f1 ? 1 : 0;
    if (blocked) {
      def.vx = dir * att.atk.knock * 0.25;
      def.stun = att.atk.blockstun;
      def.state = "block";
      def.pose = "block";
      if (att.atk.id !== "special" && att.atk.id !== "special2") this.addMeter(att, METER_BLOCK_ATT);
      this.addMeter(def, METER_BLOCK_DEF);
      this.trauma = Math.min(1, this.trauma + 0.18);
      this.spawnGuardSmoke(hb.x + hb.w / 2, hb.y + hb.h / 2, dir);
      rumble(attPad, 80, 0.25);
      rumble(defPad, 90, 0.4);
      sfxPlay.block();
      att.chain = [];
      att.comboTag = "";
      return;
    }
    const side: 1 | 2 = att === this.f1 ? 1 : 2;
    const prior = this.comboSide === side ? this.combo : 0;
    const scale = Math.max(0.4, 1 - 0.12 * prior);
    att.chain = this.comboSide === side ? [...att.chain, att.atk.id] : [att.atk.id];
    const route = matchCombo(att.chain);
    const spam = Math.max(0.35, 1 - 0.1 * Math.max(0, att.sameAtkN - 1));
    let dmg = Math.max(1, Math.round(att.atk.dmg * scale * spam));
    if (route && route.name !== att.comboTag) {
      att.comboTag = route.name;
      dmg += route.bonus;
      this.comboName = route.name;
      this.specialCallout(route.name, 0.7);
    }
    this.hurtHp(def, dmg);
    if (att.atk.heal) att.hp = Math.min(MAX_HP, att.hp + att.atk.heal);
    def.vx = dir * att.atk.knock;
    def.vy = att.atk.id === "kickR" || att.atk.id.startsWith("special") ? 700 : att.atk.id === "kickL" ? 470 : 270;
    def.y += 2;
    def.stun = att.atk.hitstun;
    def.state = "hurt";
    def.pose = "hurt";
    def.atk = null;
    def.spec2Spawned = false;
    def.flash = 0.12;
    def.squash = 1.16;
    def.bleed = Math.min(1.4, def.bleed + (att.atk.id.startsWith("special") ? 1 : 0.55));
    if (att.atk.id !== "special" && att.atk.id !== "special2") this.addMeter(att, METER_HIT_ATT);
    this.addMeter(def, METER_HIT_DEF);
    this.hitstop = att.atk.id.startsWith("special") ? 0.11 : 0.05;
    this.trauma = Math.min(1, this.trauma + (att.atk.id.startsWith("special") ? 0.55 : 0.34));
    if (this.comboSide === side) this.combo += 1;
    else {
      this.combo = 1;
      this.comboSide = side;
    }
    this.comboT = 1.4;
    const cx = hb.x + hb.w / 2;
    const cy = hb.y + hb.h / 2;
    this.spawnFx(cx, cy, att.atk.id.startsWith("special") ? "burst" : "clang", dmg);
    const heavy = att.atk.id.startsWith("special") || att.atk.id === "kickR" || this.combo >= 2 || !!route;
    this.spawnBlood(cx, cy, dir, heavy);
    rumble(attPad, att.atk.id.startsWith("special") ? 260 : 130, att.atk.id.startsWith("special") ? 0.95 : 0.7);
    rumble(defPad, att.atk.id.startsWith("special") ? 220 : 110, 0.55);
    if (att.atk.id === "special") {
      sfxPlay.heavy();
      this.specialCallout(CHARACTERS[att.id].special, 0.85);
    } else if (att.atk.id === "special2") {
      sfxPlay.heavy();
      this.specialCallout(CHARACTERS[att.id].special2, 0.85);
    } else sfxPlay.hit();
    sfxPlay.charDamage(def.id);
    if (def.hp <= 0) this.onKo(att, def);
  }

  onKo(winner: Fighter, loser: Fighter) {
    if (this.training) {
      loser.hp = MAX_HP;
      loser.state = "hurt";
      loser.stun = 0.35;
      loser.pose = "hurt";
      return;
    }
    if (this.phase !== "fight") return;
    loser.hp = 0;
    loser.state = "ko";
    loser.pose = "hurt";
    loser.vy = 860;
    loser.y += 8;
    sfxPlay.ko();
    sfxPlay.charDefeat(loser.id);
    this.spawnBlood(loser.x, GROUND - 160, winner.facing, true);
    this.roundWin(winner);
  }

  doFatality(winner: Fighter) {
    const loser = winner === this.f1 ? this.f2 : this.f1;
    this.phase = "fatality";
    this.finishT = 6.5;
    winner.state = "attack";
    winner.atk = SPECIAL;
    winner.atkT = 0.16;
    winner.pose = "special";
    loser.vx = winner.facing * 900;
    loser.vy = 1160;
    loser.y += 20;
    loser.pose = "hurt";
    loser.bleed = 1.4;
    this.callout = "K.O.";
    this.calloutT = 2.4;
    this.fatality = null;
    this.trauma = 1;
    this.hitstop = 0.16;
    sfxPlay.fatality();
    winner.wins = 2;
    this.winner = winner.id;
    rumble(0, 420, 1);
    rumble(1, 420, 1);
    this.spawnBlood(loser.x, GROUND - 180, winner.facing, true);
    this.spawnBlood(loser.x + 30, GROUND - 220, winner.facing, true);
  }

  roundWin(winner: Fighter) {
    winner.wins += 1;
    const match = winner.wins >= 2;
    winner.state = "win";
    winner.vx *= 0.35;
    this.recordReplay();
    this.phase = "ko";
    this.callout = "K.O.";
    this.calloutT = 2.7;
    this.finishT = 2.7;
    this.replayTailT = REPLAY_TAIL;
    if (match) {
      this.winner = winner.id;
      this.winAnnounceId = null;
      this.winAnnounceT = 0;
    } else {
      this.winAnnounceId = null;
      this.winAnnounceT = 0;
    }
  }

  timeOver() {
    if (this.phase !== "fight") return;
    if (this.f1.hp === this.f2.hp) {
      this.callout = "DÖNTETLEN";
      this.calloutT = 2;
      this.phase = "ko";
      this.finishT = 2;
      return;
    }
    const winner = this.f1.hp > this.f2.hp ? this.f1 : this.f2;
    sfxPlay.ko();
    sfxPlay.charDefeat(winner === this.f1 ? this.f2.id : this.f1.id);
    this.roundWin(winner);
  }

  goResult() {
    this.screen = "result";
    this.phase = "end";
    if (this.winner) sfxPlay.charTaunt(this.winner);
    this.pushHud();
  }

  recordReplay() {
    if (!this.f1 || !this.f2) return;
    this.replayBuf.push({
      f1: snapFighter(this.f1),
      f2: snapFighter(this.f2),
      particles: this.particles.slice(-48).map((p) => ({ ...p })),
      trauma: this.trauma,
      timer: this.timer,
      combo: this.combo,
      comboSide: this.comboSide,
    });
    while (this.replayBuf.length > REPLAY_MAX) {
      this.replayBuf.shift();
      for (const s of this.replaySfx) s.i -= 1;
      this.replaySfx = this.replaySfx.filter((s) => s.i >= 0);
    }
  }

  maybeRecordReplay() {
    if (this.training) return;
    if (this.phase === "fight" || this.phase === "intro") this.recordReplay();
    else if (this.phase === "ko" && this.replayTailT > 0) this.recordReplay();
  }

  applyReplay(s: ReplaySnap) {
    applyFighter(this.f1, s.f1);
    applyFighter(this.f2, s.f2);
    this.particles = s.particles.map((p) => ({ ...p }));
    this.trauma = s.trauma;
    this.timer = s.timer;
    this.combo = s.combo;
    this.comboSide = s.comboSide;
  }

  startReplay() {
    this.phase = "replay";
    this.callout = null;
    this.calloutT = 0;
    this.replaySkipLock = 0.22;
    this.winAnnounceT = 0;
    this.replaySfxAt = 0;
    this.replayPlayI = -1;
    this.replayHold = [null, null];
    this.replayCamX = (this.f1.x + this.f2.x) / 2;
    this.replayCamY = GROUND - (this.f1.y + this.f2.y) * 0.28 - 150;
    this.replayCum = [];
    let t = 0;
    const step = 1 / REPLAY_HZ;
    const n = this.replayBuf.length;
    for (let i = 0; i < n; i++) {
      this.replayCum.push(t);
      t += step / 0.62;
    }
    this.finishT = Math.max(0.8, t);
  }

  pumpReplaySfx(frameI: number) {
    while (this.replaySfxAt < this.replaySfx.length) {
      const ev = this.replaySfx[this.replaySfxAt]!;
      if (ev.i > frameI) break;
      this.replaySfxAt += 1;
      if (ev.i === frameI) this.runReplaySfx(ev);
    }
  }

  runReplaySfx(ev: ReplaySfx) {
    const id = ev.id ?? "";
    if (ev.k === "hit") sfxPlay.hit();
    else if (ev.k === "heavy") sfxPlay.heavy();
    else if (ev.k === "block") sfxPlay.block();
    else if (ev.k === "dash") sfxPlay.dash();
    else if (ev.k === "superDash") sfxPlay.superDash();
    else if (ev.k === "attack") sfxPlay.charAttack(id);
    else if (ev.k === "swing") sfxPlay.swing();
    else if (ev.k === "damage") sfxPlay.charDamage(id);
    else if (ev.k === "defeat") sfxPlay.charDefeat(id);
    else if (ev.k === "special1") sfxPlay.charSpecial1(id);
    else if (ev.k === "special2") sfxPlay.charSpecial2(id);
    else if (ev.k === "quake") sfxPlay.quake();
    else if (ev.k === "ko") sfxPlay.ko();
  }

  endReplay() {
    if (this.phase !== "replay") return;
    if (this.f1.wins >= 2 || this.f2.wins >= 2) {
      this.phase = "finish";
      this.winAnnounceId = this.winner;
      this.winAnnounceT = 0.08;
      this.finishT = 5.2;
      this.callout = null;
      this.calloutT = 0;
      this.pushHud();
      return;
    }
    this.round += 1;
    this.beginRound();
  }

  spawnFx(x: number, y: number, kind: Particle["kind"], dmg: number) {
    if (kind === "clang") {
      this.particles.push({ x, y, vx: 0, vy: 0, life: 0.14, max: 0.14, size: 22, kind });
    } else if (kind === "burst") {
      this.particles.push({ x, y, vx: 0, vy: 0, life: 0.12, max: 0.12, size: 26, kind });
    }
    if (dmg) {
      this.particles.push({
        x,
        y: y - 20,
        vx: 0,
        vy: 80,
        life: 0.7,
        max: 0.7,
        size: 22,
        kind: "num",
        text: String(dmg),
      });
    }
  }

  spawnGuardSmoke(x: number, y: number, dir: 1 | -1) {
    const n = this.reduced ? 8 : 16;
    for (let i = 0; i < n; i++) {
      const ang = -0.85 + Math.random() * 1.7;
      const spd = 90 + Math.random() * 220;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(ang) * spd * dir,
        vy: Math.abs(Math.sin(ang)) * spd * 0.85 + 40,
        life: 0.18 + Math.random() * 0.22,
        max: 0.4,
        size: 7 + Math.random() * 10,
        kind: "smoke",
        tint: Math.random() < 0.35 ? "#ffffff" : "#e8e8e8",
      });
    }
    for (let i = 0; i < 5; i++) {
      const ang = (Math.random() - 0.5) * 1.2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * (40 + Math.random() * 80) * dir,
        vy: 30 + Math.random() * 90,
        life: 0.12 + Math.random() * 0.1,
        max: 0.22,
        size: 2 + Math.random() * 3,
        kind: "spark",
        tint: "#ffffff",
      });
    }
  }

  spawnBlood(x: number, y: number, dir: 1 | -1, heavy: boolean) {
    const mistN = this.reduced ? 8 : heavy ? 26 : 16;
    const dropN = this.reduced ? 12 : heavy ? 38 : 24;
    const streakN = this.reduced ? 3 : heavy ? 9 : 5;
    const dripN = this.reduced ? 2 : heavy ? 7 : 4;
    const tint = () => BLOOD_TINT[(Math.random() * BLOOD_TINT.length) | 0];

    for (let i = 0; i < mistN; i++) {
      const ang = dir > 0 ? (Math.random() - 0.35) * 1.4 : Math.PI + (Math.random() - 0.65) * 1.4;
      const spd = 70 + Math.random() * 260;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 18,
        y: y + (Math.random() - 0.5) * 16,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.75 + 40,
        life: 0.18 + Math.random() * 0.22,
        max: 0.4,
        size: 1.1 + Math.random() * 1.8,
        kind: "blood",
        frame: 1,
        tint: tint(),
      });
    }

    for (let i = 0; i < dropN; i++) {
      const theta = (Math.random() - 0.5) * 1.05;
      const lift = Math.random() * 0.7 - 0.12;
      const ang = dir > 0 ? theta + lift : Math.PI - theta - lift;
      const spd = 180 + Math.random() * (heavy ? 720 : 480);
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 12,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.35 + Math.random() * 0.45,
        max: 0.85,
        size: 1.6 + Math.random() * (heavy ? 4.2 : 3.1),
        kind: "blood",
        frame: 0,
        tint: tint(),
      });
    }

    for (let i = 0; i < streakN; i++) {
      const theta = (Math.random() - 0.5) * 0.55;
      const ang = dir > 0 ? theta : Math.PI - theta;
      const spd = 420 + Math.random() * 520;
      this.particles.push({
        x,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.45 + 80,
        life: 0.08 + Math.random() * 0.1,
        max: 0.18,
        size: 3 + Math.random() * 4,
        kind: "blood",
        frame: 3,
        tint: tint(),
      });
    }

    for (let i = 0; i < dripN; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 14,
        y: y + Math.random() * 8,
        vx: dir * (20 + Math.random() * 50) + (Math.random() - 0.5) * 30,
        vy: -40 - Math.random() * 90,
        life: 0.5 + Math.random() * 0.5,
        max: 1,
        size: 1.8 + Math.random() * 2.4,
        kind: "blood",
        frame: 0,
        tint: tint(),
      });
    }
  }

  tickSpin(f: Fighter, dt: number) {
    if (!f.atk || f.atk.zone !== "spin") return;
    if (f.atkT < f.atk.startup) return;
    if (!f.spec2Spawned) {
      f.spec2Spawned = true;
      this.specialCallout(CHARACTERS[f.id].special, 1.2);
    }
    f.spinAcc += dt;
    while (f.spinAcc >= 0.25) {
      f.spinAcc -= 0.25;
      this.spinPulse(f);
    }
  }

  spinPulse(f: Fighter) {
    const def = f === this.f1 ? this.f2 : this.f1;
    const atk = f.atk;
    if (!atk || def.state === "ko" || def.invuln > 0) return;
    const hb = this.hitbox(f, atk);
    const hurt = this.hurtbox(def);
    if (!overlap(hb, hurt)) return;
    if (def.shieldT > 0) {
      def.flash = 0.08;
      this.spawnGuardSmoke(def.x, GROUND - 180, f.facing);
      sfxPlay.block();
      return;
    }
    const facingOk = def.facing === (def.x <= f.x ? 1 : -1);
    const blocked = def.state === "block" && facingOk && !atk.unblockable;
    if (blocked) {
      def.vx = f.facing * atk.knock * 0.25;
      def.stun = atk.blockstun;
      this.spawnGuardSmoke(def.x, GROUND - 170, f.facing);
      sfxPlay.block();
      return;
    }
    this.hurtHp(def, atk.dmg);
    def.vx = f.facing * atk.knock;
    def.stun = atk.hitstun;
    def.state = "hurt";
    def.pose = "hurt";
    def.flash = 0.1;
    def.y += 1;
    this.trauma = Math.min(1, this.trauma + 0.18);
    sfxPlay.hit();
    sfxPlay.charDamage(def.id);
    if (def.hp <= 0) this.onKo(f, def);
  }

  tickBat(f: Fighter, dt: number) {
    if (!f.atk || f.atk.zone !== "bat") return;
    if (f.atkT < f.atk.startup) return;
    void dt;
    if (!f.spec2Spawned) {
      f.spec2Spawned = true;
      f.spinAcc = -1;
      this.specialCallout(CHARACTERS[f.id].special, 0.9);
    }
    const i = Math.min(4, Math.floor(Math.max(0, f.atkT - f.atk.startup) / 0.14));
    if (i > f.spinAcc) {
      f.spinAcc = i;
      this.spinPulse(f);
    }
  }

  tickMeteor(f: Fighter, dt: number) {
    if (!f.atk || f.atk.zone !== "meteor") return;
    void dt;
    const def = f === this.f1 ? this.f2 : this.f1;
    f.vx = 0;
    f.invuln = Math.max(f.invuln, 0.06);
    if (f.atkT < f.atk.startup) {
      f.pose = "special";
      f.vy = 1680;
      if (f.y > 640) f.y = 640;
      return;
    }
    if (!f.spec2Spawned) {
      f.spec2Spawned = true;
      f.x = def.x;
      f.y = 560;
      f.vy = -120;
      this.specialCallout(CHARACTERS[f.id].special, 0.8);
    }
    f.pose = "jump";
    if (f.y <= 0 && !f.hasHit) {
      f.y = 0;
      f.vy = 0;
      f.pose = "special2";
      this.meteorLand(f, def);
    }
  }

  meteorLand(f: Fighter, def: Fighter) {
    f.hasHit = true;
    f.squash = 0.94;
    this.trauma = Math.min(1, this.trauma + 0.22);
    if (def.state === "ko" || def.invuln > 0) return;
    if (def.shieldT > 0) {
      def.flash = 0.1;
      sfxPlay.block();
      return;
    }
    const hb = { x: f.x - 70, y: GROUND - 280, w: 140, h: 280, foot: 0 };
    if (!overlap(hb, this.hurtbox(def))) return;
    this.hurtHp(def, f.atk?.dmg ?? 26);
    def.vx = (def.x >= f.x ? 1 : -1) * (f.atk?.knock ?? 280);
    def.stun = f.atk?.hitstun ?? 0.55;
    def.state = "hurt";
    def.pose = "hurt";
    def.flash = 0.12;
    def.y += 8;
    sfxPlay.hit();
    sfxPlay.charDamage(def.id);
    if (def.hp <= 0) this.onKo(f, def);
  }

  tickStomp(f: Fighter, dt: number) {
    if (!f.atk || f.atk.zone !== "stomp") return;
    void dt;
    const def = f === this.f1 ? this.f2 : this.f1;
    f.vx = 0;
    if (f.atkT < f.atk.startup) {
      f.pose = "special2";
      f.vy = 780;
      if (f.y < 28) f.y = 28;
      return;
    }
    f.pose = "special2";
    if (f.y > 0) {
      f.vy = Math.min(f.vy, -2100);
      return;
    }
    f.y = 0;
    f.vy = 0;
    f.squash = 0.72;
    if (f.hasHit) return;
    f.hasHit = true;
    this.specialCallout(CHARACTERS[f.id].special2, 0.7);
    this.trauma = Math.min(1, this.trauma + 0.16);
    this.spawnRockBurst(f.x, GROUND - 8, f.facing);
    this.spawnRockBurst(f.x, GROUND - 4, -f.facing);
    rumble(f === this.f1 ? 0 : 1, 200, 0.7);
    if (def.state === "ko" || def.invuln > 0) return;
    if (def.y > 8) return;
    if (def.shieldT > 0 || (def.state === "block" && def.facing === (def.x <= f.x ? 1 : -1))) {
      def.flash = 0.08;
      def.stun = f.atk.blockstun;
      sfxPlay.block();
      return;
    }
    this.hurtHp(def, f.atk.dmg);
    const toward = Math.sign(f.x - def.x) || -f.facing;
    def.vx = toward * 520;
    def.vy = 1180;
    def.y = 18;
    def.stun = f.atk.hitstun;
    def.state = "hurt";
    def.pose = "hurt";
    def.flash = 0.1;
    sfxPlay.hit();
    sfxPlay.charDamage(def.id);
    if (def.hp <= 0) this.onKo(f, def);
  }

  maybeSpec2(f: Fighter) {
    if (f.state !== "attack" || !f.atk || f.spec2Spawned) return;
    if (f.atkT < f.atk.startup) return;
    if (f.atk.zone === "pillar") {
      f.spec2Spawned = true;
      this.spawnPillar(f);
      return;
    }
    if (f.atk.zone === "shot") {
      f.spec2Spawned = true;
      this.spawnShot(f);
      return;
    }
    if (f.atk.shield) {
      f.spec2Spawned = true;
      f.shieldT = 5;
      this.specialCallout(CHARACTERS[f.id].special2, 0.8);
      return;
    }
    if (f.atk.rage) {
      f.spec2Spawned = true;
      f.rageT = 5;
      this.specialCallout(CHARACTERS[f.id].special, 1.2);
      this.trauma = Math.min(1, this.trauma + 0.22);
      rumble(f === this.f1 ? 0 : 1, 160, 0.55);
      this.spawnGuardSmoke(f.x + f.facing * 24, GROUND - f.y - 210, f.facing);
      return;
    }
    if (f.atk.pull) {
      f.spec2Spawned = true;
      const def = f === this.f1 ? this.f2 : this.f1;
      if (def.state !== "ko") {
        def.pullT = 3;
        def.atk = null;
        def.stun = 0;
        def.superDash = false;
        def.dashT = 0;
        def.invuln = 0;
        if (def.y > 4) {
          def.state = "jump";
          def.pose = "jump";
        } else {
          def.state = "walk";
          def.pose = "walk0";
        }
      }
      this.specialCallout(CHARACTERS[f.id].special2, 1.2);
      this.trauma = Math.min(1, this.trauma + 0.28);
      rumble(0, 180, 0.5);
      rumble(1, 180, 0.5);
      this.spawnGuardSmoke(f.x + f.facing * 30, GROUND - f.y - 210, f.facing);
      return;
    }
    if (f.atk.zone === "spit") {
      f.spec2Spawned = true;
      this.spawnSpit(f);
      return;
    }
    if (f.atk.zone === "brush") {
      f.spec2Spawned = true;
      this.spawnBrush(f);
      return;
    }
    if (f.atk.zone === "ki") {
      f.spec2Spawned = true;
      this.spawnKiBurst(f);
      return;
    }
    if (f.atk.id !== "special2") return;
    f.spec2Spawned = true;
    if (f.atk.zone === "cloud") this.spawnFartCloud(f);
    if (f.atk.zone === "beam") this.spawnPukeBurst(f);
    if (f.atk.zone === "quake") this.spawnQuake(f);
  }

  spawnPillar(f: Fighter) {
    const def = f === this.f1 ? this.f2 : this.f1;
    const w = 110;
    this.zones.push({
      owner: f,
      kind: "pillar",
      x: def.x - w / 2,
      y: GROUND - 440,
      w,
      h: 440,
      life: 5,
      dmg: f.atk?.dmg ?? 4,
      dir: f.facing,
      hit: false,
      arm: 0,
      jumped: false,
      pulsesLeft: 20,
      pulseEvery: 0.25,
      pulseAcc: 0.25,
    });
    this.specialCallout(CHARACTERS[f.id].special, 0.9);
    this.trauma = Math.min(1, this.trauma + 0.25);
  }

  spawnBrush(f: Fighter) {
    const dir = f.facing;
    const x = dir === 1 ? f.x + 28 : f.x - 90;
    const y = GROUND - f.y - 250;
    this.zones.push({
      owner: f,
      kind: "brush",
      x,
      y,
      w: 72,
      h: 56,
      life: 0.85,
      dmg: f.atk?.dmg ?? 18,
      dir,
      hit: false,
      arm: 0,
      jumped: false,
    });
    this.specialCallout(CHARACTERS[f.id].special2, 0.7);
    this.trauma = Math.min(1, this.trauma + 0.2);
    sfxPlay.charSpecial2(f.id);
  }

  spawnSpit(f: Fighter) {
    const dir = f.facing;
    const x = dir === 1 ? f.x + 36 : f.x - 78;
    const y = GROUND - f.y - 278;
    this.zones.push({
      owner: f,
      kind: "spit",
      x,
      y,
      w: 46,
      h: 34,
      life: 0.62,
      dmg: f.atk?.dmg ?? 16,
      dir,
      hit: false,
      arm: 0,
      jumped: false,
    });
    const n = this.reduced ? 6 : 12;
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: x + dir * Math.random() * 16,
        y: y + 8 + (Math.random() - 0.5) * 18,
        vx: dir * (320 + Math.random() * 220),
        vy: (Math.random() - 0.5) * 90,
        life: 0.28 + Math.random() * 0.22,
        max: 0.5,
        size: 5 + Math.random() * 8,
        kind: "smoke",
        tint: Math.random() < 0.5 ? "#4aa8ff" : "#1e6ad4",
      });
    }
  }

  spawnShot(f: Fighter) {
    const dir = f.facing;
    const muzzle = 78;
    const x = dir === 1 ? f.x + muzzle : f.x - muzzle - 52;
    const y = GROUND - f.y - 252;
    this.zones.push({
      owner: f,
      kind: "shot",
      x,
      y,
      w: 52,
      h: 46,
      life: 0.7,
      dmg: f.atk?.dmg ?? 28,
      dir,
      hit: false,
      arm: 0,
      jumped: false,
    });
    this.specialCallout(CHARACTERS[f.id].special2, 0.8);
    this.trauma = Math.min(1, this.trauma + 0.18);
    const n = this.reduced ? 4 : 8;
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: x + dir * Math.random() * 10,
        y: y + 6 + (Math.random() - 0.5) * 8,
        vx: dir * (520 + Math.random() * 220),
        vy: (Math.random() - 0.5) * 50,
        life: 0.12 + Math.random() * 0.12,
        max: 0.24,
        size: 3 + Math.random() * 4,
        kind: "spark",
        tint: Math.random() < 0.5 ? "#ffe14a" : "#fff6c8",
      });
    }
  }

  spawnNote(f: Fighter) {
    const dir = f.facing;
    const x = dir === 1 ? f.x + 52 : f.x - 52 - 64;
    const y = GROUND - f.y - 292;
    const life = 1.45;
    this.zones.push({
      owner: f,
      kind: "note",
      x,
      y,
      w: 64,
      h: 64,
      life,
      dmg: f.atk?.dmg ?? 5.25,
      dir,
      hit: false,
      arm: 0,
      jumped: false,
      y0: y,
      phase: Math.random() * Math.PI * 2,
      amp: 62 + Math.random() * 28,
      noteI: Math.floor(Math.random() * 4),
      maxLife: life,
    });
  }
  tickTrumpet(f: Fighter, dt: number) {
    if (!f.atk || f.atk.zone !== "note") return;
    if (f.atkT < f.atk.startup || f.atkT > f.atk.startup + f.atk.active) return;
    if (!f.spec2Spawned) {
      f.spec2Spawned = true;
      this.specialCallout(CHARACTERS[f.id].special, 0.9);
      this.spawnNote(f);
      f.spinAcc = 0;
      return;
    }
    f.spinAcc += dt;
    while (f.spinAcc >= 0.22) {
      f.spinAcc -= 0.22;
      this.spawnNote(f);
    }
  }
  tickSolo(f: Fighter, dt: number) {
    if (!f.atk || f.atk.zone !== "solo") return;
    if (f.atkT < f.atk.startup) return;
    if (!f.spec2Spawned) {
      f.spec2Spawned = true;
      this.specialCallout(CHARACTERS[f.id].special2, 0.7);
    }
    f.spinAcc += dt;
    while (f.spinAcc >= 0.26) {
      f.spinAcc -= 0.26;
      f.hp = Math.min(MAX_HP, f.hp + (f.atk.heal ?? 5));
      this.particles.push({
        x: f.x + (Math.random() - 0.5) * 40,
        y: GROUND - f.y - 180 + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 40,
        vy: -50 - Math.random() * 60,
        life: 0.28 + Math.random() * 0.18,
        max: 0.46,
        size: 6 + Math.random() * 8,
        kind: "spark",
        tint: Math.random() < 0.5 ? "#ffe14a" : "#7dce3a",
      });
    }
  }

  spawnKiBurst(f: Fighter) {
    const w = 340;
    this.zones.push({
      owner: f,
      kind: "ki",
      x: f.x - w / 2,
      y: GROUND - f.y - 300,
      w,
      h: 300,
      life: 0.45,
      dmg: f.atk?.dmg ?? 22,
      dir: f.facing,
      hit: false,
      arm: 0.05,
      jumped: false,
    });
    const n = this.reduced ? 16 : 42;
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.2;
      const spd = 220 + Math.random() * 420;
      this.particles.push({
        x: f.x + Math.cos(ang) * 12,
        y: GROUND - f.y - 160 + Math.sin(ang) * 12,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.7,
        life: 0.28 + Math.random() * 0.28,
        max: 0.56,
        size: 8 + Math.random() * 16,
        kind: "burst",
        tint: Math.random() < 0.5 ? "#fff4b0" : "#ffe14a",
      });
    }
    this.trauma = Math.min(1, this.trauma + 0.55);
    rumble(0, 280, 0.85);
    rumble(1, 280, 0.85);
  }

  spawnFartCloud(f: Fighter) {
    const dir = f.facing;
    const w = 250;
    const x = dir === 1 ? f.x - 90 : f.x - 160;
    this.zones.push({
      owner: f,
      kind: "cloud",
      x,
      y: GROUND - 145,
      w,
      h: 145,
      life: 1.55,
      dmg: f.atk?.dmg ?? 18,
      dir,
      hit: false,
      arm: 0.32,
      jumped: false,
    });
    const n = this.reduced ? 10 : 26;
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: x + 20 + Math.random() * 180,
        y: GROUND - 18 - Math.random() * 120,
        vx: dir * (16 + Math.random() * 70) + (Math.random() - 0.5) * 50,
        vy: 20 + Math.random() * 80,
        life: 0.8 + Math.random() * 0.8,
        max: 1.3,
        size: 16 + Math.random() * 26,
        kind: "smoke",
        tint: Math.random() < 0.45 ? "#6cbc2e" : Math.random() < 0.5 ? "#b6e85c" : "#9ad63a",
      });
    }
  }

  spawnQuake(f: Fighter) {
    this.zones.push({
      owner: f,
      kind: "quake",
      x: f.x - 150,
      y: GROUND - 88,
      w: 310,
      h: 88,
      life: 0.92,
      dmg: f.atk?.dmg ?? 11,
      dir: f.facing,
      hit: false,
      arm: 0,
      jumped: false,
      pulsesLeft: 3,
      pulseEvery: 0.24,
      pulseAcc: 0.22,
    });
    this.spawnRockBurst(f.x, GROUND - 8, f.facing);
    sfxPlay.quake();
  }

  spawnRockBurst(x: number, y: number, dir: 1 | -1) {
    const n = this.reduced ? 10 : 22;
    for (let i = 0; i < n; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 180,
        y: y - Math.random() * 18,
        vx: side * (40 + Math.random() * 220) + dir * 40,
        vy: 180 + Math.random() * 420,
        life: 0.45 + Math.random() * 0.55,
        max: 1,
        size: 3 + Math.random() * 7,
        kind: "rock",
        tint: Math.random() < 0.4 ? "#6b5340" : Math.random() < 0.5 ? "#8a7460" : "#4a3b2e",
      });
    }
    for (let i = 0; i < (this.reduced ? 6 : 14); i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 200,
        y: y - Math.random() * 24,
        vx: (Math.random() - 0.5) * 80,
        vy: 20 + Math.random() * 40,
        life: 0.5 + Math.random() * 0.5,
        max: 1,
        size: 10 + Math.random() * 18,
        kind: "smoke",
        tint: Math.random() < 0.5 ? "#c4b49a" : "#8a7a64",
      });
    }
  }

  spawnPukeBurst(f: Fighter) {
    const dir = f.facing;
    const mx = f.x + dir * 42;
    const my = GROUND - f.y - 268;
    for (let i = 0; i < (this.reduced ? 8 : 16); i++) {
      this.particles.push({
        x: mx + dir * Math.random() * 40,
        y: my + (Math.random() - 0.5) * 24,
        vx: dir * (220 + Math.random() * 380),
        vy: (Math.random() - 0.5) * 140,
        life: 0.22 + Math.random() * 0.2,
        max: 0.42,
        size: 6 + Math.random() * 10,
        kind: "smoke",
        tint: Math.random() < 0.5 ? "#8fdc3a" : "#d4f07a",
      });
    }
  }

  tickBeamDrip(f: Fighter) {
    if (f.state !== "attack" || !f.atk || f.atk.zone !== "beam") return;
    if (f.atkT < f.atk.startup || f.atkT > f.atk.startup + f.atk.active) return;
    if (this.reduced) return;
    const dir = f.facing;
    this.particles.push({
      x: f.x + dir * (70 + Math.random() * 480),
      y: GROUND - f.y - 248 - Math.random() * 44,
      vx: dir * (30 + Math.random() * 90),
      vy: -40 - Math.random() * 140,
      life: 0.18 + Math.random() * 0.22,
      max: 0.4,
      size: 4 + Math.random() * 7,
      kind: "smoke",
      tint: Math.random() < 0.5 ? "#7dce3a" : "#c8f06a",
    });
  }

  tickZones(dt: number) {
    for (const z of this.zones) {
      z.life -= dt;
      if (z.arm > 0) z.arm -= dt;
      if (z.kind === "cloud") {
        z.x += z.dir * 36 * dt;
        z.w += 22 * dt;
      }
      if (z.kind === "spit") {
        z.x += z.dir * 820 * dt;
      }
      if (z.kind === "shot") {
        z.x += z.dir * 1480 * dt;
      }
      if (z.kind === "note") {
        const age = (z.maxLife ?? 1.45) - z.life;
        z.x += z.dir * 460 * dt;
        z.y = (z.y0 ?? z.y) + Math.sin(age * 7.2 + (z.phase ?? 0)) * (z.amp ?? 70);
      }
      if (z.kind === "brush") {
        z.x += z.dir * 760 * dt;
        z.y += Math.sin(z.life * 18) * 20 * dt;
      }
      if (z.kind === "ki") {
        z.w += 520 * dt;
        z.h += 380 * dt;
        z.x -= 260 * dt;
        z.y -= 190 * dt;
      }
      if (z.kind === "quake" || z.kind === "pillar") {
        z.pulseAcc = (z.pulseAcc ?? 0) + dt;
        const every = z.pulseEvery ?? 0.24;
        if ((z.pulsesLeft ?? 0) > 0 && z.pulseAcc >= every) {
          z.pulseAcc = 0;
          z.pulsesLeft = (z.pulsesLeft ?? 1) - 1;
          if (z.kind === "pillar") this.pillarPulse(z);
          else this.quakePulse(z);
        }
        continue;
      }
      if (z.hit || z.life <= 0) continue;
      if (z.arm > 0) continue;
      const def = z.owner === this.f1 ? this.f2 : this.f1;
      const att = z.owner;
      if (def.state === "ko" || def.invuln > 0) continue;
      if (z.kind !== "spit" && z.kind !== "ki" && z.kind !== "brush" && z.kind !== "note" && z.kind !== "solo" && z.kind !== "shot") {
        if (def.y > 36) z.jumped = true;
        if (z.jumped) continue;
      }
      const hurt = this.hurtbox(def);
      if (!overlap({ x: z.x, y: z.y, w: z.w, h: z.h, foot: 0 }, hurt)) continue;
      if (z.kind === "shot") {
        const ducked =
          def.state === "crouch" ||
          def.crouchGuard ||
          def.pose === "crouch" ||
          def.pose.startsWith("low") ||
          (def.state === "attack" && !!def.atk?.low);
        if (ducked) continue;
      }
      const facingOk = def.facing === (def.x <= att.x ? 1 : -1);
      if ((z.kind === "spit" || z.kind === "brush" || z.kind === "note" || z.kind === "solo") && def.state === "block" && facingOk) {
        z.hit = true;
        def.vx = z.dir * 70;
        this.addMeter(def, METER_BLOCK_DEF);
        this.spawnGuardSmoke(def.x, GROUND - 180, z.dir);
        sfxPlay.block();
        continue;
      }
      if (def.shieldT > 0) {
        z.hit = true;
        def.flash = 0.1;
        this.spawnGuardSmoke(def.x, GROUND - 180, z.dir);
        sfxPlay.block();
        continue;
      }
      z.hit = true;
      const dir = z.dir;
      this.hurtHp(def, z.dmg);
      def.vx = dir * (z.kind === "ki" ? 420 : z.kind === "note" ? 80 : 240);
      def.vy = z.kind === "ki" ? 620 : z.kind === "note" ? 160 : 420;
      def.y += 2;
      def.stun = z.kind === "note" ? 0.16 : 0.48;
      def.state = "hurt";
      def.pose = "hurt";
      def.atk = null;
      def.spec2Spawned = false;
      def.flash = 0.12;
      this.addMeter(def, METER_HIT_DEF);
      this.hitstop = 0.09;
      this.trauma = Math.min(1, this.trauma + 0.4);
      this.specialCallout(
        z.kind === "spit" ? "Köpköd a Vámpír!" : z.kind === "shot" ? CHARACTERS[att.id].special2 : z.kind === "brush" ? "Kefe dobás!" : z.kind === "note" ? CHARACTERS[att.id].special : CHARACTERS[att.id].special2,
        0.8,
      );
      const cx = z.x + z.w / 2;
      const cy = z.y + z.h / 2;
      this.spawnFx(cx, cy, "burst", z.dmg);
      sfxPlay.heavy();
      sfxPlay.charDamage(def.id);
      if (def.hp <= 0) this.onKo(att, def);
    }
    this.zones = this.zones.filter((z) => z.life > 0);
  }

  pillarPulse(z: (typeof this.zones)[number]) {
    const att = z.owner;
    const def = att === this.f1 ? this.f2 : this.f1;
    const zoneBox = { x: z.x, y: z.y, w: z.w, h: z.h, foot: 0 };
    const heal = 2;
    if (overlap(zoneBox, this.hurtbox(att))) att.hp = Math.min(MAX_HP, att.hp + heal);
    const cx = z.x + z.w / 2;
    const n = this.reduced ? 4 : 10;
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: cx + (Math.random() - 0.5) * z.w,
        y: z.y + Math.random() * z.h,
        vx: (Math.random() - 0.5) * 40,
        vy: -40 - Math.random() * 80,
        life: 0.25 + Math.random() * 0.2,
        max: 0.45,
        size: 6 + Math.random() * 10,
        kind: "spark",
        tint: Math.random() < 0.5 ? "#fff6c8" : "#ffe14a",
      });
    }
    this.specialCallout(CHARACTERS[att.id].special, 0.28);
    if (def.state === "ko" || def.invuln > 0) return;
    const hurt = this.hurtbox(def);
    if (!overlap({ x: z.x, y: z.y, w: z.w, h: z.h, foot: 0 }, hurt)) return;
    if (def.shieldT > 0) {
      def.flash = 0.08;
      return;
    }
    this.hurtHp(def, z.dmg);
    def.flash = 0.08;
    def.stun = Math.max(def.stun, 0.12);
    this.addMeter(def, 1);
    if (def.state !== "hurt") {
      def.state = "hurt";
      def.pose = "hurt";
    }
    sfxPlay.hit();
    if (def.hp <= 0) this.onKo(att, def);
  }

  quakePulse(z: (typeof this.zones)[number]) {
    const att = z.owner;
    const def = att === this.f1 ? this.f2 : this.f1;
    this.spawnRockBurst(att.x + att.facing * 40, GROUND - 6, att.facing);
    sfxPlay.quake();
    rumble(att === this.f1 ? 0 : 1, 180, 0.7);
    rumble(att === this.f1 ? 1 : 0, 140, 0.45);
    this.trauma = Math.min(1, this.trauma + 0.22);
    this.specialCallout(CHARACTERS[att.id].special2, 0.55);
    if (def.state === "ko" || def.invuln > 0) return;
    const hurt = this.hurtbox(def);
    if (!overlap({ x: z.x, y: z.y, w: z.w, h: z.h, foot: 0 }, hurt)) return;
    const facingOk = def.facing === (def.x <= att.x ? 1 : -1);
    const guarding = def.state === "block" && facingOk && def.crouchGuard;
    const dir = att.facing;
    if (guarding) {
      def.vx = dir * 80;
      this.spawnGuardSmoke(def.x, GROUND - 50, dir);
      this.addMeter(def, METER_BLOCK_DEF);
      sfxPlay.block();
      return;
    }
    this.hurtHp(def, z.dmg);
    def.vx = dir * z.dmg * 18;
    def.vy = 320;
    def.y += 2;
    def.stun = 0.34;
    def.state = "hurt";
    def.pose = "hurt";
    def.atk = null;
    def.spec2Spawned = false;
    def.flash = 0.1;
    def.bleed = Math.min(1.4, def.bleed + 0.35);
    this.addMeter(def, METER_HIT_DEF);
    this.hitstop = 0.07;
    this.spawnFx(def.x, GROUND - 40, "burst", z.dmg);
    sfxPlay.heavy();
    sfxPlay.charDamage(def.id);
    if (def.hp <= 0) this.onKo(att, def);
  }

  tickParticles(dt: number) {
    for (const p of this.particles) {
      p.life -= dt;
      if (p.kind === "rock") {
        p.x += p.vx * dt;
        p.y -= p.vy * dt;
        p.vy -= 2400 * dt;
        p.vx *= Math.max(0, 1 - 1.1 * dt);
        if (p.y >= GROUND - 4) {
          p.y = GROUND - 4;
          p.vy *= -0.25;
          p.vx *= 0.45;
          if (Math.abs(p.vy) < 40) p.vy = 0;
        }
        continue;
      }
      if (p.kind !== "blood") {
        p.x += p.vx * dt;
        p.y -= p.vy * dt;
        continue;
      }
      if (p.stick) {
        p.x += p.vx * dt;
        p.vx *= Math.max(0, 1 - 7 * dt);
        continue;
      }
      p.x += p.vx * dt;
      p.y -= p.vy * dt;
      p.vy -= (p.frame === 1 ? 1800 : 2700) * dt;
      p.vx *= Math.max(0, 1 - 1.35 * dt);
      if (p.frame === 3) continue;
      if (p.y >= GROUND - 5) {
        p.y = GROUND - 5;
        if (p.frame === 1 || p.size < 1.8) {
          p.life = 0;
          continue;
        }
        p.stick = true;
        p.frame = 2;
        p.vy = 0;
        p.vx *= 0.1;
        p.size = Math.max(2.4, p.size * (1.1 + Math.random() * 0.9));
        p.life = 0.9 + Math.random() * 1.6;
        p.max = p.life;
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    if (this.particles.length > 280) this.particles.splice(0, this.particles.length - 280);
  }

  attackFrame(f: Fighter): HTMLImageElement | null {
    if (!this.images || !f.atk) return null;
    const ok = (im: HTMLImageElement | null | undefined) =>
      im && (im.naturalWidth || im.width) > 8 ? im : null;
    if (f.atk.pose.startsWith("jump") || f.atk.pose.startsWith("low")) {
      return ok(this.images[f.id][f.atk.pose]) ?? null;
    }
    const frames = this.images.anims[f.id][f.atk.id];
    if (!frames || frames.length === 0) return null;
    const t = f.atkT;
    const st = f.atk.startup;
    const ac = f.atk.active;
    const rec = f.atk.recover;
    const pick = (i: number) => ok(frames[Math.max(0, Math.min(frames.length - 1, i))]);
    if (f.atk.zone === "spin" && frames.length >= 4) {
      if (t < st) return pick(0);
      return pick(Math.floor((t - st) * 10) % 4);
    }
    if (f.atk.zone === "bat" && frames.length >= 4) {
      if (t < st) return pick(0);
      const cycle = 0.14;
      const local = (t - st) % cycle;
      return pick(Math.floor((local / cycle) * frames.length));
    }
    if ((f.atk.zone === "note" || f.atk.zone === "solo") && frames.length >= 2) {
      if (t < st) return pick(0);
      const n = Math.min(4, frames.length);
      return pick(Math.floor(Math.max(0, t - st) * 8) % n);
    }
    if (frames.length >= 6) {
      const total = st + ac + rec;
      return pick(Math.floor((t / Math.max(0.001, total)) * frames.length));
    }
    if (t < st * 0.45) return pick(0);
    if (t < st) return pick(Math.min(1, frames.length - 1));
    if (t < st + ac) return pick(Math.min(2, frames.length - 1));
    return pick(Math.min(3, frames.length - 1));
  }

  drawFighter(f: Fighter) {
    if (!this.images || !this.boxes) return;
    const slot = f === this.f1 ? 0 : 1;
    const bag = this.images[f.id];
    const anim = f.state === "attack" || (f.state === "win" && f.atk) ? this.attackFrame(f) : null;
    const pick = (im: HTMLImageElement | null | undefined) =>
      im && (im.naturalWidth || 0) > 8 ? im : null;
    const hold = this.replayHold[slot];
    const holdOk = hold && hold.id === f.id ? hold.img : null;
    const img = pick(anim) ?? pick(bag?.[f.pose]) ?? pick(bag?.idle) ?? pick(holdOk);
    if (!img) return;
    this.replayHold[slot] = { id: f.id, img };
    const idle0 = this.boxes[f.id]?.idle;
    const idle =
      idle0 && idle0.h > 8
        ? idle0
        : { x: 0, y: 0, w: img.naturalWidth || img.width, h: img.naturalHeight || img.height, foot: img.naturalHeight || img.height };
    const bob = f.state === "walk" ? Math.sin(this.time * 12) * 2 : 0;
    const body = 318 * Math.max(0.72, Math.min(1.22, f.squash || 1));
    let scale = body / Math.max(8, idle.h);
    if (f.pose === "jump") {
      const jumpBox = this.boxes[f.id].jump;
      if (f.id !== "isti" && jumpBox && jumpBox.h < idle.h * 0.82) {
        const closeUp = Math.min(1, idle.w / Math.max(1, jumpBox.w));
        scale *= Math.sqrt(closeUp);
      }
      if (f.id === "ricsi") scale *= 1.16;
      if (f.id === "farajo") scale *= 0.76;
    }
    if (f.id === "isti") {
      const zone = f.atk?.zone;
      if (zone === "meteor") {
        if (f.pose === "special") scale *= 1.32;
        else if (f.pose === "jump") scale *= 1.2;
        else if (f.pose === "special2") scale *= 1.2;
      } else if (zone === "stomp") {
        const total = (f.atk!.startup + f.atk!.active + f.atk!.recover) || 0.72;
        const i = Math.min(5, Math.floor((f.atkT / total) * 6));
        scale *= i === 1 ? 0.94 : 1.2;
      } else if (f.pose === "jump") {
        scale *= 1.12;
      } else if (f.pose === "jumpKickL" || f.pose === "jumpKickR") {
        scale *= 1.22;
      }
    }
    if (f.id === "gabi") {
      if (f.pose === "jumpKickR") scale *= 0.84;
      else if (f.pose === "jumpKickL") scale *= 1.1;
      else if (f.pose.startsWith("jump")) scale *= 0.9;
      if (f.pose.startsWith("low")) scale *= 0.88;
      else if (f.pose.startsWith("punch") || f.pose.startsWith("kick")) scale *= 0.9;
    }
    if (f.id === "farajo" && (f.pose.startsWith("jumpPunch") || f.pose === "punch" || f.pose.startsWith("punchL") || f.pose.startsWith("punchR"))) {
      scale *= 0.86;
    }
    if (f.id === "cica" && f.pose.startsWith("low")) scale *= 0.6;
    if (f.id === "cica" && (f.pose === "special" || (f.state === "attack" && f.atk?.pounce))) scale *= 0.68;
    if (f.id === "agi" && (f.pose.startsWith("low") || f.pose === "crouch")) scale *= 1.12;
    if (f.id === "hoffer" && (f.pose === "crouch" || f.pose.startsWith("low"))) scale *= 0.72;
    const crouchY = (() => {
      if (f.id === "agi" && (f.pose === "crouch" || f.pose.startsWith("low"))) return 1;
      if (f.id === "cricsi" && (f.state === "crouch" || (f.state === "block" && f.crouchGuard) || f.pose === "crouch" || f.pose.startsWith("low"))) return 1;
      if (f.id === "jezus" && (f.state === "crouch" || (f.state === "block" && f.crouchGuard) || f.pose === "crouch" || f.pose.startsWith("low"))) return 1;
      if (f.id === "hoffer" && (f.state === "crouch" || (f.state === "block" && f.crouchGuard) || f.pose === "crouch" || f.pose.startsWith("low"))) return 1;
      if (f.id === "isti" && (f.state === "crouch" || (f.state === "block" && f.crouchGuard) || f.pose === "crouch" || f.pose.startsWith("low"))) return 1;
      if (f.state === "crouch" || (f.state === "block" && f.crouchGuard)) return 0.8;
      return 1;
    })();
    const flip = f.state === "dash" ? f.dashDir : f.facing;
    let lunge = 0;
    let tilt = 0;
    if ((f.state === "attack" || f.state === "win") && f.atk) {
      const t = f.atkT;
      const st = f.atk.startup;
      const ac = f.atk.active;
      if (t < st) lunge = -10 * (t / st);
      else if (t < st + ac)
        lunge = f.atk.pounce
          ? 54
          : f.atk.id === "special"
            ? 46
            : f.atk.id === "special2"
              ? f.atk.zone === "cloud"
                ? -6
                : f.atk.zone === "quake"
                  ? 8
                  : 16
              : f.y > 4 || f.atk.low
                ? 12
                : 28;
      else lunge = f.y > 4 || f.atk.low ? 6 : 12;
      if ((f.atk.id === "kickR" || f.atk.id === "kickL") && f.y <= 4 && !f.atk.low) tilt = t < st + ac && t >= st ? -0.12 : -0.04;
      if (f.atk.id === "special" && t >= st && t < st + ac) tilt = f.atk.pounce ? -0.22 : -0.08;
    }
    if (f.state === "dash") lunge = 22;
    const ctx = this.ctx;
    if (f.state === "dash") {
      for (let i = 2; i >= 1; i--) {
        ctx.save();
        ctx.globalAlpha = (f.superDash ? 0.28 : 0.16) * i;
        ctx.translate(f.x - f.dashDir * i * 38 + flip * lunge, GROUND - f.y);
        ctx.scale(flip, crouchY);
        const ghost = f.superDash ? this.tintSprite(img, 232, 176, 24, 0.7) : img;
        ctx.drawImage(ghost, (-img.width * scale) / 2, -idle.foot * scale, img.width * scale, img.height * scale);
        ctx.restore();
      }
    }
    ctx.save();
    ctx.translate(f.x + flip * lunge, GROUND - f.y - bob);
    ctx.scale(flip, crouchY);
    ctx.rotate(tilt);
    if (f.pullT > 0) {
      ctx.filter = "brightness(0.92) saturate(0.65) sepia(0.15)";
    } else if (f.flash > 0) ctx.filter = "brightness(1.8) saturate(2.4) hue-rotate(-20deg)";
    else if (f.bleed > 0.15) ctx.filter = `sepia(${Math.min(0.7, f.bleed)}) saturate(2.4) hue-rotate(-18deg)`;
    if (f.state === "ko") ctx.rotate(-0.5);
    const dx = (-img.width * scale) / 2;
    let dy = -idle.foot * scale;
    if (f.id === "isti" && (f.pose === "crouch" || f.pose.startsWith("low"))) {
      dy = -img.height * scale;
    }
    const dw = img.width * scale;
    const dh = img.height * scale;
    if (f.superDash && f.state === "dash") {
      const pulse = 0.62 + 0.2 * Math.abs(Math.sin(this.time * 16));
      ctx.drawImage(this.tintSprite(img, 232, 176, 24, pulse), dx, dy, dw, dh);
    } else if (f.rageT > 0) {
      const pulse = 0.62 + 0.18 * Math.abs(Math.sin(this.time * 14));
      ctx.drawImage(this.tintSprite(img, 210, 8, 8, pulse), dx, dy, dw, dh);
    } else {
      ctx.drawImage(img, dx, dy, dw, dh);
    }
    ctx.filter = "none";
    ctx.restore();
    if (f.shieldT > 0) {
      const ctx2 = this.ctx;
      const pulse = 0.45 + Math.sin(this.time * 8) * 0.12;
      ctx2.save();
      ctx2.globalAlpha = Math.min(0.7, 0.25 + f.shieldT / 10) * pulse + 0.2;
      ctx2.strokeStyle = "#ffe566";
      ctx2.lineWidth = 4;
      ctx2.beginPath();
      ctx2.ellipse(f.x, GROUND - f.y - 130, 78, 150, 0, 0, Math.PI * 2);
      ctx2.stroke();
      ctx2.globalAlpha = 0.18;
      ctx2.fillStyle = "#fff6b0";
      ctx2.fill();
      ctx2.restore();
    }
  }

  tintSprite(img: HTMLImageElement, r: number, gch: number, b: number, alpha: number): HTMLCanvasElement {
    if (!this.rageBuf) this.rageBuf = document.createElement("canvas");
    const c = this.rageBuf;
    if (c.width !== img.width) c.width = img.width;
    if (c.height !== img.height) c.height = img.height;
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = `rgba(${r}, ${gch}, ${b}, ${Math.min(0.85, alpha)})`;
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = "source-over";
    return c;
  }

  drawTornado(f: Fighter) {
    const ctx = this.ctx;
    const t = this.time;
    const img = this.tornadoImg;
    ctx.save();
    ctx.translate(f.x, GROUND - f.y - 8);
    ctx.globalAlpha = 0.55 + Math.sin(t * 14) * 0.1;
    if (img && img.naturalWidth) {
      const w = 210;
      const h = 340;
      ctx.rotate(t * 8 * f.facing);
      ctx.drawImage(img, -w / 2, -h + 20, w, h);
      ctx.rotate(-t * 12 * f.facing);
      ctx.globalAlpha = 0.22;
      ctx.drawImage(img, -w * 0.55, -h + 30, w * 1.1, h * 0.95);
    } else {
      for (let i = 0; i < 5; i++) {
        const p = i / 5;
        ctx.beginPath();
        ctx.ellipse(0, -40 - p * 210, 28 + p * 70, 16 + p * 10, t * 6 + i, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(230,230,240,${0.35 - p * 0.05})`;
        ctx.lineWidth = 6 - i;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawShadow(f: Fighter) {
    const lift = f.y;
    const s = Math.max(0.35, 1 - lift / 420);
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${0.35 * s})`;
    ctx.beginPath();
    ctx.ellipse(f.x, GROUND + 8, 58 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawParticle(p: Particle) {
    const ctx = this.ctx;
    const a = Math.max(0, p.life / p.max);
    if (p.kind === "num") {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = "#efe6d0";
      ctx.font = "700 28px 'Barlow Condensed', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.text ?? "", p.x, p.y);
      ctx.restore();
      return;
    }
    if (p.kind === "smoke" || (p.kind === "spark" && p.tint === "#ffffff")) {
      ctx.save();
      const grow = 1 + (1 - a) * 1.6;
      ctx.globalAlpha = a * 0.72;
      ctx.fillStyle = p.tint ?? "#f4f4f4";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size * grow * 0.55, p.size * grow * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = a * 0.28;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(p.x - p.size * 0.12, p.y - p.size * 0.1, p.size * grow * 0.28, p.size * grow * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (p.kind === "rock") {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.tint ?? "#6b5340";
      ctx.translate(p.x, p.y);
      ctx.rotate((p.x + p.y) * 0.04);
      ctx.beginPath();
      ctx.moveTo(-p.size, p.size * 0.4);
      ctx.lineTo(p.size * 0.3, -p.size);
      ctx.lineTo(p.size, p.size * 0.2);
      ctx.lineTo(p.size * 0.1, p.size);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }
    if (p.kind === "blood") {
      ctx.save();
      const a = Math.max(0, p.life / p.max);
      const col = p.tint ?? "#8a0c1c";
      if (p.stick || p.frame === 2) {
        ctx.globalAlpha = Math.min(0.78, a);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * 1.35, Math.max(1.1, p.size * 0.28), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
      if (p.frame === 1) {
        ctx.globalAlpha = a * 0.75;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
      if (p.frame === 3) {
        const mag = Math.hypot(p.vx, p.vy) || 1;
        const len = p.size * 5.5;
        ctx.globalAlpha = a * 0.9;
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(1.2, p.size * 0.38);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.vx / mag) * len, p.y + (p.vy / mag) * len);
        ctx.stroke();
        ctx.restore();
        return;
      }
      const spd = Math.hypot(p.vx, p.vy);
      const ang = Math.atan2(-p.vy, p.vx);
      const stretch = Math.min(3.4, 1.1 + spd / 340);
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      ctx.globalAlpha = Math.min(1, a * 1.2);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * stretch, p.size * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = a * 0.32;
      ctx.fillStyle = "#e44552";
      ctx.beginPath();
      ctx.ellipse(p.size * 0.12, -p.size * 0.06, p.size * stretch * 0.32, p.size * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = p.kind === "clang" ? "#efe6d0" : "#c41c2b";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawZones() {
    const ctx = this.ctx;
    for (const z of this.zones) {
      if (z.kind !== "cloud") continue;
      const a = Math.max(0.32, Math.min(0.82, z.life / 1.55));
      const cx = z.x + z.w / 2;
      const cy = z.y + z.h * 0.58;
      ctx.save();
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = "#4a9a18";
      ctx.beginPath();
      ctx.ellipse(cx, cy, z.w * 0.52, z.h * 0.46, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = a * 0.7;
      ctx.fillStyle = "#7dce3a";
      ctx.beginPath();
      ctx.ellipse(cx - z.w * 0.12, cy - z.h * 0.08, z.w * 0.34, z.h * 0.3, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + z.w * 0.16, cy + z.h * 0.04, z.w * 0.28, z.h * 0.24, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = a * 0.4;
      ctx.fillStyle = "#d4f07a";
      ctx.beginPath();
      ctx.ellipse(cx - z.w * 0.08, cy - z.h * 0.16, z.w * 0.16, z.h * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const z of this.zones) {
      if (z.kind !== "ki") continue;
      const a = Math.max(0.25, Math.min(0.95, z.life / 0.45));
      const cx = z.x + z.w / 2;
      const cy = z.y + z.h / 2;
      const rx = z.w * 0.48;
      const ry = z.h * 0.42;
      ctx.save();
      ctx.globalAlpha = a * 0.35;
      ctx.fillStyle = "#fff8d0";
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = "#ffe14a";
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.72, ry * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.32, ry * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const z of this.zones) {
      if (z.kind !== "spit") continue;
      const a = Math.max(0.35, Math.min(0.9, z.life / 0.62));
      const cx = z.x + z.w / 2;
      const cy = z.y + z.h / 2;
      ctx.save();
      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle = "#1560c8";
      ctx.beginPath();
      ctx.ellipse(cx, cy, z.w * 0.55, z.h * 0.42, z.dir * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = a;
      ctx.fillStyle = "#5ec8ff";
      ctx.beginPath();
      ctx.ellipse(cx + z.dir * 6, cy - 3, z.w * 0.28, z.h * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const z of this.zones) {
      if (z.kind !== "note" || z.hit) continue;
      const imgs = this.noteImgs;
      const img = imgs[z.noteI ?? 0] ?? imgs[0] ?? this.noteImg;
      const cx = z.x + z.w / 2;
      const cy = z.y + z.h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(z.dir, 1);
      ctx.globalAlpha = Math.max(0.55, Math.min(1, z.life / 0.35));
      if (img && img.naturalWidth) ctx.drawImage(img, -32, -32, 64, 64);
      else {
        ctx.fillStyle = "#ffe14a";
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    for (const z of this.zones) {
      if (z.kind !== "brush" || z.hit) continue;
      const img = this.brushImg;
      const cx = z.x + z.w / 2;
      const cy = z.y + z.h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.time * 18 * z.dir);
      ctx.globalAlpha = Math.max(0.4, Math.min(1, z.life / 0.5));
      if (img && img.naturalWidth) {
        const s = 1.15;
        ctx.scale(z.dir, 1);
        ctx.drawImage(img, (-img.width * s) / 2, (-img.height * s) / 2, img.width * s, img.height * s);
      } else {
        ctx.fillStyle = "#f4f4f4";
        ctx.fillRect(-6, -34, 12, 50);
        ctx.fillStyle = "#1a2744";
        ctx.beginPath();
        ctx.ellipse(0, 22, 16, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    for (const z of this.zones) {
      if (z.kind !== "shot" || z.hit) continue;
      const cx = z.x + z.w / 2;
      const cy = z.y + z.h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(z.dir, 1);
      const a = Math.max(0.35, Math.min(1, z.life / 0.45));
      ctx.globalAlpha = a;
      const g = ctx.createLinearGradient(-28, 0, 36, 0);
      g.addColorStop(0, "rgba(255,180,40,0)");
      g.addColorStop(0.35, "rgba(255,230,120,0.85)");
      g.addColorStop(0.7, "rgba(255,255,255,1)");
      g.addColorStop(1, "rgba(255,80,40,0.2)");
      ctx.fillStyle = g;
      ctx.fillRect(-28, -4, 64, 8);
      ctx.fillStyle = "rgba(255,70,30,0.9)";
      ctx.beginPath();
      ctx.ellipse(30, 0, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const z of this.zones) {
      if (z.kind !== "pillar") continue;
      const a = Math.max(0.22, Math.min(0.85, z.life / 5));
      const cx = z.x + z.w / 2;
      const top = z.y;
      const bot = z.y + z.h;
      ctx.save();
      const g = ctx.createLinearGradient(cx, top, cx, bot);
      g.addColorStop(0, "rgba(255,255,255,0.05)");
      g.addColorStop(0.15, "rgba(255,244,180,0.55)");
      g.addColorStop(0.6, "rgba(255,220,80,0.35)");
      g.addColorStop(1, "rgba(255,200,40,0.08)");
      ctx.globalAlpha = a;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, bot - 8, z.w * 0.55, 18, 0, 0, Math.PI * 2);
      ctx.rect(z.x + 8, top, z.w - 16, z.h - 8);
      ctx.fill();
      ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = "#fffce8";
      ctx.fillRect(cx - 10, top, 20, z.h - 12);
      ctx.restore();
    }
    for (const f of [this.f1, this.f2]) {
      if (f.state !== "attack" || !f.atk || f.atk.zone !== "beam") continue;
      if (f.atkT < f.atk.startup || f.atkT > f.atk.startup + f.atk.active) continue;
      const hb = this.hitbox(f, f.atk);
      const pulse = 0.58 + Math.sin(this.time * 42) * 0.14;
      const mx = f.facing === 1 ? hb.x : hb.x + hb.w;
      const my = hb.y + hb.h * 0.5;
      const ex = f.facing === 1 ? hb.x + hb.w : hb.x;
      ctx.save();
      ctx.globalAlpha = pulse;
      const grd = ctx.createLinearGradient(mx, my, ex, my);
      grd.addColorStop(0, "#e8ff9a");
      grd.addColorStop(0.18, "#8fdc3a");
      grd.addColorStop(0.7, "#5aa818");
      grd.addColorStop(1, "rgba(90,180,20,0.02)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      const thick = hb.h * 0.55;
      ctx.moveTo(mx, my - 10);
      ctx.lineTo(ex, my - thick * 0.35);
      ctx.lineTo(ex, my + thick * 0.35);
      ctx.lineTo(mx, my + 10);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = pulse * 0.85;
      ctx.fillStyle = "#f3ffc2";
      ctx.beginPath();
      ctx.moveTo(mx, my - 4);
      ctx.lineTo(ex, my - thick * 0.12);
      ctx.lineTo(ex, my + thick * 0.12);
      ctx.lineTo(mx, my + 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  drawHudBars() {
    const ctx = this.ctx;
    const s = getHudScale();
    ctx.save();
    ctx.translate(W / 2, 0);
    ctx.scale(s, s);
    ctx.translate(-W / 2, 0);
    if (this.phase !== "replay") {
    const outline = (txt: string, x: number, y: number, align: CanvasTextAlign) => {
      ctx.textAlign = align;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#000";
      ctx.fillStyle = "#f3e6d0";
      ctx.strokeText(txt, x, y);
      ctx.fillText(txt, x, y);
    };
    const bar = (x: number, y: number, w: number, hp: number, flip: boolean) => {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x - 4, y - 4, w + 8, 28);
      ctx.fillStyle = "#3a1212";
      ctx.fillRect(x, y, w, 20);
      const ratio = hp / MAX_HP;
      ctx.fillStyle = ratio > 0.35 ? "#2db84d" : ratio > 0.15 ? "#e08a12" : "#c41c2b";
      const hw = (w * hp) / MAX_HP;
      if (flip) ctx.fillRect(x + w - hw, y, hw, 20);
      else ctx.fillRect(x, y, hw, 20);
      ctx.font = "700 15px 'Barlow Condensed', sans-serif";
      ctx.textBaseline = "middle";
      outline(`${Math.round(hp)}/${MAX_HP}`, flip ? x + w - 8 : x + 8, y + 10, flip ? "right" : "left");
    };
    bar(40, 28, 480, this.f1.hp, false);
    bar(W - 520, 28, 480, this.f2.hp, true);
    const meter = (x: number, y: number, w: number, m: number, flip: boolean) => {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x - 2, y - 2, w + 4, 10);
      ctx.fillStyle = "#2a2418";
      ctx.fillRect(x, y, w, 6);
      ctx.fillStyle = m >= 50 ? "#e2c15a" : "#8a7028";
      const mw = (w * Math.min(100, m)) / 100;
      if (flip) ctx.fillRect(x + w - mw, y, mw, 6);
      else ctx.fillRect(x, y, mw, 6);
      ctx.font = "700 13px 'Barlow Condensed', sans-serif";
      ctx.textBaseline = "middle";
      outline(`${Math.round(m)}/100`, flip ? x - 8 : x + w + 8, y + 3, flip ? "right" : "left");
    };
    meter(40, 52, 220, this.f1.meter, false);
    meter(W - 260, 52, 220, this.f2.meter, true);
    ctx.textBaseline = "alphabetic";
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, 40, 34, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(48, 48, 48, 0.62)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
    ctx.stroke();
    ctx.font = "800 36px 'Cinzel', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#000";
    const clock = this.training ? "∞" : String(Math.ceil(Math.max(0, this.timer)));
    ctx.strokeText(clock, W / 2, 41);
    ctx.fillStyle = "#f2e6c8";
    ctx.fillText(clock, W / 2, 41);
    ctx.restore();
    ctx.font = "700 18px 'Barlow Condensed', sans-serif";
    ctx.fillStyle = "#f3e6d0";
    ctx.textAlign = "left";
    ctx.fillText(CHARACTERS[this.f1.id].name, 44, 72);
    ctx.textAlign = "right";
    ctx.fillText(CHARACTERS[this.f2.id].name, W - 44, 72);
    const pips = (n: number, x: number, dir: number) => {
      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = i < n ? "#d4b06a" : "#3a2a22";
        ctx.beginPath();
        ctx.arc(x + dir * i * 22, 88, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    if (!this.training) {
      pips(this.f1.wins, 52, 1);
      pips(this.f2.wins, W - 52, -1);
    }
    if (this.combo >= 2) {
      ctx.fillStyle = "#f3e6d0";
      ctx.font = "800 28px 'Barlow Condensed', sans-serif";
      ctx.textAlign = this.comboSide === 2 ? "right" : "left";
      const cx = this.comboSide === 2 ? W - 40 : 40;
      ctx.fillText(`${this.combo} HIT COMBO`, cx, 122);
      if (this.comboName) {
        ctx.fillStyle = "#d4b06a";
        ctx.font = "700 20px 'Barlow Condensed', sans-serif";
        ctx.fillText(this.comboName, cx, 146);
      }
    }
    }
    ctx.restore();
    if (this.phase === "replay") {
      ctx.save();
      const bx = 16;
      const by = 16;
      const bw = 168;
      const bh = 40;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(bx, by, bw, bh);
      ctx.font = "800 32px 'Barlow Condensed', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const blink = 0.38 + 0.62 * (0.5 + 0.5 * Math.sin(performance.now() / 700));
      ctx.globalAlpha = blink;
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#000";
      ctx.fillStyle = "#e2c15a";
      ctx.strokeText("REPLAY", bx + bw / 2, by + bh / 2 + 1);
      ctx.fillText("REPLAY", bx + bw / 2, by + bh / 2 + 1);
      ctx.restore();
    }
    if (this.callout) {
      ctx.save();
      if (this.callout === "K.O." && this.koArt && this.koArt.naturalWidth > 8) {
        const iw = this.koArt.naturalWidth;
        const ih = this.koArt.naturalHeight;
        const tw = Math.min(W * 0.48, 500);
        const th = tw * (ih / iw);
        ctx.drawImage(this.koArt, W / 2 - tw / 2, H / 2 - th / 2, tw, th);
      } else {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, H / 2 - 50, W, 90);
        ctx.fillStyle = "#f3e6d0";
        ctx.font = "900 44px 'Cinzel', serif";
        ctx.textAlign = "center";
        ctx.fillText(this.callout, W / 2, H / 2 + 12);
      }
      ctx.restore();
    }
  }

  draw() {
    const ctx = this.ctx;
    const shake = this.phase === "replay" ? 0 : this.trauma * this.trauma * 14;
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;
    ctx.save();
    if (this.phase === "replay" && this.f1 && this.f2) {
      const total = this.replayCum.length ? this.replayCum[this.replayCum.length - 1]! : REPLAY_PLAY;
      const u = total > 0 ? Math.min(1, Math.max(0, 1 - this.finishT / total)) : 1;
      const zoom = 1 + 0.36 * Math.min(1, u / 0.14);
      const fx = (this.f1.x + this.f2.x) / 2;
      const fy = GROUND - (this.f1.y + this.f2.y) * 0.28 - 150;
      const vw = W / zoom;
      const vh = H / zoom;
      const cx = Math.max(vw / 2, Math.min(W - vw / 2, fx));
      const cy = Math.max(vh / 2, Math.min(H - vh / 2, fy));
      this.replayCamX += (cx - this.replayCamX) * 0.18;
      this.replayCamY += (cy - this.replayCamY) * 0.18;
      ctx.translate(W / 2 + sx, H / 2 + sy);
      ctx.scale(zoom, zoom);
      ctx.translate(-this.replayCamX, -this.replayCamY);
    } else {
      ctx.translate(sx, sy);
    }
    if (this.screen === "title" && this.menuBg && this.menuBg.naturalWidth) ctx.drawImage(this.menuBg, 0, 0, W, H);
    else if (this.stage && (this.stage.naturalWidth || 0) > 32) ctx.drawImage(this.stage, 0, 0, W, H);
    else {
      ctx.fillStyle = "#1a1210";
      ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = "rgba(12,8,6,0.10)";
    ctx.fillRect(0, 0, W, H);
    if (this.screen === "fight" || this.screen === "pause") {
      try {
        this.drawShadow(this.f1);
        this.drawShadow(this.f2);
        if (this.f1.x <= this.f2.x) {
          this.drawFighter(this.f1);
          this.drawFighter(this.f2);
        } else {
          this.drawFighter(this.f2);
          this.drawFighter(this.f1);
        }
        for (const p of this.particles) this.drawParticle(p);
        this.drawZones();
      } catch (err) {
        console.error("draw fight", err);
      }
    }
    ctx.restore();
    if (this.screen === "fight" || this.screen === "pause") this.drawHudBars();
  }

  pushHud() {
    const h: Hud = {
      screen: this.screen,
      p1: this.p1id,
      p2: this.p2id,
      hp1: this.f1.hp,
      hp2: this.f2.hp,
      meter1: this.f1.meter,
      meter2: this.f2.meter,
      wins1: this.f1.wins,
      wins2: this.f2.wins,
      timer: Math.ceil(Math.max(0, this.timer)),
      round: this.round,
      callout: this.callout,
      combo: this.combo,
      comboSide: this.comboSide,
      comboName: this.comboName,
      finish: this.phase === "finish",
      winner: this.winner,
      fatality: this.fatality,
      versusCpu: this.versusCpu,
      difficulty: this.difficulty,
      selectSlot: this.selectSlot,
      loading: !this.menuReady,
      loadPct: this.menuReady ? 1 : this.loadPct,
      vsLoading: this.screen === "vs" && !this.fightReady,
      vsLoadPct: this.vsLoadPct,
      pads: getPadCount(),
      stage: this.stageId,
      netWait: this.netWaiting && this.netWaitAt > 0 && performance.now() - this.netWaitAt > 220,
      training: this.training,
      dummy: this.dummy,
      trainMeter: this.trainMeter,
      p1Hist: this.p1Hist.slice(),
      p2Hist: this.p2Hist.slice(),
    };
    const key = `${h.screen}|${h.hp1}|${h.hp2}|${h.timer}|${h.callout}|${h.combo}|${h.wins1}|${h.wins2}|${h.selectSlot}|${h.winner}|${h.loading}|${Math.floor(h.loadPct * 1000)}|${h.vsLoading}|${Math.floor(this.vsLoadPct * 50)}|${h.pads}|${h.p1}|${h.p2}|${h.netWait}|${h.training}|${h.dummy}|${h.trainMeter}|${h.p1Hist.map((x) => x.id).join(",")}|${h.p2Hist.map((x) => x.id).join(",")}|${h.difficulty}`;
    if (key === this.hudKey) return;
    this.hudKey = key;
    this.onHud(h);
  }
}
