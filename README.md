markdown_content = """<p align="center">
  <img alt="Elm" src="https://img.shields.io/badge/Elm-0.19.2-60B5CC?style=flat-square&logo=elm&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-Backend_Processing-339933?style=flat-square&logo=node.js&logoColor=white">
  <img alt="Leaflet" src="https://img.shields.io/badge/Leaflet.js-Interactive_Maps-199900?style=flat-square&logo=leaflet&logoColor=white">
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square"></a>
</p>

---

## 📖 Über das Projekt
**KrokenKompass** löst das Problem der komplexen **Indoor-Navigation** in Gebäudestrukturen ohne den Einsatz von teurer Hardware (wie z.B. Bluetooth-Beacons). Anstelle einer serverseitigen On-Demand-Berechnung nutzt KrokenKompass einen cleveren, zweistufigen Ansatz für maximale Performance:

1. **Offline-Vorverarbeitung:** Räumliche Geometrien (Räume, Flure, Türen) werden serverseitig über Node.js und Turf.js in ein rein mathematisches Wegesystem (einen Graphen) übersetzt.
2. **Client-Side-Routing:** Der Browser des Nutzers lädt diesen Graphen einmalig herunter und führt Routing-Suchen lokal und extrem performant in **Elm** aus. Visualisiert werden die Wege auf interaktiven Gebäudeplänen via **Leaflet.js**.

## ✨ Features
- ⚡ **Offline-fähiges Client-Side-Routing**: Wegfindung via Dijkstra-Algorithmus direkt im Browser.
- 🗺️ **Interaktive Karten**: Darstellung mit [Leaflet.js](https://leafletjs.com/).
- 🛡️ **Sicheres State-Management**: Keine Laufzeitfehler dank der Architektur in [Elm](https://elm-lang.org/).
- 📐 **Geometrische Vorverarbeitung**: Automatisierte Graphengenerierung aus GeoJSON (via [@turf/turf](https://turfjs.org/)).

## 🛠️ Technologien & Architektur
KrokenKompass setzt auf eine strikte Trennung von Datenaufbereitung und Laufzeitumgebung:
* **Backend / Pre-Processing:** Node.js, Turf.js
* **Frontend:** Elm, HTML/CSS/JS, Leaflet.js

## 🚀 Quick Start
Um das Projekt lokal auszuführen, folge diesen Schritten:

```bash
# 1. Repository klonen
git clone [https://github.com/Der-Mehlmann/KrokenKompass.git](https://github.com/Der-Mehlmann/KrokenKompass.git)
cd KrokenKompass

# 2. Server starten
npx serve .
