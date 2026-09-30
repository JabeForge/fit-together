FitTogether V0.19.8

Änderungen:
- Englisch für Achievements, Kalenderstatus, Datumsangaben, Kameratexte,
  Formulare, Platzhalter und Fehlermeldungen ergänzt.
- Übersetzungen starten auch nach DOMContentLoaded. Texte behalten ihre
  Originalfassung für den Wechsel Englisch -> Deutsch -> Englisch.
- Gruppen-, Profil- und Terminnamen werden nicht übersetzt.
- Passwort vergessen: Reset-Link per E-Mail auf dem Anmeldebildschirm.
- Passwort ändern in Einstellungen: aktuelles Passwort bestätigen,
  neues Passwort zweimal eingeben.
- Recovery-Links öffnen nach einer gültigen Supabase-Sitzung den Dialog
  zum Festlegen eines neuen Passworts.
- Zuverlässigkeitsmedaillen brauchen erledigte Trainings UND Erfolgsquote:
  Bronze: 10 / 80 %, Silber: 25 / 90 %, Gold: 50 / 95 %.
  Entschuldigte Termine helfen der Quote, zählen nicht als erledigte Trainings.
  Erreichte Stufen bleiben bei späteren verpassten Terminen erhalten; das Löschen
  oder Ändern historischer Termine führt weiterhin zu einer Neuberechnung.
- Führungsanzeige im Tauziehen zentriert; Jahresstatistik mit getrennten Zahlen.
- Benachrichtigungsstatus und Foto-Sichtbarkeit vollständig lokalisiert.
- Eigener übersetzter Foto-Auswahlbutton statt browserabhängiger Beschriftung.
- Monatsmedaillen zählen nur abgeschlossene Monate mit erledigten oder
  entschuldigten Terminen, keine laufenden Monate oder offenen Termine.
- Datum verwendet den lokalen Kalendertag statt UTC.

Installation / Prüfung:
1. Die App-Dateien wie bisher bereitstellen.
2. In Supabase Authentication > URL Configuration die Produktionsadresse
   https://jabeforge.github.io/fit-together/ als Site URL bzw. zulässige
   Redirect URL prüfen. Bei einem Hostingwechsel auch APP_URL anpassen.
3. Unter Authentication die Reset-E-Mail-Vorlage und den E-Mail-Versand prüfen.
4. Mit einem Testaccount Reset-E-Mail empfangen, Link öffnen, Passwort ändern
   und sich mit dem neuen Passwort anmelden. Auch einen abgelaufenen Link testen.
5. Für die lokalen Regressionstests: npm ci, npm run check, npm test.
   Tests verwenden einen simulierten Supabase-Client und verändern keine echten
   Accounts. E-Mail-Zustellung und produktive Auth-Konfiguration sind nicht
   durch diese Tests abgedeckt.

Für dieses Update ist keine SQL-Migration erforderlich.
