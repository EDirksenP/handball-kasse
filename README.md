# Handball-Kasse – 3. Herren HSG Emden

Web-App für Mannschaftskasse, Getränke-/Guthabenbuchungen, Strafen, Termine
mit Zu-/Absagen und Fahrgemeinschaften, Zeitnahme und Schwarzes Brett.

Live: https://3hsg-emden-kasse.de

## Aufbau

- **Eine Datei:** Die komplette App steckt in `index.html` (React 18 und
  Firebase werden per `<script>` vom CDN geladen). Es gibt **keinen
  Build-Schritt** und keinen weiteren Quellcode – Änderungen werden direkt in
  `index.html` gemacht.
- **Daten:** Firebase Firestore (Projekt `handball-kasse`). Die Collections
  werden in der App live abonniert (`benutzer`, `spieler`, `eintraege`,
  `strafen`, `termine`, `getraenke`, `sonstiges`, `mannschaftskasse`,
  `zeitnahme`, `schwarzesbrett`, `strafenkatalog`, `stammdaten`).
- **Hosting:** Vercel, Konfiguration in `vercel.json` (statische Auslieferung,
  alle Pfade auf `index.html`).

## Deployment

- Jeder Push auf `main` wird von Vercel automatisch live geschaltet.
- Jeder andere Branch bzw. Pull Request bekommt eine Preview-URL.
  **Achtung:** Previews verwenden dieselbe Firestore-Datenbank wie die
  Live-App – Testbuchungen dort sind echte Daten.

## Lokal ansehen

Da es keinen Build gibt, reicht ein beliebiger statischer Webserver, z. B.:

```bash
python3 -m http.server 8000
```

Dann http://localhost:8000 öffnen. Auch lokal wird die echte Datenbank
verwendet.

## Bekannte Baustellen

- **Anmeldung:** Geplant ist die Umstellung auf Firebase Authentication mit
  Firestore Security Rules.
- **Zuordnung über Namen:** Spieler, Benutzer, Zusagen und Mitfahrer werden
  größtenteils über den Namen verknüpft. Umbenennungen können Verknüpfungen
  brechen.
