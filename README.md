<h1 align="center">KrokenKompass</h1>

<p align="center">
  <img alt="Elm" src="https://img.shields.io/badge/Elm-0.19.1-60B5CC?style=flat-square&logo=elm&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-Backend_Processing-339933?style=flat-square&logo=node.js&logoColor=white">
  <img alt="Leaflet" src="https://img.shields.io/badge/Leaflet.js-Interactive_Maps-199900?style=flat-square&logo=leaflet&logoColor=white">
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square"></a>
</p>

---

> **KrokenKompass**: Die interaktive Web-Karte für die **MLU Halle-Wittenberg**. Aktuell fokussiert auf den **Heide-Campus**, aber modular skalierbar für weitere Standorte. Entwickelt als Single-Page-Application mit Elm und JavaScript. 🧭🎓

---

## 📖 Über das Projekt

**KrokenKompass** löst das Problem der komplexen **Indoor-Navigation** in Gebäudestrukturen ohne den Einsatz von teurer Hardware (wie z.B. Bluetooth-Beacons). Anstelle einer serverseitigen On-Demand-Berechnung nutzt KrokenKompass einen cleveren, zweistufigen Ansatz für maximale Performance:

1. **Offline-Vorverarbeitung:** Räumliche Geometrien (Räume, Flure, Türen) werden serverseitig über Node.js und Turf.js in ein rein mathematisches Wegesystem (einen Graphen) übersetzt.
2. **Client-Side-Routing:** Der Browser des Nutzers lädt diesen Graphen einmalig herunter und führt Routing-Suchen lokal und extrem performant in **Elm** aus. Visualisiert werden die Wege auf interaktiven Gebäudeplänen via **Leaflet.js**.

## ✨ Features

- ⚡ **Client-Side-Routing**: Wegfindung via Dijkstra-Algorithmus direkt im Browser.
- 🗺️ **Interaktive Karten**: Darstellung der Gebäudepläne und Wege mit Leaflet.js.
- 🛡️ **Sicheres State-Management**: Keine Laufzeitfehler dank der Architektur in [Elm](https://elm-lang.org/).
- 📐 **Geometrische Vorverarbeitung**: Automatisierte Graphengenerierung aus GeoJSON (via [@turf/turf](https://turfjs.org/)).
- 🌗 **Dark Mode**: Integrierte Unterstützung für helle und dunkle Darstellungsmodi.

## 🛠️ Technologien & Architektur

KrokenKompass setzt auf eine strikte Trennung von Datenaufbereitung und Laufzeitumgebung:

### Frontend
Das Frontend ist eine Single-Page-Applikation (SPA).
* **Elm (0.19.1)**: Behandelt die sichere und funktionale UI-Logik sowie das lokale Routing.
* **Styling**: Vanilla CSS.
* **Markup**: HTML5.

### Datenaufbereitung (Backend)
Skripte, die zur Laufzeit der Entwicklung oder beim Build-Prozess ausgeführt werden, um Geodaten zu verarbeiten.
* **Node.js**
* **@turf/turf (7.3.5)**: Eine JavaScript-Bibliothek für räumliche Analysen und Geometrie-Operationen.

## 🚀 Quick Start

Um das Projekt lokal auszuführen, folge diesen Schritten:

```bash
# 1. Repository klonen
git clone https://github.com/Der-Mehlmann/KrokenKompass.git
cd KrokenKompass

# 2. Abhängigkeiten installieren
npm install

# 3. Lokalen Entwicklungsserver starten
npx serve .
```

Öffne anschließend [http://localhost:3000](http://localhost:3000) (oder den von `serve` angezeigten Port) in deinem Browser.

## 📦 Skripte & Daten

### Geo-Daten aktualisieren
Wenn sich die Raumpläne ändern, müssen die Graphen neu berechnet werden:
```bash
node Code/backend/build_graph.js
```
Dies generiert eine aktualisierte `graph.json` Datei aus den hinterlegten Geo-Daten.

### Elm Frontend kompilieren
Falls Änderungen am Elm-Code (`Code/frontend/src/*.elm`) vorgenommen werden:
```bash
cd Code/frontend
npx elm make src/Main.elm --output=elm.js
```

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert - siehe die [LICENSE](LICENSE) Datei für Details.
