FitTogether V0.1
================

Starten auf Windows:
1. ZIP entpacken.
2. Im entpackten Ordner eine Eingabeaufforderung / PowerShell öffnen.
3. Ausführen:
      python -m http.server 8000
4. Im Browser öffnen:
      http://localhost:8000

Warum nicht einfach index.html doppelklicken?
Für Installation als PWA und Service Worker sollte die App über localhost oder HTTPS laufen.

Bereits enthalten:
- Offener Kalender: freie Titel, keine fest codierten Sportarten
- Datum, Start/Ende, Teilnehmer, Strafe, Notiz, wöchentliche Wiederholung
- Automatische Verpasst-Wertung nach Terminende
- Strafgeld-Tauziehen rot/blau
- Gemeinsamer Topf und Führungsanzeige
- Streaks und erledigte Termine
- Gewichtseinträge + Verlauf + 7-Tage-Trend
- Fortschrittsbilder privat/geteilt (lokal auf dem Gerät)
- Browser-Benachrichtigungen, solange die App aktiv ist
- Installierbare PWA-Grundlage

Noch NICHT in V0.1:
- Synchronisierung zwischen zwei Handys / Accounts
- Server-Datenbank / QR-Einladung
- zuverlässige Push-Benachrichtigungen bei komplett geschlossener App
- Trainingsfoto direkt als Nachweis eines Kalendereintrags
- monatliche automatische Fortschritts-Abfrage

Diese Punkte sind für die nächste Ausbaustufe vorgesehen.
