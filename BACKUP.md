# Sinter Kombat — biztonsági mentés

**Fájl:** `Sinter-Kombat-backup-2026-09-06-0001.zip`  
**Időpont:** 2026-09-06 00:01 CEST  
**Verzió:** v0.13  

**Állapot:** Jézus + hangok, Cigányricsi, Vámpír Ági, Cica, Renike, Ricsi. CPU: Könnyű/Normál/Hard finomhangolva, **SZOPNI FOGSZ** max nehézség. Timer HUD kör, verziószám a bal alsó sarokban. Menü, mobile landscape, 45s kör, HP+70%.

Előző snapshot: `Sinter-Kombat-backup-2026-09-05-2216.zip`

GitHub: https://github.com/st0rmyka/sinter-kombat (privát)

## Mi van benne

Teljes játék: forrás (`src/`), sprite-ok, zene, SFX, pályák, script-ek, Electron héj, feltöltött referenciaképek, dokumentáció.

**Nincs benne:** `node_modules`, git, Vite cache, nyers generálási `artifacts`, screenshotok, korábbi zippek.

## Visszaállítás

1. Csomagold ki a zip tartalmát a projekt gyökerébe (írja felül a `src`, `public`, stb. mappákat).
2. `npm install`
3. `npm run dev`
