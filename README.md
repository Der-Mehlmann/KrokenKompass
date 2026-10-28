<h1 align="center">
  🧭 KrokenKompass
</h1>

<p align="center">
  <b>Clientseitiges Indoor- & Campus-Navigationssystem ohne Zusatzhardware für die Martin-Luther-Universität Halle-Wittenberg</b>
</p>

<p align="center">
  <img alt="Elm" src="https://img.shields.io/badge/Elm-0.19.1-60B5CC?style=flat-square&logo=elm&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-24-339933?style=flat-square&logo=node.js&logoColor=white">
  <img alt="Leaflet" src="https://img.shields.io/badge/Leaflet.js-1.9.4-199900?style=flat-square&logo=leaflet&logoColor=white">
  <img alt="Turf.js" src="https://img.shields.io/badge/Turf.js-7.4.0-34495E?style=flat-square">
  <img alt="Bulma" src="https://img.shields.io/badge/Bulma-1.0.4-00D1B2?style=flat-square&logo=bulma&logoColor=white">
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square"></a>
</p>

---

> **KrokenKompass** ist ein interaktives Orientierungs- und Wegfindungssystem für den **Heide-Campus der MLU Halle-Wittenberg** (Von-Seckendorff-Platz 1–4, Gebäudecodes `7721`–`7724`). Entwickelt als Single-Page-Application (SPA) mit **Elm**, **JavaScript** und **Leaflet.js**. 🎓📍

---

## 📖 Über das Projekt

Klassische Indoor-Navigation erfordert oft zusätzliche Infrastruktur wie Bluetooth-Beacons oder verursacht hohe Latenzen durch serverseitige Polygon-Berechnungen. **KrokenKompass** nutzt einen **zweistufigen Architektur-Ansatz**:

1. **Offline-Vorverarbeitung (Build-Time):** Raumgeometrien (Räume, Flure, Treppen, Türen) aus `Data/vsp_etage_*.json` werden vorab via Node.js und Turf.js analysiert, mit Toleranzpuffern verknüpft und in einen gewichteten Wegegraphen (`Data/graph.json`) übersetzt.
2. **Client-Side-Routing (Run-Time):** Der Browser lädt den Graphen einmalig herunter. Die Wegfindung via **Dijkstra-Algorithmus** läuft rein funktional lokal im Browser in **Elm** – ohne Serveranfragen zur Laufzeit.

---

## ✨ Features

