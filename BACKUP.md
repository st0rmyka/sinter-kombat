# Sinter Kombat — biztonsági mentés

**Fájl:** `Sinter-Kombat-backup-2026-09-06-0106.zip`  
**Időpont:** 2026-09-06 01:06 CEST  
**Verzió:** v0.13  

**Állapot:** Frissítések menü, szünet Újraindítás, Jézus Szent Aura áthaladás, Irányítás csak a két aktuális karakter. CPU: Könnyű/Normál/Hard + SZOPNI FOGSZ. Timer HUD, verziószám.

Előző snapshot: `Sinter-Kombat-backup-2026-09-06-0001.zip` (GitHub release `v0.13`)

GitHub: https://github.com/st0rmyka/sinter-kombat (privát)

## Mi van benne

Teljes játék: forrás (`src/`), sprite-ok, zene, SFX, pályák, script-ek, Electron héj, feltöltött referenciaképek, dokumentáció.

**Nincs benne:** `node_modules`, git, Vite cache, nyers generálási `artifacts`, screenshotok, korábbi zippek.

## Visszaállítás

1. Csomagold ki a zip tartalmát a projekt gyökerébe (írja felül a `src`, `public`, stb. mappákat).
2. `npm install`
3. `npm run dev`
