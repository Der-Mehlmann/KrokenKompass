Diese Anleitung beschreibt, wie KrokenKompass lokal eingerichtet, kompiliert und weiterentwickelt wird.

---

## 💻 Systemvoraussetzungen

* **Node.js** (Version 18+, empfohlen: **Node.js 24 LTS** analog zur CI-Pipeline) & **npm**
* **Elm-Compiler** (Version `0.19.1`):
  * Wird bei `npm install` automatisch lokal als `devDependency` (`"elm": "^0.19.1-6"`) mitinstalliert und über `npx elm` bzw. `npm run build` ausgeführt (keine separate globale Installation erforderlich).

---

## 🚀 Quick Start (Lokale Entwicklung)

### 1. Repository klonen & Abhängigkeiten installieren
```bash
git clone https://github.com/Der-Mehlmann/KrokenKompass.git
cd KrokenKompass

# Installiert @turf/turf sowie den lokalen Elm-Compiler
npm install
```

### 2. Frontend kompilieren
Injiziert die aktuellen Git-Versionsmetadaten (`inject_version.js`) und kompiliert den Elm-Quellcode aus `Code/frontend/src/` nach `Code/frontend/elm.js`:
```bash
npm run build
```
*(Alternativ für einen reinen Elm-Kompilierlauf ohne Versionsinjektion: `cd Code/frontend && npx elm make src/Main.elm --output=elm.js --optimize`)*

### 3. Lokalen Entwicklungsserver starten
Da Browser das Laden lokaler JSON-Dateien (`Data/graph.json`, `Data/vsp_units.json`, `Data/vsp_etage_*.json`) über das `file://`-Protokoll aus Sicherheitsgründen (CORS) blockieren, wird ein lokaler HTTP-Server benötigt:
```bash
npm run dev
```
*(Alternativ: `npm start` oder `npx serve .`)*

Anschließend [http://localhost:3000](http://localhost:3000) im Browser aufrufen.

---

## 🔄 Typische Entwickler-Workflows

### A. Raumpläne oder Geodaten aktualisieren
Wenn GeoJSON-Dateien in `Data/vsp_etage_*.json` geändert wurden, muss der Routing-Graph explizit neu berechnet werden (`npm run build` führt aus Performance-Gründen nur den Frontend-Build aus):
```bash
# Berechnet alle Kanten, Repräsentationspunkte und Pufferzonen neu:
npm run build:graph
```
*(Führt `node Code/backend/build_graph.js` aus und überschreibt `Data/graph.json`)*

### B. Änderungen an der Benutzeroberfläche (Elm)
Nach Änderungen an `Code/frontend/src/Main.elm`, `Dijkstra.elm` oder `GraphData.elm`:
```bash
npm run build
```
Anschließend die Webseite im Browser mit `Cmd + Shift + R` (macOS) bzw. `Strg + F5` (Windows/Linux) neu laden.

---

## 🔍 Troubleshooting & Häufige Fehler

### 1. `ReferenceError: Can't find variable: Elm` / `404 elm.js`
* **Ursache:** Die Datei `Code/frontend/elm.js` steht in `.gitignore` und wurde lokal noch nicht kompiliert.
* **Lösung:** `npm run build` ausführen.

### 2. `CORS Error / Failed to fetch graph.json`
* **Ursache:** `index.html` wurde direkt über das Dateisystem (`file:///...`) statt über HTTP geöffnet.
* **Lösung:** Lokalen Server über `npm run dev` starten und `http://localhost:3000` öffnen.

### 3. `ELM VERSION MISMATCH`
* **Ursache:** In `Code/frontend/elm.json` ist eine andere Elm-Version eingetragen als der verwendete Compiler.
* **Lösung:** Sicherstellen, dass `"elm-version": "0.19.1"` in `Code/frontend/elm.json` steht und `npm run build` (nutzt das lokale `npx elm` `0.19.1-6`) verwendet wird.

### 4. Ein Raum wird beim Routing nicht erreicht
* **Ursache:** Das Raum- oder Tür-Polygon hat im GeoJSON-Grundriss keinen Kontakt zum Flurnetzwerk (Lücke größer als die Puffertoleranz oder fehlende `name`-/`gid`-Eigenschaft).
* **Lösung:** In `Code/backend/build_graph.js` die Kontakt- und Pufferregeln (`habenKontakt`, `1.0 m` / `3.0 m`) prüfen und anschließend `npm run build:graph` ausführen.

---
*Navigation:* [← 🚀 Zurück zu Deployment & CI/CD-Pipelines](🚀-Deployment-&-CI-CD-Pipelines) | [🏠 Zurück zur Home-Seite →](Home)
