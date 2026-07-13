const fs = require('fs');
const turf = require('@turf/turf');

// Helper functions copied from map-routing.js
const VERBINDUNGS_TYPEN = new Set(["tuer", "flur", "treppenhaus", "vertikal"]);

function normalisiereTyp(type) {
    return String(type || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function klassifiziereTyp(feature) {
    const typ = normalisiereTyp(feature?.properties?.use_type);
    if (!typ) return "";
    if (typ.includes("eingangstür") || typ.includes("eingangstuer") || typ.includes("ausgangstür") || typ.includes("ausgangstuer")) return "eingang";
    if (typ.includes("eingang") || typ.includes("ausgang") || typ.includes("windfang") || typ.includes("uebergang")) return "lobby";
    if (typ.includes("tuer")) return "tuer";
    if (typ.includes("durchgang")) return "durchgang";
    if (typ.includes("treppenhaus") || typ.includes("treppe") || typ.includes("aufzug")) return "vertikal";
    if (typ.includes("flur")) return "flur";
    return typ;
}

function getRaumBuilding(raumName) {
    return String(raumName || "").split("_")[0] || "";
}

function getRaumEtage(raumName) {
    return String(raumName || "").split("_")[1] || "00";
}

function getFeatureTyp(feature) {
    return klassifiziereTyp(feature);
}

function istVerbindungsTyp(feature) {
    return VERBINDUNGS_TYPEN.has(getFeatureTyp(feature));
}

function istVertikalTyp(feature) {
    return getFeatureTyp(feature) === "vertikal";
}

function istSameFloorVerbindungZulaessig(typ1, typ2) {
    if (!typ1 || !typ2) return false;
    if (typ1 === "tuer" && typ2 === "vertikal") return false;
    if (typ2 === "tuer" && typ1 === "vertikal") return false;
    if (typ1 === "eingang" && typ2 === "vertikal") return false;
    if (typ2 === "eingang" && typ1 === "vertikal") return false;
    if (typ1 === "vertikal" && typ2 === "vertikal") return true;
    if (typ1 === "flur" || typ1 === "durchgang") {
        if (["raum", "flur", "durchgang", "vertikal", "tuer", "eingang", "lobby"].includes(typ2)) return true;
    }
    if (typ2 === "flur" || typ2 === "durchgang") {
        if (["raum", "flur", "durchgang", "vertikal", "tuer", "eingang", "lobby"].includes(typ1)) return true;
    }
    if (["tuer", "eingang", "lobby"].includes(typ1)) return true;
    if (["tuer", "eingang", "lobby"].includes(typ2)) return true;
    return false;
}

function erstelleKnotenId(feature, index) {
    const props = feature.properties || {};
    const name = String(props.name || `knoten_${index}`);
    const gid = props.gid != null ? String(props.gid) : String(index);
    return `${name}__${gid}`;
}

function habenKontakt(f1, f2, bufferDistance = 0.1) {
    try {
        if (turf.booleanIntersects(f1, f2)) return true;
    } catch (e) {
    }

    if (!istVerbindungsTyp(f1) && !istVerbindungsTyp(f2)) return false;

    try {
        const gepuffert1 = turf.buffer(f1, bufferDistance, {units: "meters"});
        if (turf.booleanIntersects(gepuffert1, f2)) return true;
    } catch (e) {
    }

    try {
        const gepuffert2 = turf.buffer(f2, bufferDistance, {units: "meters"});
        return turf.booleanIntersects(f1, gepuffert2);
    } catch (e) {
        return false;
    }
}

function addEdge(graph, from, to, cost) {
    if (!graph[from]) graph[from] = {};
    if (!graph[to]) graph[to] = {};
    graph[from][to] = cost;
    graph[to][from] = cost;
}

// Load data
let etagenListe = ["-1", "00", "01", "02", "03", "04", "05"];
let alleFeatures = [];

// Try to load vsp_units.json which has everything
try {
    const data = JSON.parse(fs.readFileSync('./vsp_units.json', 'utf8'));
    alleFeatures = data.map(d => {
        // convert to GeoJSON feature format expected by turf
        return {
            type: "Feature",
            properties: d,
            geometry: d.geom
        };
    });
} catch (e) {
    console.log("Could not read vsp_units.json. Error:", e.message);
    process.exit(1);
}

console.log(`Loaded ${alleFeatures.length} features. Building graph...`);

let graph = {};
let centroids = {};
let nodeMeta = {};
let valideFeatures = alleFeatures.filter(f => f?.properties?.name);

valideFeatures.forEach((f, index) => {
    const props = f.properties || {};
    const name = String(props.name || "");
    const nodeId = erstelleKnotenId(f, index);
    graph[nodeId] = {};

    try {
        centroids[nodeId] = turf.pointOnFeature(f).geometry.coordinates;
    } catch (e) {
        try {
            centroids[nodeId] = turf.centroid(f).geometry.coordinates;
        } catch (err) {
            centroids[nodeId] = [0, 0];
        }
    }

    nodeMeta[nodeId] = {
        name: name,
        typ: getFeatureTyp(f),
        rawTyp: normalisiereTyp(props.use_type),
        gebaeude: getRaumBuilding(name),
        etage: getRaumEtage(name)
    };
});

console.log("Nodes initialized. Connecting edges...");

for (let i = 0; i < valideFeatures.length; i++) {
    for (let j = i + 1; j < valideFeatures.length; j++) {
        let f1 = valideFeatures[i];
        let f2 = valideFeatures[j];

        let n1 = erstelleKnotenId(f1, i);
        let n2 = erstelleKnotenId(f2, j);
        let meta1 = nodeMeta[n1];
        let meta2 = nodeMeta[n2];
        let etage1 = meta1.etage;
        let etage2 = meta2.etage;

        if (etage1 === etage2) {
            let typ1 = meta1.typ;
            let typ2 = meta2.typ;
            let gebaeude1 = meta1.gebaeude;
            let gebaeude2 = meta2.gebaeude;

            if ((typ1 === "tuer" || typ2 === "tuer") && gebaeude1 !== gebaeude2) continue;

            let puffer = 0.1;
            const isOutdoorType = (t) => t === "flur" || t === "durchgang" || t === "eingang" || t === "vertikal";

            if (isOutdoorType(typ1) && isOutdoorType(typ2)) {
                if (!(typ1 === "eingang" && typ2 === "eingang") &&
                    !(typ1 === "vertikal" && typ2 === "eingang") &&
                    !(typ1 === "eingang" && typ2 === "vertikal")) {
                    puffer = 3.0;
                }
            }

            if (istSameFloorVerbindungZulaessig(typ1, typ2) && habenKontakt(f1, f2, puffer)) {
                let p1 = centroids[n1];
                let p2 = centroids[n2];
                let distanz = turf.distance(turf.point(p1), turf.point(p2), {units: "meters"});

                let isRaum1 = !["tuer", "flur", "vertikal", "eingang", "durchgang", "lobby"].includes(typ1);
                let isRaum2 = !["tuer", "flur", "vertikal", "eingang", "durchgang", "lobby"].includes(typ2);

                if (isRaum1 || isRaum2) distanz += 5000;
                if (typ1 === "tuer" && typ2 === "tuer") distanz += 500;

                addEdge(graph, n1, n2, distanz);
            }
        } else {
            let stockwerk1 = parseInt(etage1, 10);
            let stockwerk2 = parseInt(etage2, 10);

            if (Math.abs(stockwerk1 - stockwerk2) === 1 && istVertikalTyp(f1) && istVertikalTyp(f2) && habenKontakt(f1, f2)) {
                addEdge(graph, n1, n2, 5);
            }
        }
    }
}

fs.writeFileSync('./graph.json', JSON.stringify({graph, centroids, nodeMeta}));
console.log("Done! Saved to graph.json");
