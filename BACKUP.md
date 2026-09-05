# Sinter Kombat — biztonsági mentés

**Fájl:** `Sinter-Kombat-backup-2026-09-05-2216.zip`  
**Időpont:** 2026-09-05 22:16 CEST  
**Állapot:** Jézus (idle + hangok: announcer, attack/damage/defeat, Fényoszlop, Védőgömb) + Cigányricsi, Vámpír Ági, Cica, Renike, Ricsi. Menü, mobile landscape, 45s kör, HP+70%.

Előző snapshot: `Sinter-Kombat-backup-2026-09-05-2214.zip` (Jézus, hangok előtt / részben).

## Mi van benne

Teljes játék: forrás (`src/`), sprite-ok, zene, SFX, pályák, script-ek, Electron héj, feltöltött referenciaképek, dokumentáció.

**Nincs benne:** `node_modules`, git, Vite cache, nyers generálási `artifacts`, screenshotok, korábbi zippek.

## Visszaállítás

1. Csomagold ki a zip tartalmát a projekt gyökerébe (írja felül a `src`, `public`, stb. mappákat).
2. `npm install`
3. `npm run dev`
