# Sinter Kombat — biztonsági mentés

**Fájl:** `Sinter-Kombat-backup-2026-09-07-0856.zip`  
**Időpont:** 2026-09-07 08:56 CEST  
**Verzió:** v0.185  
**Git tag:** `restore-2026-09-07-pre-major`  
**Részletek:** [RESTORE_POINT.md](RESTORE_POINT.md)

**Állapot:** NAGY VÁLTOZÁSOK ELŐTTI restore pont. Játszható v0.185 + ChatGPT briefing.

Előző snapshot: `Sinter-Kombat-backup-2026-09-07-0529.zip` (tag v0.185.1)

GitHub: https://github.com/st0rmyka/sinter-kombat (privát)

## Mi van benne

Teljes játék: forrás (`src/`), sprite-ok, zene, SFX, pályák, script-ek, Electron héj, feltöltött referenciaképek, dokumentáció.

**Nincs benne:** `node_modules`, git, Vite cache, nyers generálási `artifacts`, screenshotok, korábbi zippek.

## Visszaállítás

1. Csomagold ki a zip tartalmát a projekt gyökerébe.
2. `npm install`
3. `npm run dev`

Vagy: `git checkout restore-2026-09-07-pre-major`
