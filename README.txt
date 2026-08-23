FitTogether V0.17.1 – Push registration fix

- Vollständige V0.17-Oberfläche; Versionsanzeige jetzt V0.17.1.
- Der normale Glocken-Button registriert nach Erlaubnis auch das echte Web-Push-Abo.
- Wenn Benachrichtigungen bereits erlaubt sind, wird die fehlende Push-Subscription beim Start automatisch nachgetragen.
- Beim ersten Start erscheint ein eigener FitTogether-Dialog mit „Benachrichtigungen aktivieren“.
  Der Systemdialog wird erst nach diesem echten Nutzer-Klick geöffnet (browserkompatibel).
- Push-Einstellungen bleiben unter Einstellungen verfügbar.
- Aktueller VAPID Public Key ist enthalten.
- Kein neues SQL nötig; vorhandene push_subscriptions-Tabelle und Backend-Konfiguration werden weiterverwendet.

Wichtig: Für GitHub Pages ALLE Dateien dieses ZIPs hochladen/ersetzen, nicht nur app.js.
