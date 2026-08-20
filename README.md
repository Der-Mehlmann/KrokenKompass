<h1 align="center">
  🧭 KrokenKompass
</h1>

<p align="center">
  <b>Moderne, hardwarelose Indoor- & Campus-Navigation für die Martin-Luther-Universität Halle-Wittenberg</b>
</p>

<p align="center">
  <img alt="Elm" src="https://img.shields.io/badge/Elm-0.19.1-60B5CC?style=flat-square&logo=elm&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-20_LTS-339933?style=flat-square&logo=node.js&logoColor=white">
  <img alt="Leaflet" src="https://img.shields.io/badge/Leaflet.js-1.9.4-199900?style=flat-square&logo=leaflet&logoColor=white">
  <img alt="Turf.js" src="https://img.shields.io/badge/Turf.js-7.3.5-34495E?style=flat-square">
  <img alt="Bulma" src="https://img.shields.io/badge/Bulma-1.0.4-00D1B2?style=flat-square&logo=bulma&logoColor=white">
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square"></a>
</p>

---

> **KrokenKompass** ist ein interaktives Orientierungs- und Wegfindungssystem für den **Heide-Campus der MLU Halle-Wittenberg** (u. a. Von-Seckendorff-Platz 1–4). Entwickelt als hochperformante Single-Page-Application (SPA) mit **Elm**, **JavaScript** und **Leaflet.js**. 🎓📍

---

## 📖 Über das Projekt

Klassische Indoor-Navigation erfordert oft teure Hardware wie Bluetooth-Beacons oder leidet unter hohen Latenzen durch serverseitige Polygon-Berechnungen. **KrokenKompass** setzt auf einen performanten, **zweistufigen Architektur-Ansatz**:

1. **Offline-Vorverarbeitung (Build-Time):** Raumgeometrien (Räume, Flure, Treppen, Türen) werden serverseitig via Node.js und Turf.js analysiert, mit Toleranzpuffern verknüpft und in einen mathematischen Wegegraphen (`Data/graph.json`) übersetzt.
2. **Client-Side-Routing (Run-Time):** Der Browser lädt den Graphen einmalig herunter. Die Wegfindung via **Dijkstra-Algorithmus** läuft rein funktional und in Millisekunden lokal im Browser in **Elm** – garantiert ohne Laufzeitfehler.

---

## ✨ Features

* ⚡ **Client-Side-Routing:** Dijkstra-Kürzeste-Wege-Suche direkt im Browser ohne Server-Latenzen.
* 🗺️ **Interaktive Multi-Floor-Karten:** Nahtlose Gebäudepläne, Etagenwechsel (UG bis 5. OG) und dynamische Treppen-/Aufzugs-Navigation mit Leaflet.js.
* 🛡️ **Sichere Elm-Architektur:** Robuste Zustandsverwaltung ohne Laufzeitfehler dank [Elm](https://elm-lang.org/).
* 📐 **Intelligente Geodaten-Pipeline:** Automatisierte Graphengenerierung aus GeoJSON mit Turf.js inklusive Raum-Strafdistanzen (+5000 m).
* 🌓 **Vollständiges Theming & Dual-Logo:** Automatischer & manueller Dark-/Light-Mode mit kontrastoptimierten Logos und dynamischem Favicon.
* 📱 **Mobile-First & Responsive:** Touch-optimiert für Smartphones vor Ort auf dem Campus.

---

## 📚 Vollständige Dokumentation & Wiki

Ausführliche technische Details, Datenfluss-Diagramme und Hintergründe findest du in unserem **[GitHub Wiki](https://github.com/Der-Mehlmann/KrokenKompass/wiki)**:

* 🏠 [**Home & Übersicht**](https://github.com/Der-Mehlmann/KrokenKompass/wiki)
* ⚙️ [**Backend & Graphenerstellung**](https://github.com/Der-Mehlmann/KrokenKompass/wiki/%E2%9A%99%EF%B8%8F-Backend-&-Graphenerstellung) – Turf.js Puffer-Toleranzen, Centroids & Kanten
* 🎨 [**UI, Theming & Design-System**](https://github.com/Der-Mehlmann/KrokenKompass/wiki/%F0%9F%8E%A8-UI,-Theming-&-Design%E2%80%90System) – Dual-Logo-Architektur, CSS-Variablen & Bulma 1.0
* 🏗️ [**Architektur & Technologien**](https://github.com/Der-Mehlmann/KrokenKompass/wiki/%F0%9F%8F%97%EF%B8%8F-Architektur-&-Technologien) – Datenfluss von PostGIS bis zum Leaflet-Canvas
* 🖥️ [**Frontend & Elm-Architektur**](https://github.com/Der-Mehlmann/KrokenKompass/wiki/%F0%9F%96%A5%EF%B8%8F-Frontend-&-Elm%E2%80%90Architektur) – TEA, Dijkstra-Engine & Port-Schnittstellen
* 🚀 [**Deployment & CI/CD Pipelines**](https://github.com/Der-Mehlmann/KrokenKompass/wiki/%F0%9F%9A%80-Deployment-&-CI-CD-Pipelines) – GitHub Pages Workflow & Vercel Deployment
* 🛠️ [**Installation & Developer Guide**](https://github.com/Der-Mehlmann/KrokenKompass/wiki/%F0%9F%9B%A0%EF%B8%8F-Installation-&-Developer-Guide) – Lokale Einrichtung & Troubleshooting

---

## 🛠️ Technologien

* **Frontend:** [Elm 0.19.1](https://elm-lang.org/), [Leaflet.js 1.9.4](https://leafletjs.com/), [Bulma 1.0.4](https://bulma.io/)
* **Datenvorbereitung (Backend):** [Node.js](https://nodejs.org/), [@turf/turf 7.3.5](https://turfjs.org/)
* **Deployment & Hosting:** GitHub Actions (Pages) & Vercel

---

## 🚀 Quick Start (Lokale Entwicklung)

```bash
# 1. Repository klonen
git clone https://github.com/Der-Mehlmann/KrokenKompass.git
cd KrokenKompass

# 2. Abhängigkeiten installieren
npm install

# 3. Frontend kompilieren
npm run build

# 4. Lokalen Entwicklungsserver starten
npx serve .
```

Öffne anschließend [http://localhost:3000](http://localhost:3000) im Browser.

---

## 📦 Entwickler-Skripte

### 🔄 Geo-Daten & Routing-Graph neu berechnen
Wenn sich Grundrisse oder Raum-Dateien in `Data/` ändern:
```bash
node Code/backend/build_graph.js
```
Generiert die optimierte `Data/graph.json` neu.

### 🔨 Elm Frontend kompilieren
Bei Änderungen im Elm-Quellcode (`Code/frontend/src/`):
```bash
npm run build
```
*(Kompiliert `Code/frontend/src/Main.elm` mit Optimierungen zu `Code/frontend/elm.js`)*

---

## 📄 Lizenz

Dieses Projekt ist unter der **MIT-Lizenz** lizenziert – siehe die [LICENSE](LICENSE) Datei für Details.
