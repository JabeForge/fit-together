FitTogether V0.19

Neu:
- Achievement-System mit Bronze / Silber / Gold.
- Jede Achievement-Karte zeigt höchste erreichte Medaille + aktuellen Fortschritt zur nächsten Stufe.
- Bereits erreichte Stufen bleiben durch historische Bestwerte erhalten, auch wenn eine laufende Streak später zurückgesetzt wird.
- Achievements:
  Durchgezogen: 10 / 50 / 100 erledigte Trainings
  Zuverlässig: 80 / 90 / 100 % Erfolgsquote
  Streak: 2 / 4 / 12 perfekte Trainingswochen
  Auf Kurs: 2,5 / 5 / 10 kg Fortschritt
  Keine Ausreden: 1 / 3 / 6 Monate ohne verpassten Termin
  Zeitraffer: 5 / 13 / 26 Fortschrittsbilder
- Erweiterte 30-Tage-Statistik.
- Mehrpersonen-Gruppen verwenden weiterhin die bereits vorhandene Rangliste statt des 2-Personen-Tauziehens.
- Fortschrittsfoto-Erinnerung jetzt alle 14 Tage statt alle 30 Tage.
- Kein neues Supabase-SQL nötig.

Hinweis:
- Zuverlässigkeit nutzt für die aktuell sichtbare Leiste die letzten 30 Tage.
- Die höchste Zuverlässigkeits-Medaille wird aus den besten historischen Monatswerten abgeleitet.
- Streak und „Keine Ausreden“ berechnen aktuelle und historische Bestserien aus den vorhandenen Termindaten.