* ⚡ **Client-Side-Routing:** Dijkstra-Kürzeste-Wege-Suche direkt im Browser ohne Server-Latenzen.
* 🗺️ **Interaktive Multi-Floor-Karten:** Etagenübergreifende Gebäudepläne (UG `-1` bis 5. OG `05`) und Treppen-/Aufzugs-Hinweise mit Leaflet.js (`<leaflet-map-container>`).
* 🛡️ **Typsichere Elm-Architektur:** Zustandsverwaltung ohne Laufzeitausnahmen dank [Elm](https://elm-lang.org/).
* 📐 **Regelbasierte Geodaten-Pipeline:** Automatisierte Graphengenerierung aus GeoJSON mit Turf.js inklusive Raum-Transitstrafen (`+5000 m`).
* 🌓 **Theming & Dual-Logo:** Automatischer und manueller Dark-/Light-Mode mit kontrastoptimierten Logos (`KK-Logo-dark.png` / `KK-Logo-Light.png`).
* 📱 **Responsive Oberfläche:** Bedienbar auf Desktop-Bildschirmen und Smartphones auf dem Campus.

---

## 📚 Vollständige Dokumentation & Wiki

Technische Details, Datenfluss-Diagramme und Architekturentscheidungen sind im **[GitHub Wiki](https://github.com/Der-Mehlmann/KrokenKompass/wiki)** sowie im Ordner [`docs/`](docs/README.md) dokumentiert:

* 🏠 [**Home & Übersicht**](https://github.com/Der-Mehlmann/KrokenKompass/wiki)
* ⚙️ [**Backend & Graphenerstellung**](https://github.com/Der-Mehlmann/KrokenKompass/wiki/%E2%9A%99%EF%B8%8F-Backend-&-Graphenerstellung) – Turf.js Puffer-Toleranzen, Repräsentationspunkte & Kantengewichte
* 🎨 [**UI, Theming & Design-System**](https://github.com/Der-Mehlmann/KrokenKompass/wiki/%F0%9F%8E%A8-UI,-Theming-&-Design%E2%80%90System) – Dual-Logo-Architektur, CSS-Variablen & Bulma 1.0
* 🏗️ [**Architektur & Technologien**](https://github.com/Der-Mehlmann/KrokenKompass/wiki/%F0%9F%8F%97%EF%B8%8F-Architektur-&-Technologien) – Datenfluss von GeoJSON bis zum Leaflet-Web-Component
* 🖥️ [**Frontend & Elm-Architektur**](https://github.com/Der-Mehlmann/KrokenKompass/wiki/%F0%9F%96%A5%EF%B8%8F-Frontend-&-Elm%E2%80%90Architektur) – TEA, Dijkstra-Engine & Port-Schnittstellen
* 🚀 [**Deployment & CI/CD-Pipelines**](https://github.com/Der-Mehlmann/KrokenKompass/wiki/%F0%9F%9A%80-Deployment-&-CI-CD-Pipelines) – GitHub Pages Workflow & Vercel Deployment
* 🛠️ [**Installation & Developer Guide**](https://github.com/Der-Mehlmann/KrokenKompass/wiki/%F0%9F%9B%A0%EF%B8%8F-Installation-&-Developer-Guide) – Lokale Einrichtung & Troubleshooting

---

## 🛠️ Technologien

* **Frontend:** [Elm 0.19.1](https://elm-lang.org/), [Leaflet.js 1.9.4](https://leafletjs.com/), [Turf.js 6.5.0 (CDN)](https://turfjs.org/), [Bulma 1.0.4](https://bulma.io/)
* **Datenvorbereitung (Backend / Build-Time):** [Node.js](https://nodejs.org/) (v18+, CI: v24), [@turf/turf 7.4.0](https://turfjs.org/)
* **Deployment & Hosting:** GitHub Actions (Pages & Wiki-Sync) & Vercel

---

## 🚀 Quick Start (Lokale Entwicklung)

```bash
# 1. Repository klonen
git clone https://github.com/Der-Mehlmann/KrokenKompass.git
cd KrokenKompass

# 2. Abhängigkeiten installieren (inkl. lokalem Elm-Compiler & @turf/turf)
npm install

# 3. Frontend kompilieren (Versionsinjektion + Elm-Build)
npm run build

# 4. Lokalen Entwicklungsserver starten
npm run dev
```

Anschließend [http://localhost:3000](http://localhost:3000) im Browser aufrufen.

---

## 📦 Entwickler-Skripte (`package.json`)

| Befehl | Beschreibung |
| :--- | :--- |
| **`npm run dev`** / **`npm start`** | Startet den lokalen HTTP-Server (`npx serve .` auf `http://localhost:3000`). |
| **`npm run build:elm`** | Führt `inject_version.js` aus und kompiliert `Code/frontend/src/Main.elm` (`--optimize`) nach `Code/frontend/elm.js`. |
| **`npm run build`** / **`npm run build:all`** | Alias für `npm run build:elm` (nutzt den vorab generierten Graphen `Data/graph.json`). |
| **`npm run build:graph`** | Führt `node Code/backend/build_graph.js` aus und berechnet `Data/graph.json` aus `Data/vsp_etage_*.json` neu. |

---

## 📄 Lizenz

Dieses Projekt ist unter der **MIT-Lizenz** lizenziert – siehe die [LICENSE](LICENSE)-Datei für Details.
