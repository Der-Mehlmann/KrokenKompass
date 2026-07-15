  <p>
    <img alt="Elm" src="https://img.shields.io/badge/Elm-0.19.2-60B5CC?style=flat-square&logo=elm&logoColor=white">
    <img alt="Node.js" src="https://img.shields.io/badge/Node.js-Backend_Processing-339933?style=flat-square&logo=node.js&logoColor=white">
    <img alt="Leaflet" src="https://img.shields.io/badge/Leaflet.js-Interactive_Maps-199900?style=flat-square&logo=leaflet&logoColor=white">
    <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square"></a>
  </p>
</div>
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
npx serve .
```
Anschließend öffne `http://localhost:3000` in deinem Browser.
*(Für detaillierte Anweisungen zum Neu-Kompilieren des Elm-Frontends oder zur Neugenerierung des Graphen über Node.js, siehe [Installationsanleitung im Wiki](docs/Installation.md).)*
## 📚 Dokumentation & Wiki
Detaillierte Informationen zur Architektur, Implementierung und Datenstruktur findest du in unserem ausführlichen Wiki:
👉 **[Zur vollständigen Wiki-Dokumentation](docs/Home.md)**
*   [🏠 Home](docs/Home.md)
*   [🏗 Architektur & Technologien](docs/Architektur.md)
*   [⚙️ Backend & Routing-Graph](docs/Backend-Routing.md)
*   [🖥 Frontend & Elm](docs/Frontend-Elm.md)
*   [🚀 Installation & Setup](docs/Installation.md)
## 🤝 Mitwirken (Contributing)
Beiträge, Issues und Feature Requests sind willkommen! 
Schau gerne in unseren [Issues](https://github.com/Der-Mehlmann/KrokenKompass/issues) vorbei, wenn du mithelfen möchtest.
Wir nutzen Issue und Pull Request Templates im `.github` Ordner, um den Prozess so reibungslos wie möglich zu gestalten.
## 📄 Lizenz
Dieses Projekt ist lizenziert unter den Bedingungen in der [LICENSE](LICENSE) Datei.
