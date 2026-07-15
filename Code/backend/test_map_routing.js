const fs = require('fs');
const turf = require('@turf/turf');

const features = JSON.parse(fs.readFileSync('./vsp_units.json', 'utf8'));
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
    if (typ1 === "eingang" || typ2 === "eingang") return true;
    if (typ1 === "lobby" || typ2 === "lobby") return true;
    return false;
}

function habenKontakt(f1, f2, bufferDistance = 0.1) {
    if (!f1 || !f2) return false;
    try {
        let gepuffert1 = turf.buffer(f1, bufferDistance, {units: "meters"});
        let gepuffert2 = turf.buffer(f2, bufferDistance, {units: "meters"});
        return turf.booleanIntersects(gepuffert1, gepuffert2);
    } catch (e) {
        return false;
    }
}

function erstelleKnotenId(feature, index) {
    const props = feature.properties || {};
    const baseName = props.name || "unbekannt";
    return `${baseName}__${index}`;
}

function baueGlobalesNetzwerk(features) {
    let graph = {};
    let valideFeatures = features.filter((f) => f?.properties?.name);
    let globaleKnotenMeta = {};
    let centroids = {};

    valideFeatures.forEach((f, index) => {
        const name = String(f.properties.name || "");
        const nodeId = erstelleKnotenId(f, index);
        graph[nodeId] = {};
        try {
            centroids[nodeId] = turf.pointOnFeature(f).geometry.coordinates;
        } catch (e) {
            centroids[nodeId] = turf.centroid(f).geometry.coordinates;
        }
        globaleKnotenMeta[nodeId] = {
            name,
            typ: getFeatureTyp(f),
            gebaeude: getRaumBuilding(name),
            etage: getRaumEtage(name)
        };
    });

    for (let i = 0; i < valideFeatures.length; i++) {
        for (let j = i + 1; j < valideFeatures.length; j++) {
            let f1 = valideFeatures[i], f2 = valideFeatures[j];
            let n1 = erstelleKnotenId(f1, i), n2 = erstelleKnotenId(f2, j);
            let meta1 = globaleKnotenMeta[n1], meta2 = globaleKnotenMeta[n2];
            let gebaeude1 = meta1.gebaeude, gebaeude2 = meta2.gebaeude;
            let etage1 = meta1.etage, etage2 = meta2.etage;

            if (gebaeude1 !== gebaeude2) {
                if (etage1 === etage2) {
                    let typ1 = meta1.typ, typ2 = meta2.typ;
                    if (istSameFloorVerbindungZulaessig(typ1, typ2) && habenKontakt(f1, f2, 3.0)) {
                        if (typ1 === "tuer" || typ2 === "tuer" || (typ1 === "flur" && typ2 === "flur")) {
                            let distanz = turf.distance(turf.point(centroids[n1]), turf.point(centroids[n2]), {units: "meters"});
                            graph[n1][n2] = distanz;
                            graph[n2][n1] = distanz;
                        }
                    }
                }
                continue;
            }

            if (etage1 === etage2) {
                let typ1 = meta1.typ, typ2 = meta2.typ;
                if ((typ1 === "tuer" || typ2 === "tuer") && gebaeude1 !== gebaeude2) continue;
                let puffer = 0.1;
                const isOutdoorType = (t) => t === "flur" || t === "durchgang" || t === "eingang" || t === "vertikal";
                if (isOutdoorType(typ1) && isOutdoorType(typ2)) puffer = 1.0;
                if ((typ1 === "eingang" && typ2 === "lobby") || (typ1 === "lobby" && typ2 === "eingang")) puffer = 1.0;

                if (istSameFloorVerbindungZulaessig(typ1, typ2) && habenKontakt(f1, f2, puffer)) {
                    let isRaum1 = (typ1 !== "tuer" && typ1 !== "flur" && typ1 !== "vertikal" && typ1 !== "eingang" && typ1 !== "durchgang" && typ1 !== "lobby");
                    let isRaum2 = (typ2 !== "tuer" && typ2 !== "flur" && typ2 !== "vertikal" && typ2 !== "eingang" && typ2 !== "durchgang" && typ2 !== "lobby");

                    let distanz = turf.distance(turf.point(centroids[n1]), turf.point(centroids[n2]), {units: "meters"});
                    if (isRaum1 || isRaum2) distanz += 5000;
                    if (typ1 === "tuer" && typ2 === "tuer") distanz += 500;
                    graph[n1][n2] = distanz;
                    graph[n2][n1] = distanz;
                }
            } else {
                if (Math.abs(parseInt(etage1) - parseInt(etage2)) === 1 && istVertikalTyp(f1) && istVertikalTyp(f2) && habenKontakt(f1, f2)) {
                    let distanz = turf.distance(turf.point(centroids[n1]), turf.point(centroids[n2]), {units: "meters"}) + 10;
                    graph[n1][n2] = distanz;
                    graph[n2][n1] = distanz;
                }
            }
        }
    }
    return graph;
}

const g = baueGlobalesNetzwerk(features);
console.log("Edges for 1627:", g["7721_02_028__1627"]);
