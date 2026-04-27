# Mika Dierks · Portfolio

Tech-orientiertes, minimalistisches Portfolio mit Dark Mode, Featured-Project und Demo-Videos.

## Inhalte bearbeiten

Alle Inhalte liegen zentral in `src/content.js`.

- `person`: Name, Rolle, Hero-Statement, Quick Facts
- `projects`: Projektkarten (modular)
- `skills`: Stack/Bereiche
- `contact`: E-Mail, Telefon, Intro

## Projektschema

```js
{
  title: "Projektname",
  tagline: "1-2 Saetze, knackig.",
  category: ["AI", "Desktop"],     // steuert Filter
  stack: ["C++", "Python"],         // Chips in der Karte
  featured: false,                   // true = grosses Hero-Project
  wip: false,                        // true = "in progress" Badge
  cover: "linear-gradient(...)",    // Fallback wenn kein Video
  mediaLabel: "PROJEKT",
  videoUrl: "./assets/videos/demo.mp4",
  videoType: "video/mp4"
}
```

Hinweise:
- Genau **ein** Projekt sollte `featured: true` haben.
- Videos werden bei Hover automatisch abgespielt (autoplay nur fuer Featured).
- Ohne Video erscheint der Gradient-Cover mit `mediaLabel`.

## CV / Lebenslauf

Lege deine PDF als `assets/lebenslauf.pdf` ab. Sie wird im "CV"-Block direkt im Browser angezeigt und ist als Download verfügbar.

## Videos

Lege Demo-Clips in `assets/videos/` ab. Empfohlen: 10-20s Loops, kein Audio, MP4 / H.264.

## Lokal starten

```bash
npx serve .
```
