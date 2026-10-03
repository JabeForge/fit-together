# FitTogether: nächste Schritte

## Account-Löschung

Vor der Implementierung wird das vollständige Supabase-Datenbankschema mit
Fremdschlüsseln und RLS-Regeln benötigt. Im Repository liegt nur das Push-SQL.
Insbesondere muss geklärt werden, wie Gruppen und Termine nach dem Löschen
ihres Erstellers erhalten bleiben und wem ihre Verwaltung übertragen wird.

Die Löschung muss serverseitig den eingeloggten Nutzer prüfen. Ein Admin-Key
gehört nie in app.js. Zugehörige Storage-Dateien müssen über die Storage-API
entfernt werden; SQL-Löschungen der Bilddatensätze allein entfernen die Dateien
nicht. Auch Sitzungen, Mitgliedschaften, Einladungen und Push-Abos berücksichtigen.
Die Funktion anschließend mit einem entbehrlichen Testaccount prüfen.

## Weitere Produktarbeit

- Zwei Geräte / zwei Testaccounts: Status-Synchronisierung, Wiederholungen und
  Nachweis-Upload durchspielen.
- Achievement-Gestaltung verbessern; dauerhafte Medaillen benötigen eine
  eigene serverseitige Historie. Aktuell werden Medaillen aus den vorhandenen
  Trainings-, Foto- und Gewichtsdaten berechnet.
- Push-Sprache serverseitig pro Nutzer berücksichtigen. Der vorhandene
  Reminder-Server sendet noch deutsche Texte und braucht dafür eine gespeicherte
  Sprachpräferenz mit passender Migration.
- Persönliche Speicherlimits festlegen; Foto-Komprimierung ist seit V0.21.0 umgesetzt.
- Android-Paket, native Benachrichtigungen, Kamera, App-Links und Store-Testphase.
- Datenschutz-/Löschinformationen, Store-Beschreibung und Marketing vorbereiten.
- Preis und Zahlungsabwicklung nach einem Nutzungstest festlegen.
