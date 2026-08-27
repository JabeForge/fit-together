FitTogether V0.19.4 – gemeinsame Terminstatus

Neu:
- Jeder Teilnehmerstatus wird am Termin klar einzeln angezeigt:
  ✅ Erledigt / ❌ Verpasst / 🩹 Entschuldigt / 🕒 Geplant.
- Bei „Verpasst“ wird direkt die zugehörige Termin-Strafe angezeigt.
- Die bestehende Supabase Edge Function wurde erweitert:
  Abgelaufene Termine werden serverseitig für ALLE Teilnehmer geprüft.
- Ein noch „Geplant“ stehender Teilnehmer wird nach Terminende automatisch auf „Verpasst“ gesetzt,
  auch wenn diese Person die App nicht geöffnet hat.
- Funktioniert auch für wiederkehrende Termine innerhalb eines 30-Tage-Catch-up-Fensters.
- Die App-seitige eigene Auto-Missed-Logik bleibt als zusätzlicher Fallback erhalten.

Kein neues SQL nötig.
Die Edge Function muss mit dem beiliegenden supabase_edge_function/index.ts aktualisiert werden.
