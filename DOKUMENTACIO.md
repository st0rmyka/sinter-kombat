# Kitchen Kombat — teljes dokumentáció

**Verzió:** 2026-09-04 15:56 (péntek — L1/R1 special2 snapshot)  
**Műfaj:** 2D verekedős (Mortal Kombat / Tekken hangulat)  
**Felbontás:** 1280×720, 60 fps fix timestep  
**Motor:** Canvas 2D + saját engine (`src/game/engine.ts`)  
**UI:** React 19 + TanStack Start + Tailwind, magyar nyelvű menük

Ez a fájl a játék **minden** rétegét leírja: játékmenet, irányítás, harc, hang, fájlok, sprite-pipeline, hogyan lehet bővíteni. Új gépen / új sandboxban ebből kell visszaépíteni.

---

## 1. Mi ez a játék

Kitchen Kombat egy kétjátékos (vagy játékos vs CPU) konyhai verekedős. Best-of-3 roundok, 99 másodperces timer, HP sáv, meter a specialhoz, kombók, vér, fatality.

Két harcos, mindkettő **valódi emberek fotóiból** készült sprite-okkal (nem kitalált karakter):

| ID | Név | Cím | Kinézet (KÖTELEZŐ, identitás) | L1 Special | R1 Special | Fatality |
|---|---|---|---|---|---|---|
| `renike` | RENIKE | A Rózsaszín Vihar | Szőke konty, dusty-rose / púderrózsaszín napiruha, mezítláb | **SERPENYŐ** | **BÜDI** (zöld felhő, nem blokkolható) | KITCHEN FATALITY |
| `ricsi` | RICSI | A Kopasz Kalapács | Kopasz, felsőtest mezítelen, sötétkék rövidnadrág, törzsi tetoválás a karon/vállon, mezítláb | **ÜVEGES** (borosüveg) | **HÁNYÓSUGÁR** (zöld sugár, nem blokkolható) | KITCHEN FATALITY |

A karakterkonzisztencia **szigorú**. Új sprite-ot csak a kanon fotókból szabad generálni:

- Renike: `attachments/Unknown-9.jpg` + `public/sprites/renike/idle.png`
- Ricsi: `attachments/Unknown-10.jpg` + `public/sprites/ricsi/idle.png`

Ne változtasd a ruhát, hajat, testalkatot. Magenta `#FF00FF` háttér, chroma-key a `scripts/process_fighter_sprite.py`-vel.

---

## 2. Menüfolyam

Képernyők (`Screen` típus az engine-ben):

```
title → select → stage → vs → fight ⇄ pause → result
                              ↘ finish → fatality → result
```

1. **Title** — Kitchen Kombat főmenü. CPU nehézség (easy/normal/hard), 1P vs CPU vagy (ha van 2. pad) 2P. Enter / Start.
2. **Select** — karakterválasztás. Először 1. játékos, utána 2. (CPU-nál a 2. slot a ellenfél). Bal/jobb: Renike / Ricsi.
3. **Stage** — pályaválasztó. Jelenleg **egy** pálya: Kitchen (Konyha). Enter indít.
4. **VS** — rövid versus kártya, utána round intro.
5. **Fight** — maga a meccs. Escape / Options = szünet.
6. **Result** — győztes, fatality felirat, „Új harc” vissza a title-re.

Meccs: 3 roundból 2 győzelem. Round elején `ROUND N` felirat + `RoundN_Fight.mp3`, majd `FIGHT`. KO után ha a győzelem meccset döntene: `FINISH HIM` / `FINISH HER`, special/ütés = fatality. Time over: több HP nyer.

---

## 3. Irányítás

### 3.1 Billentyűzet — 1. játékos

| Akció | Billentyű |
|---|---|
| Bal / jobb | A / D vagy nyilak |
| Ugrás | W, ↑, Space |
| Guggolás | S, ↓ |
| Bal ütés (Triangle) | **J** |
| Jobb ütés (Square) | **K** |
| Bal rúgás (Cross) | **N** |
| Jobb rúgás (Circle) | **M** |
| Special 1 (L1) | **L** (50 meter kell) |
| Special 2 (R1) | **;** vagy **'** (50 meter kell) |
| Blokk (R2) | Shift |
| Szünet | Escape / Enter |

