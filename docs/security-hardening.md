# Security hardening übernehmen

Diese Änderungen gelten für das Vercel-Deployment von KrokenKompass. GitHub Pages ist keine aktive Auslieferungsplattform mehr. Vercel ist mit dem Repository verbunden und verwendet `main` als Production-Branch.

## Nach dem Merge

1. Den Branch nach `main` mergen und auf Vercel ein Production Deployment abwarten.
2. Vor dem Merge lokal `npm run test:security` und `npm run build` ausführen; dieselben Prüfungen laufen in der CI.
3. Die HTTP-zu-HTTPS-Weiterleitung und die Header der tatsächlichen Production-URL prüfen:

   ```powershell
   curl.exe -I http://kroken-kompass.vercel.app/
   curl.exe -I https://<production-domain>/
   ```

   Die HTTP-Anfrage muss mit `308` auf HTTPS weiterleiten. Die HTTPS-Anfrage muss erfolgreich antworten.
4. Erwartet werden mindestens:
   - `Content-Security-Policy`
   - `Permissions-Policy`
   - `Cross-Origin-Opener-Policy: same-origin-allow-popups`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
5. Die Anwendung im Browser öffnen und die Console prüfen. Es dürfen keine CSP-Fehler für Bulma, Leaflet, Turf, Vercel Insights, OpenStreetMap-Kacheln oder die lokalen Elm-/Map-Dateien erscheinen.
6. Die Startseite, Etagenwechsel, Routensuche und Karten-Popups prüfen. Ein Popup mit normalen Raumdaten muss lesbar sein; Werte mit `<`, `>`, Anführungszeichen oder HTML dürfen nicht als Markup ausgeführt werden.

## HSTS wird von Vercel verwaltet

Für die bestätigte Production-URL `https://kroken-kompass.vercel.app/` liefert Vercel bereits:

```text
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

Vercel stellt für die `vercel.app`-Domain automatisch TLS bereit und leitet HTTP-Anfragen auf HTTPS um. Deshalb wird `Strict-Transport-Security` nicht zusätzlich in `vercel.json` gesetzt. Ein eigener HSTS-Header wäre hier redundant und könnte bei späteren Plattformänderungen zu widersprüchlichen Richtlinien führen.

## Wenn die CSP verletzt wird

Eine CSP-Verletzung darf nicht pauschal durch `unsafe-eval`, `*` oder weitere breite Origins behoben werden. Die Console-Meldung muss zuerst dem konkreten Script, Stylesheet, Bild, Tile- oder Verbindungsziel zugeordnet werden. Danach ist nur die engste notwendige Direktive in `vercel.json` zu ergänzen und die Prüfung aus diesem Dokument erneut auszuführen.
