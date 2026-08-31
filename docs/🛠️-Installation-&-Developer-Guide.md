# 🛠️ Installation & Developer Guide

Diese Anleitung beschreibt, wie KrokenKompass lokal eingerichtet, entwickelt, getestet und gewartet wird.

---

## 💻 Systemvoraussetzungen

* **Node.js** (Version 18 oder neuer) & **npm**
* **Elm-Compiler** (Version 0.19.1)
  * Empfohlen: Global via npm installieren:
    ```bash
    npm install -g elm
    ```
    *Oder alternativ lokal mit `npx elm` ausführen.*

---

## 🚀 Quick Start (Lokale Entwicklung)

### 1. Repository klonen & Abhängigkeiten installieren
```bash
git clone https://github.com/Der-Mehlmann/KrokenKompass.git
cd KrokenKompass

# Installiert Abhängigkeiten für Backend (Turf.js) und Build-Tools
npm install
```

### 2. Frontend kompilieren
Kompiliere den Elm-Code aus `Code/frontend/src/` zu JavaScript:
```bash
npm run build
```
*(Alternativ direkt im Unterordner: `cd Code/frontend && elm make src/Main.elm --output=elm.js`)*

### 3. Lokalen Entwicklungsserver starten
Da moderne Browser das Nachladen von JSON-Dateien (`graph.json`, GeoJSON) über das `file://`-Protokoll aus Sicherheitsgründen (CORS) blockieren, starte einen lokalen HTTP-Server:
```bash
npm run dev
```
*(Alternativ: `npm start` oder `npx serve .`)*

Öffne anschließend [http://localhost:3000](http://localhost:3000) im Browser.

---

## 🔄 Typische Entwickler-Workflows

### A. Raumpläne oder Geodaten aktualisieren
Wenn neue Räume hinzugefügt oder bestehende GeoJSON-Dateien in `Data/` geändert wurden:
```bash
# Berechnet alle Kanten, Centroids und Pufferzonen neu:
npm run build:graph
```
*(Führt im Hintergrund `node Code/backend/build_graph.js` aus und aktualisiert direkt `Data/graph.json`)*

### B. Änderungen an der Benutzeroberfläche (Elm)
Wenn du Dateien wie `Code/frontend/src/Main.elm` oder `Dijkstra.elm` bearbeitest:
```bash
npm run build
```
Lade anschließend die Webseite mit `Cmd + Shift + R` (Mac) bzw. `Strg + F5` (Windows/Linux) im Browser neu, um den Browser-Cache zu umgehen.

---

## 🔍 Troubleshooting & Häufige Fehler

### 1. `ReferenceError: Can't find variable: Elm` / `404 elm.js`
* **Ursache:** Die Datei `Code/frontend/elm.js` wurde noch nicht kompiliert oder fehlt.
* **Lösung:** Führe `npm run build` aus.

### 2. `CORS Error / Failed to fetch graph.json`
* **Ursache:** Du hast `index.html` per Doppelklick direkt im Browser (`file:///...`) geöffnet.
* **Lösung:** Starte immer einen lokalen Server via `npx serve .`.

### 3. `ELM VERSION MISMATCH`
* **Ursache:** In `Code/frontend/elm.json` ist eine andere Elm-Version eingetragen als der installierte Compiler.
* **Lösung:** Stelle sicher, dass in `elm.json` `"elm-version": "0.19.1"` eingetragen ist.

### 4. Ein Raum in einem Gebäude wird beim Routing nicht gefunden
* **Ursache:** Der Raum hat im CAD-Plan keinen Kontakt zum Flurnetzwerk (Lücke größer als die Puffertoleranz).
* **Lösung:** Prüfe in `Code/backend/build_graph.js` die Pufferzonen (`puffer = 1.0;`) und führe `node Code/backend/build_graph.js` erneut aus.

---
*Navigation:* [← Zurück zu Deployment & CI/CD Pipelines](🚀-Deployment-&-CI-CD-Pipelines) | [🏠 Zurück zur Home-Seite](Home)