### 3.2 Billentyűzet — 2. játékos

| Akció | Billentyű |
|---|---|
| Bal / jobb / fel / le | F / H / T / G |
| Ütések / rúgások | U / I / O / P |
| Special 1 (L1) | `[` |
| Special 2 (R1) | `]` |
| Blokk (R2) | `/` |

### 3.3 PS5 DualSense / DualShock (Gamepad API)

| Gomb | Akció |
|---|---|
| D-pad / bal bot | mozgás |
| △ Triangle (3) | bal ütés |
| □ Square (2) | jobb ütés |
| ✕ Cross (0) | bal rúgás |
| ○ Circle (1) | jobb rúgás |
| R2 (trigger 7) | blokk |
| **L1 (4)** | **special 1** (Renike: SERPENYŐ, Ricsi: ÜVEGES) |
| **R1 (5)** | **special 2** (Renike: BÜDI, Ricsi: HÁNYÓSUGÁR) |
| Options / Share | start / szünet |
| Dupla előre / hátra | dash (quickstep) |

A kiosztás **szándékosan** MK/Tekken-szerű, nem Street Fighter 6.

### 3.4 Mozgás szabályok

- Előre séta gyorsabb (`WALK_FWD = 460`), hátra lassabb (`WALK_BACK = 250`).
- Dupla-tap ugyanabba az irányba 0.28 s-en belül = **dash** (980 px/s, 0.18 s, 1 frame `dash.png` + afterimage).
- Ugrás: `JUMP_V = 1760`, gravitáció `GRAV = 5100` — elég magas, hogy **átugorjátok egymást**.
- Ha valaki a másik térfelére kerül, a facing **automatikusan megfordul** (klasszikus MK), kivéve attack/hurt/KO közben.
- Levegőben a testek **függőlegesen elcsúszhatnak** (`separate()` csak akkor tol, ha a hurtboxok függőlegesen is fedik egymást) — ezért lehet átugrani.

---

## 4. Harcrendszer

Minden támadás: **startup → active → recover**. Találat csak az active ablakban. Hit után **cancel** a `cancel` listán szereplő következő ütésre (combo). Buffer: 0.14 s.

### 4.1 Alapütések (állva)

| ID | Gomb | Dmg | Startup | Active | Recover | Knock | Hitbox (hx, hy, hw, hh) |
|---|---|---|---|---|---|---|---|
| punchL | J / △ | 6 | 0.05 | 0.06 | 0.14 | 70 | 48, 168, 78, 44 |
| punchR | K / □ | 10 | 0.08 | 0.08 | 0.16 | 150 | 54, 160, 92, 52 |
| kickL | N / ✕ | 12 | 0.10 | 0.08 | 0.18 | 190 | 56, 128, 110, 70 |
| kickR | M / ○ | 16 | 0.13 | 0.10 | 0.24 | 380 | 58, 108, 128, 86 |
| special | L / L1 | 26 | 0.18 | 0.14 | 0.30 | 560 | 42, 250, 188, 200 |
| special2 (Büdi) | ; / R1 | zóna | — | — | — | — | zöld felhő, **nem blokkolható**, ugrással védhető |
| special2 (Hányósugár) | ; / R1 | zóna | — | — | — | — | zöld sugár, **nem blokkolható**, guggolással védhető |

Special **50 metert** fogyaszt (mindkettő). Meter **csak** bevitt találatból vagy leblokkolt támadásból töltődik (magától **nem**). Találat +12 támadónak; blokk +4 támadónak / +8 védőnek. Roundok között a meter megmarad.

A hitbox `hy` a talajtól fölfelé mért teteje: `y = GROUND - f.y - hy`.

### 4.2 Jump attack

Levegőben (`y > 4`) a négy támadógomb **jump attack**. Special a levegőben **nem** megy. **Egy** légi támadás / ugrás (`airAtk` flag, landoláskor reset).

Sprite-ok: `jumpPunchL/R.png`, `jumpKickL/R.png` (1 frame, nem a 4 frame-es álló anim).

