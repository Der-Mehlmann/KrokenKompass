var map = L.map("map", {zoomControl: false}).setView([51.4816, 11.9691], 19);

L.control.zoom({position: "bottomright"}).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 22
}).addTo(map);

const START_RAUM = "7721_00_011";
const zielSuchwert = new URLSearchParams(window.location.search).get("ziel");

var ZIEL_RAUM = null;
var etagenListe = ["-1", "00", "01", "02", "03", "04", "05"];
var geladeneEtagen = {};
var routingPfad = null;
var globaleCentroids = {};
var globaleKnotenMeta = {};
var globaleKnotenIdsByName = {};
var globaleZielTyp = null;
var aktuelleRoutenLinie = null;
var aktuelleZielEtage = "00";

const VERBINDUNGS_TYPEN = new Set(["tuer", "flur", "treppenhaus", "vertikal"]);
const GEBAEUDE_UEBERGANG_MAX_DISTANZ_METERS = 22;

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

    if (!typ) {
        return "";
    }

    if (
        typ.includes("eingang") ||
        typ.includes("ausgang") ||
        typ.includes("tuer") ||
        typ.includes("durchgang") ||
        typ.includes("windfang") ||
        typ.includes("uebergang")
    ) {
        return "tuer";
    }

    if (typ.includes("treppenhaus") || typ.includes("treppe") || typ.includes("aufzug")) {
        return "vertikal";
    }

    if (typ.includes("flur")) {
        return "flur";
    }

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

function istGebaeudeUebergangTyp(feature) {
    return getFeatureTyp(feature) === "tuer";
}

function istExpliziterGebaeudeUebergang(feature) {
    const typ = normalisiereTyp(feature?.properties?.use_type);
    if (!typ) {
        return false;
    }
    // Nur explizit als Eingang, Ausgang oder Übergang markierte Elemente erlauben
    return typ.includes("eingang") || typ.includes("ausgang") || typ.includes("uebergang");
}

function istSameFloorVerbindungZulaessig(typ1, typ2) {
    if (!typ1 || !typ2) {
        return false;
    }

    if (typ1 === "tuer" && typ2 === "vertikal") {
        return false;
    }

    if (typ2 === "tuer" && typ1 === "vertikal") {
        return false;
    }

    if (typ1 === "vertikal" && typ2 === "vertikal") {
        return true;
    }

    if (typ1 === "flur" && (typ2 === "raum" || typ2 === "flur" || typ2 === "vertikal" || typ2 === "tuer")) {
        return true;
    }

    if (typ2 === "flur" && (typ1 === "raum" || typ1 === "flur" || typ1 === "vertikal" || typ1 === "tuer")) {
        return true;
    }

    if (typ1 === "tuer" && (typ2 === "raum" || typ2 === "flur" || typ2 === "tuer")) {
        return true;
    }

    if (typ2 === "tuer" && (typ1 === "raum" || typ1 === "flur" || typ1 === "tuer")) {
        return true;
    }

    return false;
}

function erstelleKnotenId(feature, index) {
    const props = feature.properties || {};
    const name = String(props.name || `knoten_${index}`);
    const gid = props.gid != null ? String(props.gid) : String(index);

    return `${name}__${gid}`;
}

function priorisiereTyp(typ, zielTyp) {
    const typNorm = normalisiereTyp(typ);

    if (zielTyp && typNorm === zielTyp) {
        return 0;
    }

    if (typNorm === "tuer") {
        return 1;
    }

    if (typNorm === "flur") {
        return 2;
    }

    if (typNorm === "vertikal") {
        return 3;
    }

    return 4;
}

function waehleKnotenIdFuerName(name, zielTyp = null) {
    const ids = globaleKnotenIdsByName[name] || [];

    if (!ids.length) {
        return null;
    }

    let besteId = ids[0];
    let bestePrioritaet = Infinity;

    ids.forEach((id) => {
        const meta = globaleKnotenMeta[id] || {};
        const prioritaet = priorisiereTyp(meta.typ, zielTyp);

        if (prioritaet < bestePrioritaet) {
            bestePrioritaet = prioritaet;
            besteId = id;
        }
    });

    return besteId;
}

