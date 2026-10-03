FitTogether V0.23.0

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

Neu in V0.20.3:
Deutsch/English-Auswahl direkt oben auf der Downloadseite. Alle Downloadtexte
wechseln sofort, auch der Hinweis nach Installation. Die Auswahl wird unter
der bestehenden Sprachpräferenz gespeichert und von der App übernommen.

Neu in V0.21.0 – sparsame Bild-Uploads:
- Neue Fortschrittsbilder werden vor Upload als JPEG verkleinert: längste
  Seite höchstens 1600 px, maximal 512 KiB. Trainingsnachweise höchstens
  1200 px und 256 KiB. Qualität und bei Bedarf Abmessungen werden angepasst.
- Seitenverhältnis bleibt erhalten, keine Ausschnitte, kleine Bilder werden
  nicht hochskaliert. Transparente Bereiche werden auf Weiß dargestellt.
- Verarbeitung passiert auf dem Gerät vor dem Upload. Originaldateien auf
  dem Handy bleiben unverändert; bereits gespeicherte Bilder bleiben bestehen.
- Nach erfolgreichem Upload zeigt die App ursprüngliche und gespeicherte Größe.
- Eingaben bis 32 MiB / 64 Megapixel. Unlesbare Bilder oder fehlgeschlagene
  Verarbeitung werden abgewiesen, statt große Originale heimlich hochzuladen.
- HEIC/HEIF funktioniert nur, wenn der Browser das Bild dekodieren kann;
  andernfalls erscheint eine verständliche Aufforderung, JPEG zu verwenden.
- Dateiendung und Content-Type entsprechen immer JPEG. Bestehende
  Storage-Buckets, Sichtbarkeit und Berechtigungen werden weiterverwendet.
- Doppel-Uploads und ein Wechsel von Account/Termin während der Verarbeitung
  werden vor dem Storage-Upload abgefangen. DB-Fehler bereinigen Uploads.

Bereitstellen: ZIP-Inhalt inklusive image-upload.js hochladen. Keine SQL-
Migration und kein kostenpflichtiger Kompressionsdienst notwendig. Die native
Canvas-Abhängigkeit ist nur für lokale Tests, nicht Teil der laufenden App.

Auf dem Handy prüfen: ein neues Fortschrittsbild und einen Trainingsnachweis
hochladen, Darstellung und Größenanzeige kontrollieren. Logo und echter
Passwortänderungstest sind weiterhin für später vorgesehen.

V0.22.0 – kurzes Tutorial
- Vier manuell weitergeschaltete Schritte auf Deutsch und Englisch.
- Einmal pro Konto und Gerät nach dem Anmelden angezeigt. Bestehende Konten
  sehen es nach diesem Update ebenfalls einmal. Abschluss/Überspringen wird
  lokal gespeichert; bei gelöschten App-Daten oder auf einem neuen Gerät erneut.
- Erneut öffnen: Einstellungen > So funktioniert’s > Tutorial öffnen.
- Abschluss führt ohne Gruppe zur Gruppenseite, sonst zum Kalender.
- Trainingserinnerungen werden erst nach dem Tutorial angeboten.
- Keine automatischen Abbuchungen: Strafgeld wird nur festgehalten.
- Neue Datei tutorial.js zusammen mit den übrigen Dateien hochladen.
- Handy-Check: Tutorial vor/zurück/überspringen, später erneut öffnen und
  Englisch prüfen. Es werden beim Tutorial keine Termine oder Bilder erstellt.

V0.23.0 – kompaktes Handy-Menü
- Bis 760 Pixel Bildschirmbreite ersetzt ein runder Menübutton rechts unten
  die bisherige Tab-Leiste. Am Computer bleibt die Leiste erhalten.
- Alle acht Bereiche im Menü, aktueller Bereich hervorgehoben.
- Auswahl, Schließen-Button, Escape/Zurück oder Tippen auf den Hintergrund
  schließen das Menü. Deutsch/Englisch folgt der App-Sprache.
- Safe-Area-Abstände; auf kleinen Displays kann das Menü gescrollt werden.
- Neue Datei mobile-nav.js ebenfalls hochladen.
- Handy-Check: alle Bereiche öffnen, Hintergrund antippen, Menü weit unten
  auf einer Seite öffnen, Sprache wechseln und Gerät drehen.
