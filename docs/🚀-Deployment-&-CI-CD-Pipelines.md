KrokenKompass wird ausschließlich auf **Vercel** bereitgestellt. Zusätzlich prüft eine CI-Pipeline (`.github/workflows/ci.yml`) jeden Pull Request auf `main`.

---

## ⚙️ 1. CI-Pipeline (`.github/workflows/ci.yml`)

`.github/workflows/ci.yml` prüft jeden Pull Request auf `main` und kann manuell (`workflow_dispatch`) gestartet werden. Das Deployment selbst wird von der mit GitHub verbundenen Vercel-Integration übernommen:

```mermaid
flowchart LR
    Trigger["PR auf main / workflow_dispatch"] --> Checkout["1. Code Checkout"]
    Checkout --> Setup["2. Setup Node.js 24 + Elm-Cache"]
    Setup --> Install["3. npm ci"]
    Install --> Build["4. npm run build (inject_version.js + elm make)"]
    Build --> SecTest["5. npm run test:security"]
    SecTest --> GraphTest["6. node Code/backend/build_graph.js"]
```

### Die wichtigsten Schritte im Detail
1. **Versions- & Release-Injektion (`inject_version.js`):**
   - **Release-Version:** Ermittelt das aktuelle GitHub-Release bzw. Git-Tag (`GITHUB_REF_NAME` oder `git describe --tags --abbrev=0`, Fallback `version` aus `package.json`).
   - **Commit-Hash:** Ermittelt den 7-stelligen Commit-Hash (`VERCEL_GIT_COMMIT_SHA`, `GITHUB_SHA` oder `git rev-parse --short HEAD`).
   - **Strukturierte Flags:** Schreibt `flags: { release: "vX.X.X", commit: "XXXXXXX" }` in `index.html`, sodass im Footer `vX.X.X - XXXXXXX` mit Links zu Release und Commit angezeigt wird.
   - **Cache-Busting:** Aktualisiert automatisch die Query-Parameter `elm.js?v=`, `popup-content.js?v=`, `map-view.js?v=` und `style.css?v=` in `index.html`.
2. **Elm-Kompilierung (`elm make`):**
   - Kompiliert `Code/frontend/src/Main.elm` mit dem `--optimize`-Flag nach `Code/frontend/elm.js`.
3. **Security-Hardening-Tests (`npm run test:security`):**
   - Führt `node --test tests/security-hardening.test.js` aus und validiert die CSP-/Security-Header in `vercel.json`, das Cache-Busting für `popup-content.js` sowie das XSS-sichere Popup-Rendering (`erstelleSicherenPopupInhalt`).
4. **Graphengenerierungs-Check (`node Code/backend/build_graph.js`):**
   - Verifiziert, dass sich `Data/graph.json` fehlerfrei aus den GeoJSON-Etagendaten (`Data/vsp_etage_*.json`) neu berechnen lässt.

---

## ▲ 2. Vercel Deployment

Vercel erstellt Preview-Deployments für Pull Requests sowie Production-Deployments für `main`.

Details zum Sicherheitskonzept (CSP-Direktiven, XSS-sichere Karten-Popups, Subresource Integrity, HSTS-Verwaltung durch Vercel und Verifikationsschritte) sind unter [Security Hardening](security-hardening) dokumentiert.

### Konfigurationsdateien

#### `package.json`
Definiert die Build-, Test- und Entwicklungs-Skripte:
```json
{
  "scripts": {
    "dev": "npx serve .",
    "start": "npx serve .",
    "test:security": "node --test tests/security-hardening.test.js",
    "build": "npm run build:all",
    "build:elm": "node Code/backend/inject_version.js && cd Code/frontend && npx elm make src/Main.elm --output=elm.js --optimize",
    "build:graph": "node Code/backend/build_graph.js",
    "build:all": "npm run build:elm"
  },
  "devDependencies": {
    "elm": "^0.19.1-6"
  },
  "dependencies": {
    "@turf/turf": "^7.4.0"
  }
}
```