function addEdge(graph, from, to, cost) {
    graph[from][to] = cost;
    graph[to][from] = cost;
}

function habenKontakt(f1, f2) {
    try {
        if (turf.booleanIntersects(f1, f2)) {
            return true;
        }
    } catch (e) {
    }

    if (!istVerbindungsTyp(f1) && !istVerbindungsTyp(f2)) {
        return false;
    }

    try {
        const gepuffert1 = turf.buffer(f1, 0.1, {units: "meters"});

        if (turf.booleanIntersects(gepuffert1, f2)) {
            return true;
        }
    } catch (e) {
    }

    try {
        const gepuffert2 = turf.buffer(f2, 0.1, {units: "meters"});

        return turf.booleanIntersects(f1, gepuffert2);
    } catch (e) {
        return false;
    }
}

function gibRaumEtage(raumName) {
    if (!raumName) {
        return "00";
    }

    return raumName.split("_")[1] || "00";
}

function findeRaum(features, suchwert) {
    if (!suchwert) {
        return null;
    }

    const normalisierterSuchwert = suchwert.trim().toLowerCase();

    return features.find((feature) => {
        const properties = feature.properties || {};

        const name = String(properties.name || "").toLowerCase();
        const unitId = String(properties.unit_id || "").toLowerCase();
        const bezeichnung = String(properties.bezeichnung || "").toLowerCase();
        const displayName = String(properties.display_name || "").toLowerCase();
        const useType = String(properties.use_type || "").toLowerCase();

        return (name === normalisierterSuchwert || unitId === normalisierterSuchwert || bezeichnung === normalisierterSuchwert || displayName === normalisierterSuchwert || useType === normalisierterSuchwert || name.includes(normalisierterSuchwert) || unitId.includes(normalisierterSuchwert) || bezeichnung.includes(normalisierterSuchwert) || displayName.includes(normalisierterSuchwert));
    });
}

function gibFeatureStyle(f) {
    let type = getFeatureTyp(f);

    if (f.properties.name === START_RAUM) {
        return {
            color: "#16a34a", fillColor: "#22c55e", fillOpacity: 0.7, weight: 3
        };
    }

    if (ZIEL_RAUM && f.properties.name === ZIEL_RAUM) {
        return {
            color: "#dc2626", fillColor: "#ef4444", fillOpacity: 0.7, weight: 3
        };
    }

    if (type === "tuer") {
        return {
            color: "#f59e0b", weight: 2, fillOpacity: 0.8
        };
    }

    if (type === "flur") {
        return {
            color: "#a8a29e", weight: 1, fillOpacity: 0.2
        };
    }

    if (type === "vertikal") {
        return {
            color: "#8b5cf6", fillColor: "#a78bfa", fillOpacity: 0.5
        };
    }

    return {
        color: "#4a4a4a", weight: 1.5, fillColor: "#3388ff", fillOpacity: 0.4
    };
}

function erstelleEtagenLayer(data) {
    return L.geoJSON(data, {
        style: gibFeatureStyle, onEachFeature: (f, layer) => {
            const properties = f.properties || {};
            layer.bindPopup(`${properties.name || "-"} (${properties.use_type || "-"})`);
        }
    });
}

var ladeProzesse = etagenListe.map((etage) => fetch(`./Data/vsp_etage_${etage}.json`).then((response) => {
    if (!response.ok) {
        throw new Error(`Datei konnte nicht geladen werden: vsp_etage_${etage}.json`);
    }

    return response.json();
}));

