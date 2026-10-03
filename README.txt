FitTogether V0.20.2

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

Neu in V0.20.2 – Installation:
- Originales FitTogether-Icon (Hantel + Verbindung), Launcher-Icons inklusive
  maskierbarem Icon sowie iPhone-Touch-Icon.
- Manifest mit stabiler App-ID, Scope und Start ohne Browserleiste.
- Einstellungen > FitTogether installieren: Installationsbutton, sobald der
  Browser die Installation anbietet; sonst Anleitung für das Browsermenü.
- iPhone: Safari > Teilen > Zum Home-Bildschirm.
- Installationsbereich folgt Deutsch/Englisch und erkennt den Standalone-Modus.
- Hintergrunddienst wird beim App-Start nicht mehr abgemeldet. Bestehende
  Push-Abonnements bleiben dadurch erhalten.
- Ohne Internet erscheint ein eigener Offline-Hinweis. Trainingsdaten und
  Anmeldung brauchen weiterhin Internet. Es werden keine privaten Fotos,
  API-Antworten oder Zugangsdaten im neuen Offline-Cache gespeichert.

Dieses Paket ist eine installierbare Web-App (PWA), keine APK/AAB und noch
keine Google-Play-Veröffentlichung. Der native Store-Schritt folgt separat.

Bereitstellen:
ZIP entpacken und Dateien inklusive pwa.js, offline.html und Icons in das
GitHub-Repository hochladen; die Verzeichnisstruktur beibehalten.
Keine SQL-Migration und keine neue Supabase-Konfiguration nötig.

Prüfung nach dem Hochladen:
1. App neu laden; Versionsanzeige V0.20.2 prüfen.
2. Einstellungen > FitTogether installieren öffnen und installieren.
3. Browser schließen, vom Homescreen starten: eigenes Icon, keine URL-Leiste.
4. Englisch/Deutsch im Installationsbereich prüfen.
5. Nach dem ersten Online-Start Flugmodus aktivieren, App erneut öffnen:
   Offline-Hinweis erscheint; Internet einschalten und Erneut versuchen.
6. Push-Test in den Einstellungen durchführen, App neu öffnen und erneut
   prüfen, dass das Push-Abonnement aktiv geblieben ist.
Die echte Geräteinstallation und Push-Zustellung müssen nach Deployment
auf dem Handy geprüft werden; die lokalen Tests simulieren Browserereignisse.

Neu in V0.20.2:
- Installationsaufforderung direkt beim Öffnen des Links, auch vor dem Login.
  Der Browserdialog wird durch den Installationsbutton gestartet, sobald
  der Browser die Installation anbietet. Sonst stehen die manuellen Schritte
  direkt in der Aufforderung. Im Browser fortfahren bleibt möglich.
- In der installierten App erscheint diese Aufforderung nicht.
- Neues schlichtes FT-Monogramm statt Hantel/Kette.
- Erinnerungseinführung: beide Buttons reagieren; Später schließt den Dialog,
  Aktivieren fordert die Freigabe an und startet die bestehende Push-Anbindung.
  Abgelehnte Berechtigungen liefern eine verständliche Rückmeldung.
- Installationsdialog und Erinnerungseinführung überlagern sich nicht.
- Nach erfolgreichem Login wird die Einführung ebenfalls geprüft.

Nach Upload prüfen: Link in Browser öffnen, Installationsaufforderung prüfen;
installierte App öffnen, Später testen und über Einstellungen Push aktivieren.
Falls das alte Launcher-Icon bleibt, die Homescreen-App entfernen und neu
installieren. Die OS-Icon-Aktualisierung ist browserabhängig.

Neu in V0.20.2:
- Browser-Link ist ausschließlich Downloadseite. Anmeldung und App-Ansichten
  sind im Browser verborgen; die normale App-Initialisierung startet nur im
  Standalone-Modus (Homescreen-App).
- Im Browser fortfahren wurde entfernt. Der Downloaddialog lässt sich nicht
  per Escape oder Zurück-Schließen in die App umgehen.
- Nach Installation bleibt die Downloadseite sichtbar und fordert zum Öffnen
  über das App-Icon auf. Installiert bedeutet nicht im App-Modus geöffnet.
- E-Mail-Recovery-Links dürfen weiterhin ausschließlich ihr Passwortformular
  öffnen. Danach kehrt der Browser zur Downloadseite zurück.
- Icon bleibt unverändert; Designentscheidung ist vertagt.

Nach Upload: Browser-Link öffnen, Installation anbieten lassen, installieren.
Die Browserseite darf danach weiterhin nur den Öffnungshinweis zeigen.
Erst der Start über das Homescreen-Icon zeigt Anmeldung und App-Inhalte.