Hitbox: kicsit nagyobb, magasabban (`hy` kick 150 / punch 175, `hh` 320 / 280).

Rajzoláskor a jump sprite-ok **close-up korrekciót** kapnak (az ugró fotók közelibbek, mint az idle), plusz Ricsi sima `jump` póza `× 1.16`, hogy ne legyen túl kicsi.

### 4.3 Low attack

**Guggolva** (`↓` / S tartva) + bármelyik a 4 támadógomb = **low**. Special nem low.

- Sprite: `lowPunchL/R.png`, `lowKickL/R.png` (már guggoló póz, 1 frame).
- Hitbox lent: `hy` ~52–62, `hh` ~48–58.
- Dmg ≈ 90%-a az állóénak.
- Hurtbox guggolva / low attack / crouch-block alatt **155 px** magas (álló 250) — a fej alacsonyabb.

### 4.4 Blokk (Tekken-szerű high/low)

| Támadás | Álló blokk (Shift, nem guggol) | Guggoló blokk (↓ + Shift) | Csak guggol, nincs Shift |
|---|---|---|---|
| Álló / jump / special | **véd** | **véd** | **nem véd, kapja** |
| **Low** | **NEM véd, kapja** | **véd** | **nem véd, kapja** |

Régen a sima guggolás is „blokkolt” — ez **bug volt, ki van javítva**. Guggolás önmagában nem véd.

Blokkoláskor:

- kevesebb knockback (25%)
- blockstun
- meter a védőnek
- **fehér füst** (`spawnGuardSmoke`) a találat pontján — kis pufik + fehér spark, mint Tekkenben
- nincs vér, nincs HP vesztés

Facing: háttal állva a blokk nem működik (meg kell nézni a támadót).

### 4.5 Kombók

A chain az utolsó N ütés. Leghosszabb illeszkedő route nyer. Combo scaling: `max(0.4, 1 - 0.12 * priorHits)`.

| Név | Sorrend | Bónusz |
|---|---|---|
| MOSOGATÓ | punchL, punchR, kickL, kickR | +10 |
| KONYHAI VIHAR | punchL, punchR, kickR, special | +14 |
| SERPENYŐ LÁNCOLAT | punchL, punchR, special | +10 |
| DUPLA JAB | punchL, punchL, punchR | +6 |
| FAZOSS | punchL, kickL, kickR | +8 |
| KERESZT | punchL, punchR, kickR | +7 |

Cancel-lánc: punchL → szinte minden; punchR → kickek + special; kickL → kickR/punchR/special; kickR → special; special → semmi.

### 4.6 KO, Finish, Fatality

- HP 0 → hurt + felrepülés, `ricsi_defeat` / `renike_defeat`, vér.
- Ha a győzelem 2. round-win lenne: `FINISH HIM/HER` 4.2 s-ig. Winner megnyom egy támadást → fatality (special anim, extra knock, felirat).
- Különben `X WINS` / `FLAWLESS VICTORY` (ha a vesztes 100 HP-n volt ütés nélkül… a kód a vesztes HP==100-at nézi a roundWin-ben).
- Time over: nagyobb HP nyer, döntetlen ha egyenlő.

---

## 5. Fizika és rajzolás

- Világ: `W=1280`, `H=720`, talaj `GROUND=668`.
- Fix step `1/60`, delta cap 0.05.
- Hitstop: sima 0.05 s, special 0.11 s. Trauma = camera shake.
- Squash: jump land 0.84, hit 1.16, visszasimul `dt*10`.
- Sprite canvas: általában 520×780, láb `FOOT_Y=749`. Kick/jump/low lehet **szélesebb** canvas, hogy a rúgó láb ne vágódjon le.
- Rajzolás: `scale = 318 / idle.h`, láb a talajon. Crouch idle a `block` póz `×0.8` squashel. Low attack sprite már guggol, nem kap extra 0.8-at.
- Jump sprite close-up: `scale *= sqrt(idle.w / jump.w)`. Ricsi `jump` plusz `×1.16`.
- Vér: directional spray (mist, csepp, streak, padlófolt), sötét-piros tint paletta.

---

## 6. Hang

Web Audio API (`src/game/audio.ts`). Első gesztusra `unlockAudio()`. Mute a jobb felső gomb.