Promise.all(ladeProzesse)
    .then((ergebnisse) => {
        let alleFeatures = [];

        ergebnisse.forEach((data, index) => {
            let etage = etagenListe[index];
            alleFeatures = alleFeatures.concat(data.features || []);
            geladeneEtagen[etage] = erstelleEtagenLayer(data);
        });

        if (!zielSuchwert) {
            document.getElementById("info-box").innerText = "Keine Zieleingabe übergeben. Bitte zuerst über Kürzel eingeben suchen.";
            wechsleEtage("00");
            return;
        }

        const zielFeature = findeRaum(alleFeatures, zielSuchwert);

        if (!zielFeature) {
            document.getElementById("info-box").innerText = `Zielraum nicht gefunden: ${zielSuchwert}`;
            wechsleEtage("00");
            return;
        }

        ZIEL_RAUM = zielFeature.properties.name;
        globaleZielTyp = getFeatureTyp(zielFeature);
        aktuelleZielEtage = gibRaumEtage(ZIEL_RAUM);

        Object.keys(geladeneEtagen).forEach((etage) => {
            geladeneEtagen[etage].setStyle(gibFeatureStyle);
        });

        document.getElementById("info-box").innerText = `Ziel gefunden: ${ZIEL_RAUM}. Berechne globales 3D-Routing-Netzwerk...`;

        setTimeout(() => {
            let {graph, centroids} = baueGlobalesNetzwerk(alleFeatures);

            globaleCentroids = centroids;
            const startKnotenId = waehleKnotenIdFuerName(START_RAUM, "tuer");
            const zielKnotenId = waehleKnotenIdFuerName(ZIEL_RAUM, globaleZielTyp);

            routingPfad = berechneDijkstra(startKnotenId, zielKnotenId, graph);

            if (routingPfad) {
                document.getElementById("info-box").innerHTML = `<strong>Route gefunden!</strong> Ziel: ${ZIEL_RAUM} (${routingPfad.length} Wegpunkte)`;
            } else {
                document.getElementById("info-box").innerText = "Keine Route gefunden. Fehlen Treppenverbindungen oder ist der Raum nicht erreichbar?";
            }

            wechsleEtage("00");
        }, 100);
    })
    .catch((err) => {
        console.error("FEHLER BEIM LADEN DER GEBÄUDEDATEN:", err);
        document.getElementById("info-box").innerText = "Gebäudedaten konnten nicht geladen werden.";
    });

function baueGlobalesNetzwerk(features) {
    globaleKnotenMeta = {};
    globaleKnotenIdsByName = {};

    let graph = {};
    let centroids = {};
    let nodeIdsByName = {};
    let valideFeatures = features.filter((f) => f?.properties?.name);

    valideFeatures.forEach((f, index) => {
        const props = f.properties || {};
        const name = String(props.name || "");
        const nodeId = erstelleKnotenId(f, index);

        graph[nodeId] = {};
        centroids[nodeId] = turf.centroid(f).geometry.coordinates;
        globaleKnotenMeta[nodeId] = {
            name: name,
            typ: getFeatureTyp(f),
            rawTyp: normalisiereTyp(props.use_type),
            gebaeude: getRaumBuilding(name),
            etage: getRaumEtage(name),
            feature: f
        };

        if (!nodeIdsByName[name]) {
            nodeIdsByName[name] = [];
        }

        nodeIdsByName[name].push(nodeId);
    });

    globaleKnotenIdsByName = nodeIdsByName;

    for (let i = 0; i < valideFeatures.length; i++) {
        for (let j = i + 1; j < valideFeatures.length; j++) {
            let f1 = valideFeatures[i];
            let f2 = valideFeatures[j];
            let n1 = erstelleKnotenId(f1, i);
            let n2 = erstelleKnotenId(f2, j);

            if (!n1 || !n2) {
                continue;
            }

            let meta1 = globaleKnotenMeta[n1] || {};
            let meta2 = globaleKnotenMeta[n2] || {};

            let gebaeude1 = meta1.gebaeude || getRaumBuilding(meta1.name);
            let gebaeude2 = meta2.gebaeude || getRaumBuilding(meta2.name);
            let etage1 = meta1.etage || getRaumEtage(meta1.name);
            let etage2 = meta2.etage || getRaumEtage(meta2.name);

            if (gebaeude1 !== gebaeude2) {
                if (etage1 === etage2) {
                    let typ1 = meta1.typ;
                    let typ2 = meta2.typ;

                    if (istSameFloorVerbindungZulaessig(typ1, typ2) && habenKontakt(f1, f2)) {
                        // Nur erlauben, wenn mindestens eines der Elemente eine Tür/Eingang ist,
                        // oder wenn zwei Außenwege (Flur) aneinandergrenzen.
                        if (typ1 === "tuer" || typ2 === "tuer" || (typ1 === "flur" && typ2 === "flur")) {
                            let distanz = turf.distance(turf.point(centroids[n1]), turf.point(centroids[n2]), {units: "meters"});
                            addEdge(graph, n1, n2, distanz);
                        }
                    }
                }
                continue;
            }

            if (etage1 === etage2) {
                let typ1 = meta1.typ;
                let typ2 = meta2.typ;

                if (istSameFloorVerbindungZulaessig(typ1, typ2) && habenKontakt(f1, f2)) {
                    let distanz = turf.distance(turf.point(centroids[n1]), turf.point(centroids[n2]), {units: "meters"});

                    addEdge(graph, n1, n2, distanz);
                }

                continue;
            }

            let stockwerk1 = parseInt(etage1, 10);
            let stockwerk2 = parseInt(etage2, 10);

            if (Math.abs(stockwerk1 - stockwerk2) === 1 && istVertikalTyp(f1) && istVertikalTyp(f2) && habenKontakt(f1, f2)) {
                addEdge(graph, n1, n2, 5);
            }
        }
    }

    return {graph, centroids};
}

