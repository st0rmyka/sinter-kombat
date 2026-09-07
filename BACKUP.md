# Sinter Kombat — biztonsági mentés

**Fájl:** `Sinter-Kombat-backup-2026-09-07-1124.zip`  
**Időpont:** 2026-09-07 11:24 CEST  
**Verzió:** v0.185  
**Git tag:** `v0.185.2`

**Állapot:** Endgame Victory Screen (ChatGPT art, Grok integráció). Workflow: ChatGPT grafika / Grok kód.

Előző snapshotok:
- `restore-2026-09-07-pre-major` — nagy változások előtti restore
- `Sinter-Kombat-backup-2026-09-07-0856.zip`
- `graphics-pack-2026-09-07` — grafikai ZIP ChatGPT-nek

GitHub: https://github.com/st0rmyka/sinter-kombat (privát)

## Mi van benne

Teljes játék: forrás (`src/`), sprite-ok, zene, SFX, pályák, victory art, script-ek, Electron héj, feltöltött referenciaképek, dokumentáció.

**Nincs benne:** `node_modules`, git, Vite cache, nyers generálási `artifacts`, screenshotok, korábbi zippek.

## Visszaállítás

1. Csomagold ki a zip tartalmát a projekt gyökerébe.
2. `npm install`
3. `npm run dev`

Vagy: `git checkout v0.185.2`
