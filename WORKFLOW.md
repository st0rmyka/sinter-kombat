# SINTER KOMBAT — ChatGPT / Grok munkamegosztás

**Érvényes:** 2026-09-07-től. Alapértelmezett workflow. Nem opcionális.

## Szerepek

| Ki | Mit csinál |
|---|---|
| **ChatGPT** | Minden grafikai asset: sprite, anim frame, portrait, ikon, pálya/menü háttér, FX art |
| **Grok** | Implementáció: engine, logika, roster, hang bekötés, mapping, bugfix, CPU, UI flow |
| **User** | Közvetítő: ChatGPT-től letölti a PNG-ket, átadja Groknak |

## Grok: mit NE

- Ne generálj sprite-ot, portrét, ikont, stage/UI hátteret, effect artot (`imagine_*` TILOS ehhez a projekthez, hacsak a user **külön** nem kéri hogy Grok csinálja).
- Ne találj ki „helyettesítő” kinézetet a referencia helyett.
- Ne nyúlj más sprite-okhoz, ha csak egy pose-t kértek.
- Vegyes promptnál: bontsd szét. Grafika = várakozás. Kód = te, amikor megjöttek a fájlok.

## Ha új karakter / sprite / háttér jön

1. Nyugtázd a tervet (név, specialok, mappa, CHAR_ID).
2. Listázd, milyen PNG-kre van szükség (`public/sprites/{id}/…`, portrait, icon).
3. **Állj.** Ne generálj képet.
4. Amikor a user átadja a ChatGPT-s asseteket: tedd a helyükre, chroma ha kell, kösd be, cache bust.

## Ha CSAK kód / bug / hang / AI / menü

Dolgozz azonnal. Nincs várakozás.

## Változatlan projekt-szabályok

- Karakterkonzisztencia a referencia + idle.png alapján.
- Nyers sprite **jobbra** néz; a tükrözés az engine dolga.
- `spec2.png` ≠ `special2.png` ≠ `special20–25.png`.
- Lázár János nem megy vissza a rosterbe kérés nélkül.
- Ha a user csak képet kér (és ChatGPT csinálja), Grok a kódhoz nem nyúl.

Részletek: `SINTER_KOMBAT_CHATGPT_DOKUMENTACIO.txt`