function berechneDijkstra(start, ziel, graph) {
    if (!graph[start] || !graph[ziel]) {
        return null;
    }

    let costs = {};
    let parents = {};
    let processed = new Set();

    for (let node in graph) {
        costs[node] = Infinity;
    }

    costs[start] = 0;

    let getLowest = () => Object.keys(costs).reduce((lowest, n) => {
        if ((lowest === null || costs[n] < costs[lowest]) && !processed.has(n)) {
            return n;
        }

        return lowest;
    }, null);

    let node = getLowest();

    while (node) {
        let cost = costs[node];
        let neighbors = graph[node];

        for (let n in neighbors) {
            let newCost = cost + neighbors[n];

            if (newCost < costs[n]) {
                costs[n] = newCost;
                parents[n] = node;
            }
        }

        processed.add(node);
        node = getLowest();
    }

    let pfad = [ziel];
    let parent = parents[ziel];

    while (parent) {
        pfad.push(parent);
        parent = parents[parent];
    }

    pfad.reverse();

    return pfad[0] === start ? pfad : null;
}

window.wechsleEtage = function (zielEtage) {
    Object.values(geladeneEtagen).forEach((layer) => map.removeLayer(layer));

    if (aktuelleRoutenLinie) {
        map.removeLayer(aktuelleRoutenLinie);
        aktuelleRoutenLinie = null;
    }

    if (geladeneEtagen[zielEtage]) {
        geladeneEtagen[zielEtage].addTo(map);
    }

    document.querySelectorAll(".etagen-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.etage === zielEtage);
    });

    if (routingPfad) {
        let koordinatenFuerDieseEtage = [];

        routingPfad.forEach((knotenId) => {
            let raumEtage = (globaleKnotenMeta[knotenId] || {}).etage || "00";

            if (raumEtage === zielEtage && globaleCentroids[knotenId]) {
                let koord = globaleCentroids[knotenId];
                koordinatenFuerDieseEtage.push([koord[1], koord[0]]);
            }
        });

        if (koordinatenFuerDieseEtage.length > 0) {
            aktuelleRoutenLinie = L.polyline(koordinatenFuerDieseEtage, {
                color: "#ec4899", weight: 5, dashArray: "10, 10", lineJoin: "round"
            }).addTo(map);
        }
    }
};
