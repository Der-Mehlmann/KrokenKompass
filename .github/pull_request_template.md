<!--
Complete the sections below to document the scope, architectural impact, and verification of your changes.
-->

## Summary

<!-- Describe the problem solved or capability introduced by this pull request, and explain why this change is needed. -->
<!-- Link any resolved or related issues below (for example: "Closes #123" or "Relates to #123"): -->
Closes #

## Type of Change

<!-- Check all categories that apply to this pull request: -->

- [ ] Bug Fix (non-breaking change that resolves a functional defect)
- [ ] New Feature (non-breaking change that adds user-facing or developer functionality)
- [ ] Routing Algorithm or Graph Generation Update (changes route calculation, edge weights, or spatial buffers)
- [ ] Map, GeoJSON, or Room Catalog Data Update (adds or updates floor plans, rooms, or campus landmarks)
- [ ] UI, Theming, or Accessibility Update (layout, Light/Dark mode tokens, responsive behavior, or keyboard/ARIA support)
- [ ] Refactoring (code restructuring without changes to external behavior)
- [ ] Performance Optimization (routing speed, graph payload size, or map rendering performance)
- [ ] Build, CI/CD, or Dependencies (workflows, build scripts, npm/Elm packages, or CDN/SRI assets)
- [ ] Documentation or Repository Templates
- [ ] Breaking Change (alters URL hash parameters, JSON schemas, or Elm-to-JS port payloads)

## Affected Components

<!-- Check all repository areas modified by this pull request: -->

- [ ] Frontend Entry & Styling (`index.html`, `Code/frontend/cssFiles/style.css`)
- [ ] Elm Application & Routing (`Code/frontend/src/Main.elm`, `Code/frontend/src/Dijkstra.elm`, `Code/frontend/src/GraphData.elm`)
- [ ] Leaflet Map Web Component (`Code/frontend/map-view.js`)
- [ ] Backend Build Scripts (`Code/backend/build_graph.js`, `Code/backend/inject_version.js`)
- [ ] Spatial & Room Catalog Data (`Data/vsp_etage_*.json`, `Data/vsp_units.json`, `Data/graph.json`)
- [ ] CI/CD, Configuration, or Documentation (`.github/`, `docs/`, `README.md`, `package.json`, `vercel.json`)

## Verification & Contributor Checklist

<!-- Verify each applicable item in build order before requesting a review: -->

- [ ] If GeoJSON floor plans (`Data/vsp_etage_*.json`) or graph generation rules (`Code/backend/build_graph.js`) changed, I ran `npm run build:graph` and committed the regenerated `Data/graph.json`.
- [ ] If searchable rooms or campus landmarks were added or renamed, I updated `Data/vsp_units.json` (and landmark aliases in `Code/frontend/src/Main.elm` if applicable) alongside `Data/vsp_etage_*.json`.
- [ ] If node identifiers or GeoJSON feature properties were modified, the `${name}__${gid}` composite node ID format (combining GeoJSON `properties.name` and unique `properties.gid` with a double underscore) remains synchronized between `Code/backend/build_graph.js` and `Code/frontend/map-view.js`.
- [ ] The frontend compiles cleanly via `npm run build` (runs `Code/backend/inject_version.js` and `npx elm make src/Main.elm --output=elm.js --optimize` without committing the gitignored `Code/frontend/elm.js` bundle).
- [ ] I tested the application locally (`npm run dev` or `npm start`) and verified there are no browser console or runtime errors.
- [ ] If UI layout, styling, or map overlays changed, I verified both Light (`[data-theme="light"]`) and Dark (`[data-theme="dark"]`) themes across desktop (`>= 769px`) and mobile (`<= 768px`) viewports.
- [ ] I updated the documentation (`README.md`, `docs/`) if build scripts, ports, data schemas, or user workflows changed.

## Visual Changes (Before / After)

<!-- If this pull request modifies the user interface or map rendering, attach before and after screenshots or screen recordings in the table below. Otherwise, leave "N/A" in both cells. -->

| Before | After |
| :--- | :--- |
| N/A | N/A |

## Additional Review Notes

<!-- Share any architectural trade-offs, edge cases, manual test routes (e.g., "#map?start=7723_00_039&ziel=7721_02_014"), or open questions for reviewers. -->