### 6.1 Kör bemondó

Round start, amikor a `ROUND N` kiírás megy:

- `public/sfx/Round1_Fight.mp3`
- `public/sfx/Round2_Fight.mp3`
- `public/sfx/Round3_Fight.mp3`

### 6.2 Hit SFX (random, nem ismétlődik egymás után)

`hit1–6.mp3`, `hit8–10.mp3` (nincs hit7). Találatkor, enyhe pitch variáció.

### 6.3 Karakterhangok

Támadáskor (gomb lenyomva, nem a hit): random attack grunt, előző voice leáll.

| | Attack | Damage | Defeat |
|---|---|---|---|
| Ricsi | attack1–4 | damage1–4 | `ricsi_defeat.mp3` |
| Renike | attack1–3 | damage1–3 | `renike_defeat.mp3` |

### 6.4 Pályazene

Kitchen: `public/music/kitchen.mp3` (**Neon Verekedés**). Loop, meccs végéig megy, `stopStageMusic()` result/főmenü. Volume 0.48.

Title menüben kis oscillator „drone” (55 Hz), meccs indításakor leáll.

### 6.5 Szintetikus (nincs feltöltött fájl)

Block, KO, win, fatality, dash: rövid `beep()` oscillator. A blokk **vizuálja** a füst, a hangja még a régi beep.

Új SFX bekötése: tedd `public/sfx/`-be, vedd fel a megfelelő poolba `audio.ts`-ben, hívd `sfxPlay.*`-ot az engine-ből.

---

## 7. Fájlszerkezet

```
src/game/
  engine.ts      ← teljes játéklogika (állapotgép, harc, rajz, CPU)
  audio.ts       ← Web Audio, SFX poolok, stage BGM
  input.ts       ← billentyű + DualSense + virtuális (touch) + injectKeys
  GameView.tsx   ← React overlay: menük, HUD, touch pad, mute, help

public/
  sprites/renike|ricsi/*.png
  sfx/*.mp3
  music/kitchen.mp3
  stages/kitchen.jpg
  portraits/renike.png, ricsi.png

scripts/process_fighter_sprite.py   ← magenta chroma + láb-illesztés
scripts/build-mac-app.mjs           ← natív Mac .app
desktop/                            ← Electron/desktop héj

attachments/   ← EREDETI feltöltések (fotók, nyers mp3-ak) — NE TÖRÖLD
```

### Sprite fájlnevek (mindkét karakterre ugyanaz)

Álló/mozgás: `idle`, `walk0–3`, `jump`, `block`, `dash`, `hurt`  
Álló ütés 4 frame: `punchL0–3`, `punchR0–3`, `kickL0–3`, `kickR0–3`, `special0–3`  
plusz „hold” frame: `punchL.png` stb.  
Jump: `jumpPunchL/R`, `jumpKickL/R`  
Low: `lowPunchL/R`, `lowKickL/R`

A loader `?v=20` cache bust. Új sprite után emeld a `bust` stringet `engine.ts` `load()`-jában.

---

## 8. Sprite pipeline (új animáció)

1. Generálj **egyetlen** full-body póz képet magenta `#FF00FF` háttérrel, identity lock a kanon fotóra.
2. Teljes test + végtagok **bent** a képben, bőven margó (különben levágja a lábat).
3. Feldolgozás:

```bash
python3 scripts/process_fighter_sprite.py <raw.jpg> public/sprites/<id>/<pose>.png [target_h]
```

- Alap `target_h = 640` (álló magasság).
- Jump attack: ~560–600.
- Low (guggoló): ~500, hogy rövidebb legyen, mint az idle.
- Széles rúgásnál a script **kinyitja a canvas szélességét**, a láb `y=749`-re kerül.

4. Vedd fel a `Pose` unióba + `poses[]` a `load()`-ban + `JUMP_POSE` / `LOW_POSE` ha kell.
5. `attackFrame()`: a `jump*` és `low*` pózok **1 frame**-esek, nem a 4-es anim tömb.

**Ne** skálázd a standing idle-t a jump/low PNG-ben — a draw kód hozza méretre.

---

## 9. CPU

