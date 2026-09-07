# SINTER KOMBAT — VISSZAÁLLÍTÁSI PONT

**Időpont:** 2026-09-07 08:56 CEST  
**Címke:** `restore-2026-09-07-pre-major`  
**Játékverzió:** v0.185  
**Git commit (ezután a tag):** lásd `git rev-parse restore-2026-09-07-pre-major`  
**Repo:** https://github.com/st0rmyka/sinter-kombat  
**Release zip:** `Sinter-Kombat-backup-2026-09-07-0856.zip`

Ez a pont **A NAGY VÁLTOZÁSOK ELŐTT** készült. Ha gebasz van, IDE TÉRJ VISSZA.
Ne keverd a későbbi WIP-pel.

## Miért van ez

A tulajdonos (Richárd) erős, nagy változtatásokat indít. Ez a snapshot a
stabil, játszható állapot: menük, 7 karakter, 3 pálya, hangok, CPU, Super Dash,
gyakorló, beállítások, mobil, dokumentáció.

## Visszaállítás GitHubról

```bash
git fetch origin
git checkout restore-2026-09-07-pre-major
# vagy kemény reset a mainre (VIGYÁZAT, eldobja a WIP-et):
# git checkout main && git reset --hard restore-2026-09-07-pre-major
```

Zipből: csomagold ki a release assetet a projekt gyökerébe, `npm install`, `npm run dev`.

## Stabil állapot (amit vissza kell kapni)

- **Roster (CHAR_IDS):** renike, ricsi, cica, agi, cricsi, jezus, hoffer
- **Lázár János:** fájlok megvannak, NINCS a rosterben (rework kell)
- **Pályák:** kitchen, sintertanya, kisterenye (saját zenék)
- **Kör:** 45 mp, HP 170, special 50, Super Dash 40, spam scaling 35%-ig
- **CPU:** blokkolóra is támad, Jézus specialozik, SZOPNI FOGSZ a max nehézség
- **Hang:** loading + „NYOMJ MEG EGY GOMBOT” gesztus; menüzene folyamatos title/select/stage
- **Select:** Főmenü gomb, mobilon két koppintás
- **Hoffer:** dühroham vörös overlay + max 13% önsebzés; GYERE IDE 3 mp, nincs buborék
- **Super Dash:** L2, arany overlay
- **Dokumentáció ChatGPT-nek:** `SINTER_KOMBAT_CHATGPT_DOKUMENTACIO.txt`

## Kulcsfájlok

- `src/game/engine.ts` — harc, AI, sprite, HUD
- `src/game/GameView.tsx` — menük
- `src/game/audio.ts` / `input.ts` / `settings.ts` / `net.ts`
- `public/sprites/`, `public/sfx/`, `public/music/`, `public/stages/`, `public/ui/`
- `scripts/process_fighter_sprite.py`, `scripts/process_hoffer.py`

## AI-nek (Grok / ChatGPT)

A `SINTER_KOMBAT_CHATGPT_DOKUMENTACIO.txt` a teljes agy-dump erről az állapotról.
Sprite-csapdák (spec2.png vs special2.png), identitás, hangnevek ott vannak.

Ha a nagy változás után vissza kell állni: **ne toldd a WIP-et**, reseteld
erre a tagre, majd a zippel ellenőrizd a `public/` asseteket.
