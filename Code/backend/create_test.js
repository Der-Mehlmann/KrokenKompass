const fs = require('fs');
const turf = require('@turf/turf');

const features = JSON.parse(fs.readFileSync('./vsp_units.json', 'utf8'));

// I will paste the entire map-routing.js code here, comment out Leaflet and DOM stuff, and run it!
let code = fs.readFileSync('./map-routing.js', 'utf8');

// remove window. and L.map and document.
code = code.replace(/var map = L\.map[\s\S]*?addTo\(map\);/g, '');
code = code.replace(/window\.map\.removeLayer/g, 'dummyFn');
code = code.replace(/document\.getElementById.*?;/g, 'null;');
code = code.replace(/new URLSearchParams.*/g, 'null;');
code = code.replace(/L\./g, 'mockL.');
code = code.replace(/let graph = \{\};/, 'window.graph = {}; let graph = window.graph;');
code = `
const fs = require('fs');
const turf = require('@turf/turf');
const features = JSON.parse(fs.readFileSync('./vsp_units.json', 'utf8'));
const document = { addEventListener: () => {} };
const map = { on: () => {} };
const mockL = { circleMarker: () => ({ bindTooltip: () => ({ addTo: () => {} }) }), polyline: () => ({ addTo: () => {} }), tileLayer: () => ({ addTo: () => {} }), control: { zoom: () => ({ addTo: () => {} }) } };
const window = { location: { search: '' }, graph: {} };
` + code + `
baueGlobalesNetzwerk(features);
let startKnotenId = waehleKnotenIdFuerName('7721_02_028', 'tuer');
let zielKnotenId = waehleKnotenIdFuerName('7723_00_039', '');
console.log("Start Node:", startKnotenId);
console.log("Ziel Node:", zielKnotenId);
let resultPfad = berechneDijkstra(startKnotenId, zielKnotenId, window.graph);
console.log("Pfad:", resultPfad ? resultPfad.length : "null");
`;

fs.writeFileSync('./test_exec.js', code);