#### `vercel.json`
Da KrokenKompass eine statische Single-Page-Application mit `index.html` im Hauptverzeichnis ist, definiert `vercel.json` das Root-Verzeichnis als Output sowie HTTP-Sicherheits- und Cache-Header:
```json
{
  "outputDirectory": ".",
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; img-src 'self' data: https://cdnjs.cloudflare.com https://tile.openstreetmap.org; font-src 'self' data:; connect-src 'self' https://vitals.vercel-insights.com; frame-src 'none';"
        },
        {
          "key": "Permissions-Policy",
          "value": "accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=(), xr-spatial-tracking=()"
        },
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin-allow-popups"
        }
      ]
    },
    {
      "source": "/(index\\.html)?",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/Data/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600, stale-while-revalidate=86400"
        }
      ]
    },
    {
      "source": "/Code/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=86400, stale-while-revalidate=604800"
        }
      ]
    }
  ]
}
```

Vercel ist mit dem Repository verbunden und verwendet `main` als Production-Branch. Für `https://kroken-kompass.vercel.app/` stellt Vercel automatisch TLS bereit, leitet HTTP auf HTTPS um und liefert bereits HSTS:

```text
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

HSTS wird deshalb nicht zusätzlich in `vercel.json` dupliziert. Die tatsächliche Production-Response kann mit diesem Befehl geprüft werden:

```powershell
curl.exe -I https://kroken-kompass.vercel.app/
```

GitHub Pages ist für die Auslieferung nicht mehr vorgesehen. Der frühere Workflow `.github/workflows/deploy.yml` wurde entfernt; `ci.yml` bleibt als Prüfworkflow aktiv.

#### Vercel Web Analytics & Speed Insights
KrokenKompass bindet Vercel Web Analytics sowie Vercel Speed Insights im `<head>` der `index.html` ein:
```html
<!-- Vercel Web Analytics & Speed Insights -->
<script>
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>
<script defer src="/_vercel/speed-insights/script.js"></script>
```
* **Core Web Vitals:** Speed Insights erfasst Leistungskennzahlen (LCP, INP, CLS).
* **Custom Events:** Die Port-Handler in `index.html` senden anonymisierte Nutzungsereignisse:
  - `route_calculated`: Erfolgreiche Berechnung und Darstellung einer Route
  - `route_failed`: Fehlgeschlagene Routensuche
  - `switch_floor`: Wechsel der angezeigten Etage (`{ floor: ... }`)

---

## 🔄 3. GitHub Wiki Sync Pipeline (`.github/workflows/wiki-sync.yml`)

Änderungen an der Dokumentation werden im Verzeichnis `docs/` über Commits und Pull Requests gepflegt. Bei jedem Push auf `main`, der Dateien unter `docs/**` ändert, spiegelt `.github/workflows/wiki-sync.yml` die Markdown-Dateien in das GitHub Wiki (`.wiki.git`):

```mermaid
flowchart LR
    Push["Push auf main mit docs/**"] --> Checkout["1. Code Checkout"]
    Checkout --> Sync["2. github-wiki-action"]
    Sync --> Wiki["3. Live-Update im GitHub Wiki"]
```

---

## 🛡️ 4. Warum `elm.js` in `.gitignore` steht

* **Keine generierten Build-Artefakte in der Versionsverwaltung:** `Code/frontend/elm.js` wird beim Build vollständig aus `Code/frontend/src/*.elm` generiert.
* **Deterministische Builds:** Durch die Ausführung von `npm run build` in GitHub Actions und Vercel wird `elm.js` bei jedem Deployment frisch aus dem aktuellen Quellcode kompiliert.

---
*Navigation:* [← 🖥️ Zurück zu Frontend & Elm-Architektur](🖥️-Frontend-&-Elm‐Architektur) | [🛡️ Weiter zu Security Hardening →](security-hardening)
