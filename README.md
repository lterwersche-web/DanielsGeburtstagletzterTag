# Für Papa · Tag 8 (Silvester)

Die letzte Seite vom Silvester-Kalender: Papa scannt den QR-Code und sieht eine
Animation mit Fotos, einem Herz aus Erinnerungen und einem Feuerwerk-„DANKE PAPA“.

**Link:** https://lterwersche-web.github.io/DanielsGeburtstagletzterTag/
**Zum Testen (ohne Sperre):** https://lterwersche-web.github.io/DanielsGeburtstagletzterTag/?test

## Ablauf (~3 Minuten)

1. **Sperre:** Vor dem 31.12. sieht Papa nur „Noch nicht, Papa 😏“ und einen Countdown.
2. **Start:** Ein Knopf, damit das Handy die Musik abspielen darf.
3. **Einleitung:** drei kurze Sätze.
4. **Fotos:** die Polaroids fliegen nacheinander rein, mit Jahreszahl und Satz.
5. **Herz:** alle Fotos zerfallen in Pixel und fliegen zu einem schlagenden Herz.
6. **Countdown:** 3 … 2 … 1, dann explodiert das Herz.
7. **Finale:** Feuerwerk-Schrift „DANKE PAPA“, dann „Frohes neues Jahr 2027“, zum Schluss eure Botschaft.

## Was du ändern kannst

Alles steht in **`inhalt.js`**: Texte, Fotos, Musik und das Datum der Sperre.

| Was | Wo |
| --- | --- |
| Fotos | Dateien in den Ordner `bilder/`, dann in `inhalt.js` bei `fotos` eintragen |
| Musik | MP3 in den Ordner `musik/`, Name in `inhalt.js` bei `musik` |
| Texte | direkt in `inhalt.js` |

## Szenen einzeln testen

- `?test&szene=fotos`: startet direkt bei den Fotos
- `?test&szene=herz`: startet beim Herz
- `?test&szene=finale`: startet beim Feuerwerk

## Dateien

- `index.html`: das Grundgerüst der Seite
- `style.css`: das Design (Farben, Schriften, Polaroids)
- `app.js`: die Animation (Sterne, Herz, Feuerwerk, Ablauf)
- `inhalt.js`: **deine Inhalte**
- `qr-code.png` / `qr-code.svg`: der QR-Code zum Ausdrucken
