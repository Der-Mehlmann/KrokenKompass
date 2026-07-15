const fs = require('fs');
const turf = require('@turf/turf');
const features = JSON.parse(fs.readFileSync('./vsp_units.json', 'utf8'));
// ... I will just read map-routing.js directly and use it!
