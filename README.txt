FitTogether V0.19.2 – Graph + Gym-Kamera Fix

Gewichtsgraph:
- Messpunkte liegen jetzt in einer eigenen Leiste UNTER dem Graphen.
- Klick auf einen Punkt zeigt Datum und Gewicht direkt darunter.
- Rote vertikale Linie markiert den ausgewählten Messpunkt im Graphen.
- Y-Achse ist einstellbar:
  Automatisch = ruhiges 25-kg-Fenster.
  Eigener Bereich = Minimum/Maximum frei setzen; Standardvorschlag 85–100 kg.
- Einstellung bleibt auf dem Gerät gespeichert.

Gym-Nachweis:
- Bild auswählen öffnet nur Galerie/Dateiauswahl.
- Bild aufnehmen nutzt jetzt eine In-App-Kamera (getUserMedia), statt die externe Kamera-App zu öffnen.
- Dadurch sollte FitTogether beim Fotografieren nicht neu geladen werden.
- Das Foto wird direkt im Browser erzeugt und als Nachweis verwendet.
- Fallback: Falls die In-App-Kamera nicht unterstützt wird, Bild auswählen nutzen.

Kein neues Supabase-SQL nötig.
Alle Dateien aus dem ZIP auf GitHub ersetzen.
