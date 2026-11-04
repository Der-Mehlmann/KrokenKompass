KrokenKompass implementiert ein mehrschichtiges Sicherheitskonzept für das statische **Vercel-Deployment** (`main` als Production-Branch; GitHub Pages wird nicht mehr als Auslieferungsplattform genutzt). Es umfasst **HTTP-Security-Header & Content-Security-Policy (CSP)**, **XSS-sicheres DOM-Rendering für Karten-Popups**, **Subresource Integrity (SRI)** für externe CDN-Ressourcen sowie **automatisierte Regressionstests** in der CI-Pipeline.

---

## 🛡️ 1. HTTP-Security-Header & Content-Security-Policy (`vercel.json`)

Alle Antworten unter `/(.*)` werden über [`vercel.json`](https://github.com/Der-Mehlmann/KrokenKompass/blob/main/vercel.json) mit folgenden Sicherheits-Headern ausgeliefert:

| HTTP-Header | Konfigurierter Wert | Schutzzweck |
| :--- | :--- | :--- |
| **`Content-Security-Policy`** | Siehe Aufschlüsselung unten | Beschränkt erlaubte Quellen für Skripte, Stylesheets, Bilder, Fonts, Netzwerkverbindungen und verbietet Frames/Plugins. |
| **`Permissions-Policy`** | `accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=(), xr-spatial-tracking=()` | Deaktiviert nicht benötigte Browser- und Sensor-APIs explizit. |
| **`Cross-Origin-Opener-Policy`** | `same-origin-allow-popups` | Isoliert den Browsing-Kontext (`window.opener`) gegenüber fremden Origins. |
| **`X-Content-Type-Options`** | `nosniff` | Verhindert MIME-Type-Sniffing durch den Browser. |
| **`X-Frame-Options`** | `SAMEORIGIN` | Schützt vor Clickjacking durch Einbettung in fremde `<iframe>`-Elemente. |
| **`Referrer-Policy`** | `strict-origin-when-cross-origin` | Überträgt bei Cross-Origin-Anfragen nur den Origin (zusätzlich per `<meta name="referrer">` in `index.html` gesetzt). |

### Aufschlüsselung der `Content-Security-Policy`

```text
default-src 'self';
base-uri 'self';
object-src 'none';
frame-ancestors 'self';
form-action 'self';
script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;
img-src 'self' data: https://cdnjs.cloudflare.com https://tile.openstreetmap.org;
font-src 'self' data:;
connect-src 'self' https://vitals.vercel-insights.com;
frame-src 'none';
```

* **`script-src`**: Erlaubt lokale Skripte (`'self'`: `elm.js`, `popup-content.js`, `map-view.js` sowie `/_vercel/insights/script.js` und `/_vercel/speed-insights/script.js`), die Initialisierungs-Inline-Blöcke in `index.html` (`'unsafe-inline'`) sowie `https://cdnjs.cloudflare.com` (Turf.js `6.5.0` und Leaflet `1.9.4`). Kein `'unsafe-eval'`.
* **`style-src`**: Erlaubt `style.css` (`'self'`), Inline-Styles (`'unsafe-inline'`), Bulma `1.0.4` (`https://cdn.jsdelivr.net`) und Leaflet-CSS (`https://cdnjs.cloudflare.com`).
* **`img-src`**: Erlaubt lokale Logos/Icons (`'self'`), `data:`-URIs, Leaflet-Marker-Assets (`https://cdnjs.cloudflare.com`) sowie die OpenStreetMap-Kartenkacheln (`https://tile.openstreetmap.org`).
* **`connect-src`**: Erlaubt das Laden der lokalen GeoJSON-/Graph-Dateien (`'self'`: `Data/graph.json`, `Data/vsp_units.json`, `Data/vsp_etage_*.json`) sowie Telemetrie-Endpunkte von Vercel (`https://vitals.vercel-insights.com`).
* **`object-src 'none'` & `frame-src 'none'`**: Blockiert jegliche Flash-/Plugin-Objekte und eingebettete Frames.

### HSTS-Verwaltung durch Vercel (`Strict-Transport-Security`)

Für die Production-Domain `https://kroken-kompass.vercel.app/` stellt Vercel automatisch TLS bereit, leitet HTTP-Anfragen mit Status `308` auf HTTPS um und setzt plattformseitig:

```text
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

Deshalb wird `Strict-Transport-Security` **nicht** zusätzlich in `vercel.json` definiert. Ein manuell duplizierter Header in `vercel.json` wäre redundant und könnte bei Plattformänderungen zu widersprüchlichen Richtlinien führen (dies wird durch `tests/security-hardening.test.js` explizit geprüft).

---

## 🔒 2. XSS-Schutz in Karten-Popups (`Code/frontend/popup-content.js`)

Beim Klick auf ein Raum-, Tür- oder Flur-Polygon in der Leaflet-Karte zeigt `Code/frontend/map-view.js` den Raumnamen (`properties.name`) und die Nutzungsart (`properties.use_type`) aus den GeoJSON-Daten in einem Popup an.

Um **DOM-basiertes Cross-Site-Scripting (XSS)** über manipulierte GeoJSON-Eigenschaften auszuschließen, verzichtet `map-view.js` auf String-Interpolation mit HTML-Parsing und übergibt stattdessen ein über `Code/frontend/popup-content.js` erzeugtes DOM-Element an `layer.bindPopup(...)`:

```javascript
// Code/frontend/popup-content.js
function erstelleSicherenPopupInhalt(properties) {
    const popup = document.createElement('div');
    const name = document.createElement('span');
    const type = document.createElement('span');

    name.textContent = properties?.name || '-';
    type.textContent = ` (${properties?.use_type || '-'})`;
    popup.append(name, type);

    return popup;
}
```

* **Sichere Textbindung (`textContent`):** Durch die Zuweisung an `Node.textContent` werden Sonderzeichen wie `<`, `>`, `"` oder `'` vom Browser garantiert als reiner Text behandelt und niemals als ausführbares HTML/JavaScript interpretiert.
* **Cache-Busting:** `Code/backend/inject_version.js` aktualisiert bei jedem Build automatisch den Query-Parameter `popup-content.js?v=<commitHash>` in `index.html`.

---

## 🔗 3. Subresource Integrity (SRI) für externe CDN-Abhängigkeiten

Alle in `index.html` über externe CDNs eingebundenen Bibliotheken sind mit kryptografischen **`sha384`-Integritäts-Hashes** (`integrity="..."` und `crossorigin="anonymous"`) abgesichert, sodass manipulierte CDN-Antworten vom Browser vor der Ausführung abgewiesen werden:

* **Bulma CSS (`1.0.4`):** `https://cdn.jsdelivr.net/npm/bulma@1.0.4/css/bulma.min.css`
* **Leaflet CSS (`1.9.4`):** `https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css`
* **Turf.js (`6.5.0`):** `https://cdnjs.cloudflare.com/ajax/libs/Turf.js/6.5.0/turf.min.js`
* **Leaflet JS (`1.9.4`):** `https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js`

---

## 🧪 4. Automatisierte Security-Tests & Verifikation

### Lokale & CI-gestützte Regressionstests (`npm run test:security`)

Das Testskript `tests/security-hardening.test.js` wird über Node.js (`node --test`) ausgeführt und ist als fester Prüfschritt in `.github/workflows/ci.yml` integriert:

```bash
npm run test:security
```

Der Test validiert automatisiert:
1. Vorhandensein und korrekte Direktiven von `Content-Security-Policy`, `Permissions-Policy` und `Cross-Origin-Opener-Policy` in `vercel.json`.
2. Verzicht auf einen redundanten `Strict-Transport-Security`-Eintrag in `vercel.json`.
3. Verwendung von `layer.bindPopup(window.erstelleSicherenPopupInhalt(properties))` in `Code/frontend/map-view.js` (und Ausschluss unsicherer Template-Strings).
4. Berücksichtigung von `popup-content.js` beim Cache-Busting in `Code/backend/inject_version.js`.
5. Unschädliche Darstellung von XSS-Testvektoren (`<img src=x onerror=alert(1)>`, `<script>alert(1)</script>`) als reiner `textContent` in `erstelleSicherenPopupInhalt`.

### Live-Verifikation nach einem Production-Deployment

Nach einem Merge nach `main` und abgeschlossenem Vercel-Deployment lassen sich Weiterleitung, Header und Laufzeitverhalten wie folgt prüfen:

1. **HTTP-zu-HTTPS-Weiterleitung & Response-Header prüfen:**
   ```powershell
   curl.exe -I http://kroken-kompass.vercel.app/
   curl.exe -I https://kroken-kompass.vercel.app/
   ```
   * Die HTTP-Anfrage muss mit `308 Permanent Redirect` auf `https://kroken-kompass.vercel.app/` verweisen.
   * Die HTTPS-Antwort muss `Content-Security-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin-allow-popups`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin` sowie `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` enthalten.
2. **Browser-Konsole & Kartenfunktionen prüfen:**
   * In den Entwicklerwerkzeugen dürfen beim Laden der Startseite, beim Etagenwechsel und bei der Routenberechnung keine CSP- oder SRI-Fehler für Bulma, Leaflet, Turf.js, OpenStreetMap-Kacheln, Vercel Analytics/Speed Insights oder lokale Skripte auftreten.
   * Raum-Popups müssen `Name (Nutzungsart)` als Klartext anzeigen, ohne HTML-Markup auszuführen.

### Vorgehen bei künftigen CSP-Anpassungen

Eine CSP-Verletzung darf **nicht** pauschal durch `'unsafe-eval'`, `*` oder unnötig breite Host-Freigaben behoben werden:
1. Die blockierte Ressource anhand der Browser-Console (`violated-directive` und `blocked-uri`) exakt dem betroffenen Script-, Style-, Bild- oder Fetch-Ziel zuordnen.
2. Ausschließlich die minimal erforderliche Origin in der jeweiligen Direktive in `vercel.json` ergänzen.
3. `tests/security-hardening.test.js` aktualisieren und `npm run test:security` sowie `npm run build` ausführen.

---
*Navigation:* [← 🚀 Zurück zu Deployment & CI/CD-Pipelines](🚀-Deployment-&-CI-CD-Pipelines) | [🛠️ Weiter zu Installation & Developer Guide →](🛠️-Installation-&-Developer-Guide)
