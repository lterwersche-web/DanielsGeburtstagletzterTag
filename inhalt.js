// ================================================================
//  INHALT – hier änderst du alle Texte, Fotos und die Musik.
//  An app.js und style.css musst du nichts anfassen.
//
//  Regeln, damit nichts kaputtgeht:
//  • Texte immer in "Anführungszeichen"
//  • Nach jedem Eintrag ein Komma
// ================================================================

window.INHALT = {
  // Ab wann darf Papa die Animation sehen? (Uhrzeit auf seinem Handy)
  // Vorher sieht er nur die Sperre mit Countdown.
  // Testen kannst du jederzeit mit ?test am Ende vom Link.
  freischaltung: "2026-12-31T00:00:00",

  // Musik: MP3 in den Ordner "musik" legen und den Dateinamen hier eintragen.
  musik: "musik/song.mp3",

  // Was Papa sieht, wenn er zu früh scannt
  sperre: {
    titel: "Noch nicht, Papa 😏",
    text: "Tag 8 öffnet sich erst an Silvester.",
    klein: "Komm am 31.12. wieder.",
  },

  // Der Startbildschirm (mit dem Knopf, damit die Musik starten darf)
  start: {
    oben: "Tag 8 · Silvester 2026",
    titelKlein: "Für",
    titelGross: "Papa",
    knopf: "Los geht's",
    hinweis: "Ton an 🔊 · Handy hochkant",
  },

  // Die ersten Sätze, nacheinander
  einleitung: [
    "Sieben Tage lang hab ich Danke gesagt.",
    "Aber dafür reichen keine sieben Zettel.",
    // "Weißt du noch …?",   ← erstmal raus (// davor = wird übersprungen)
  ],

  // Wie lange jedes Foto zu sehen ist (in Sekunden)
  sekundenProFoto: 7,

  // Deine Fotos: Datei in den Ordner "bilder" legen und hier eintragen.
  // jahr  = große goldene Zahl über dem Foto
  // text  = handgeschriebener Satz unter dem Foto (kurz halten!)
  // ausschnitt (optional) = welcher Teil vom Foto zu sehen ist,
  //            z. B. "50% 20%" wenn Köpfe oben abgeschnitten werden
  fotos: [
    { datei: "bilder/01.jpg", jahr: "2015", text: "Dein Satz zu Foto 1" },
    { datei: "bilder/02.jpg", jahr: "2016", text: "Dein Satz zu Foto 2" },
    { datei: "bilder/03.jpg", jahr: "2017", text: "Dein Satz zu Foto 3" },
    { datei: "bilder/04.jpg", jahr: "2018", text: "Dein Satz zu Foto 4" },
    { datei: "bilder/05.jpg", jahr: "2019", text: "Dein Satz zu Foto 5" },
    { datei: "bilder/06.jpg", jahr: "2020", text: "Dein Satz zu Foto 6" },
    { datei: "bilder/07.jpg", jahr: "2021", text: "Dein Satz zu Foto 7" },
    { datei: "bilder/08.jpg", jahr: "2022", text: "Dein Satz zu Foto 8" },
    { datei: "bilder/09.jpg", jahr: "2023", text: "Dein Satz zu Foto 9" },
    { datei: "bilder/10.jpg", jahr: "2024", text: "Dein Satz zu Foto 10" },
    { datei: "bilder/11.jpg", jahr: "2025", text: "Dein Satz zu Foto 11" },
    { datei: "bilder/12.jpg", jahr: "2026", text: "Dein Satz zu Foto 12" },
  ],

  // Kurz alle Fotos zusammen als Wand – leer lassen ("") für keinen Text
  wand: "Und das sind nur ein paar davon.",

  // Die Fotos zerfallen zu einem Herz – diese Sätze stehen darunter
  herz: [
    "Für jeden Moment, in dem du für mich da warst.",
    "Und für alle, die noch kommen.",
  ],

  // Vor dem Countdown 3 … 2 … 1
  countdown: "Bereit für 2027?",

  // Das große Finale mit Feuerwerk
  finale: {
    zeile1: "DANKE", // Feuerwerk-Schrift, Zeile 1
    zeile2: "PAPA", //  Feuerwerk-Schrift, Zeile 2
    neujahrKlein: "Frohes neues Jahr",
    neujahrGross: "2027", // Feuerwerk-Schrift
    wunsch: "Hör nie auf,\ndu zu sein, Papa.", // \n = neue Zeile
    wunschKlein: "", // optionaler kleiner Satz darunter, "" = keiner
    absender: "Hab dich lieb, dein Lutz",
    nochmal: "Nochmal ansehen",
  },
};