`cpu(dt)` az engine-ben. Aggro: easy 0.35 / normal 0.6 / hard 0.85.

- Távol: közelít, ritkán dash.
- Közel: random ütés, ~18% low kick.
- Ha te támadsz: blokkol; ha a támadásod `low`, guggolva blokkol.
- Ritka ugrás a támadás alól.

2P módban (`versusCpu = false`) a 2. játékos `sampleP2()`.

---

## 10. Futtatás

Böngésző (Vite, port 8080 a sandbox preview-hoz):

```bash
npm install
npm run dev
```

Typecheck: `npm run typecheck`

Mac .app: `scripts/build-mac-app.mjs` + `desktop/`. A sandbox Linux, a natív Mac binárist ott kell összerakni, ahol van Darwin toolchain.

---

## 11. Teszt hookok (Playwright / debug)

`window.__controlsTest`:

- `skipToFight()`, `playAs("renike"|"ricsi")`
- `setKeys(["ArrowDown","KeyN"])` — inject
- `getPose()`, `getState()`, `getX()`, `getY()`, `getFacing()`
- `fillMeter()`, `sprayBlood()`, `getLastRoundSfx()`

Példa: guggolva low kick = `ArrowDown` tartva + `KeyN`.

---

## 12. Hogyan bővítsd (gyors receptek)

**Új pálya:**  
`STAGES` + `StageId` + kép `public/stages/<id>.jpg` + `MUSIC_FILES` + a stage select UI a `GameView.tsx`-ben (jelenleg egy kártya). `startStageMusic(id)` a `beginMatch`-ben már stageId alapján megy.

**Új SFX:** fájl `public/sfx/`, pool `audio.ts`, hívás `sfxPlay`.

**Új karakter:** nagy munka — `CharId`, CHARACTERS, teljes sprite készlet, voice pool, portrait, `load()` mindkét bag. Identitás lock.

**Új combo:** elem a `COMBOS` tömbbe.

**Overhead (jump beat crouch block):** most a jump attackot a crouch-block is véd. Ha overhead kell: `blocked` feltételnél `air && crouchGuard → false`.

---

## 13. Fontos viselkedési döntések (ne rontsd el)

1. Low **csak** guggoló blokkal védhető.
2. Sima guggolás **nem** blokk.
3. Jump attack 1× / ugrás.
4. Facing flip térfélcsere után, attack közben zárolva.
5. Átugrás: vertical overlap kell a pushhoz.
6. Kitchen zene loop, meccs végéig.
7. Round SFX a `ROUND N` kiíráskor, nem a Fight-nál.
8. Karakterhang támadáskor a gombnál, damage a hitnél, defeat a KO/time-over vesztésnél.
9. Sprite láb soha ne lógjon le a canvas aljáról — inkább szélesebb canvas.
10. Jump/low méret: ne az idle-nál óriás, ne minifigura. A close-up korrekció + Ricsi 1.16 ezt tartja.
11. **L1 és R1 KÉT KÜLÖN GOMB.** L1 = serpenyő / borosüveg (`special0–3.png`). R1 = Büdi / Hányósugár (`special20–25.png` + `spec2.png`). **A `special2.png` a serpenyős/üveges 3. frame — NE ÍRD FELÜL.**
12. Meter **csak** bevitt vagy leblokkolt támadásból töltődik, magától soha.
13. Büdi nem blokkolható, ugrással / dash-sel ki lehet belőle menni. Hányósugár nem blokkolható, guggolással alá lehet menni.

---

## 14. Ami szándékosan még nincs / félig van

- Csak **egy** pálya (Kitchen), de a stage menü már megvan a következőkhöz.
- Block hangja még oscillator, nem feltöltött SFX.
- Nincs külön crouch-idle sprite (a `block` póz 0.8-as).
- Nincs overhead szabály (jump vs crouch).
- Nincs throw / grab.
- Hit7.mp3 nincs a packban (1–6, 8–10).

---

## 15. Mentés tartalma (ez a zip: 2026-09-04 15:56)

Fájl: `Kitchen-Kombat-backup-2026-09-04-1556.zip`

A zip **nem** tartalmazza:

