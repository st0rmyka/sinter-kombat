# SINTER KOMBAT — grafika + kód (Grok)

**Érvényes:** 2026-09-09-től. A user visszaadta a sprite-generálást Groknak
(ChatGPT-s pipeline felülírva).

## Szerepek

| Ki | Mit csinál |
|---|---|
| **Grok** | Sprite / anim / portrait / ikon generálás referencia alapján (`imagine_*`), chroma, bekötés, engine, hang, UI, bugfix |
| **User** | Brief, referenciafotó / sheet feltöltés, jóváhagyás, hangok |

## Karakter-sprite (a régi módszer)

1. A user feltölti a referenciát (sheet / fotó, több nézet ha van).
2. Grok **ebből** generál, nem „érzésre”. Konzisztencia: arc, haj, ruha, testarány — minden frame-en ugyanaz a karakter.
3. Nyers sprite **jobbra** néz. Tükrözés az engine dolga. Ne fordítsd el, hacsak a user nem kéri.
4. Egy pose javítása ≠ teljes karakter-újragenerálás. Csak azt a fájlt cseréld.
5. `spec2.png` ≠ `special2.png` ≠ `special20–25.png`.
6. Háttér: szürke/chroma kikerül, ne legyen lyukas a karakter (ne túl agresszív a szűrés).
7. Walk: valódi lépés (bal-jobb láb), ne 1 frame rezgés.
8. Crouch / low attack: ne nőjön meg a sprite, ne legyen idétlenül kicsi.
9. Bekötés ugyanabba a mappába: `public/sprites/{charId}/`, portrait, icon.

## Ha új karakter jön

Minden, ami a meglévőknek van: idle, walk0–3, crouch, jump, block, dash, hurt,
punch/kick + 4 frame, jump/low attackok, special, spec2, special2 0–5,
portré, arcközeli ikon, CHAR_ID, engine specialok, announcer később.

## Változatlan

- Lázár János nem megy vissza a rosterbe kérés nélkül.
- Kód-only promptnál ne generálj képet.

Részletek a fájlnevekről: `SINTER_KOMBAT_CHATGPT_DOKUMENTACIO.txt`
