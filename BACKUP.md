# Sinter Kombat — biztonsági mentés

**Fájl:** `Sinter-Kombat-backup-2026-09-06-0726.zip`  
**Időpont:** 2026-09-06 07:26 CEST  
**Verzió:** v0.15  

**Állapot:** Gyakorló mód, input history (utolsó 10 gomb), Lázár János kódban/fájlokban de nincs a rosterben. CPU, HUD, menük.

Előző snapshot: `Sinter-Kombat-backup-2026-09-06-0625.zip`

GitHub: https://github.com/st0rmyka/sinter-kombat (privát)

## Mi van benne

Teljes játék: forrás (`src/`), sprite-ok, zene, SFX, pályák, script-ek, Electron héj, feltöltött referenciaképek, dokumentáció.

**Nincs benne:** `node_modules`, git, Vite cache, nyers generálási `artifacts`, screenshotok, korábbi zippek.

## Visszaállítás

1. Csomagold ki a zip tartalmát a projekt gyökerébe.
2. `npm install`
3. `npm run dev`