- `node_modules/` (visszaállításkor `npm install`)
- `.git/`, Vite cache, `dist/`
- `artifacts/` (nyers Imagine kimenet)
- `screenshots/`
- korábbi `.zip` mentéseket
- a 97 MB-os `attachments/23GEPBsWYBFvhvyM-grok-workspace.zip` belső sandbox zipet

Tartalmazza: `src/`, `public/` (sprite + zene + SFX + pálya), `scripts/`, `server/`, `desktop/`, `assets/sprites/`, `attachments/` (eredeti fotók + hangok, beleértve Unknown-9…12), `package.json` + `package-lock.json`, ezt a dokumentumot.

**Visszaállítás (sandbox / új gép):**

1. Csomagold ki a zipet a projekt gyökerébe (felülírja a `src`, `public`, stb. mappákat).
2. `npm install`
3. `npm run dev` — a játék `0.0.0.0:8080`-on indul.

**Ne nyúlj hozzá:** `public/sprites/*/special2.png` = L1 3. frame (serpenyő / üveg). Az R1 fallback a `spec2.png`.

---

## 16. Online (Host / Join, LAN)

Főmenü → **Online**.

- **Host:** lobby ezen a gépen. Kiírja a LAN IP-ket (`/api/net/info`). Vár a Joinra.
- **Join:** beírja a Host IP-jét (`192.168.x.x` vagy `ip:port`).
- Lobby: karakterválasztás + **Ready**. Ha mindketten Ready, indul a VS, majd a harc.
- Netcode: 3 frame delay-lockstep (`src/game/net.ts`). Minden gép a saját 1P gombjait nyomja (Host = P1, Join = P2). A `special2` bit is megy a packben.
- WebSocket: `ws(s)://IP:PORT/kk-net` ugyanazon a HTTP porton (Vite 8080, Electron 27111).
- Ugyanaz a Wi‑Fi: megy. Nyers internetes IP: tűzfal/NAT miatt gyakran nem.
- Windows (Electron) build ugyanazt a netcode-ot viszi.
- Ha a másik kilép: drop, vissza a főmenü.

---

## 17. Második special (R1) — Büdi / Hányósugár

Két **külön** gomb, két **külön** sprite-készlet. Az L1-es serpenyő/üveg **sértetlen**.

| | L1 (`special`) | R1 (`special2`) |
|---|---|---|
| DualSense | L1 (pad 4) | R1 (pad 5) |
| 1P billentyű | L | ; vagy ' |
| 2P billentyű | [ | ] |
| Renike | SERPENYŐ — `special0.png` … `special3.png` | BÜDI — `special20.png` … `special25.png`, pose fallback `spec2.png` |
| Ricsi | ÜVEGES — `special0.png` … `special3.png` | HÁNYÓSUGÁR — `special20.png` … `special25.png`, pose fallback `spec2.png` |
| Költség | 50 meter | 50 meter |
| Blokkolható? | igen | **nem** (unblockable) |
| Védelem | sima / guggoló blokk | Renike: **ugrás / dash** ki a felhőből. Ricsi: **guggolás** a sugár alá |

Engine: `SPECIAL2_FART` / `SPECIAL2_PUKE` az `engine.ts`-ben. A felhő `zones[]` (késleltetett arm + `jumped` flag). A sugár magas hitbox, guggolva alatta maradsz.

**Sprite-szabály (NE keverd):**

- `special.png`, `special0–3.png` → L1. **`special2.png` = L1 3. frame. TILOS felülírni.**
- `special20–25.png` + `spec2.png` → R1. A pose loader szándékosan `spec2.png`-re mapeli a `"special2"` póznevet, hogy ne üsse az L1 frame-et.

R1 sprite forrás (kanon, a user feltöltötte):

- Renike Büdi: `attachments/Unknown-11.jpg`
- Ricsi Hányósugár: `attachments/Unknown-12.jpg`

---

## 18. Korábbi mentés

`Kitchen-Kombat-backup-2026-09-04.zip` (12:12) = állapot **a special2 / L1-R1 szétválasztás előtt**. Ezt a 15:56-os zipet használd, ha a Büdi / Hányósugár + serpenyő/üveg együtt kell.