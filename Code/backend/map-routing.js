var map = L.map("map", {zoomControl: false}).setView([51.496796, 11.935968], 18);

L.control.zoom({position: "bottomright"}).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 22
}).addTo(map);

let START_RAUM = "7721_00_059b"; // Fallback
const zielSuchwert = new URLSearchParams(window.location.search).get("ziel");
const startSuchwert = new URLSearchParams(window.location.search).get("start");

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
        typ.includes("eingangstür") ||
        typ.includes("eingangstuer") ||
        typ.includes("ausgangstür") ||
        typ.includes("ausgangstuer")
    ) {
        return "eingang";
    }

    if (
        typ.includes("eingang") ||
        typ.includes("ausgang") ||
        typ.includes("windfang") ||
        typ.includes("uebergang")
    ) {
        return "lobby";
    }

    if (
        typ.includes("tuer")
    ) {
        return "tuer";
    }

    if (typ.includes("durchgang")) {
        return "durchgang";
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

    if (typ1 === "eingang" && typ2 === "vertikal") {
        return false;
    }

    if (typ2 === "eingang" && typ1 === "vertikal") {
        return false;
    }

    if (typ1 === "vertikal" && typ2 === "vertikal") {
        return true;
    }

    if (typ1 === "flur" || typ1 === "durchgang") {
        if (typ2 === "raum" || typ2 === "flur" || typ2 === "durchgang" || typ2 === "vertikal" || typ2 === "tuer" || typ2 === "eingang" || typ2 === "lobby") return true;
    }

    if (typ2 === "flur" || typ2 === "durchgang") {
        if (typ1 === "raum" || typ1 === "flur" || typ1 === "durchgang" || typ1 === "vertikal" || typ1 === "tuer" || typ1 === "eingang" || typ1 === "lobby") return true;
    }

    // Erlaube tuer-raum, tuer-flur, eingang-raum, eingang-flur, eingang-tuer
    if (typ1 === "tuer" || typ1 === "eingang" || typ1 === "lobby") {
        return true;
    }

    if (typ2 === "tuer" || typ2 === "eingang" || typ2 === "lobby") {
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

function habenKontakt(f1, f2, bufferDistance = 0.1) {
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
        const gepuffert1 = turf.buffer(f1, bufferDistance, {units: "meters"});

        if (turf.booleanIntersects(gepuffert1, f2)) {
            return true;
        }
    } catch (e) {
    }

    try {
        const gepuffert2 = turf.buffer(f2, bufferDistance, {units: "meters"});

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

    if (type === "tuer" || type === "eingang" || type === "durchgang" || type === "lobby") {
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

        if (startSuchwert) {
            const startFeature = findeRaum(alleFeatures, startSuchwert);
            if (startFeature) {
                START_RAUM = startFeature.properties.name;
            } else {
                console.warn("Startraum nicht gefunden, verwende Fallback:", startSuchwert);
            }
        }

        Object.keys(geladeneEtagen).forEach((etage) => {
            geladeneEtagen[etage].setStyle(gibFeatureStyle);
        });

        document.getElementById("info-box").innerText = `Ziel gefunden: ${ZIEL_RAUM}. Berechne globales 3D-Routing-Netzwerk...`;

        const overlay = document.getElementById("loading-overlay");
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.style.opacity = '1';
        }

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

            let startEtage = getRaumEtage(START_RAUM) || "00";
            if (!window.isInitialized) {
                window.isInitialized = true;
            }
            wechsleEtage(startEtage);

            const overlay = document.getElementById("loading-overlay");
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 300);
            }
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

        // Nutze pointOnFeature statt centroid, um sicherzustellen, dass der Punkt 
        // innerhalb des Polygons liegt (verhindert Probleme bei L-förmigen Fluren)
        try {
            centroids[nodeId] = turf.pointOnFeature(f).geometry.coordinates;
        } catch (e) {
            centroids[nodeId] = turf.centroid(f).geometry.coordinates;
        }

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

                    // Für externe Verbindungen (Gebäudeübergänge) erlauben wir eine höhere Toleranz (3.0 Meter), 
                    // da die Polygone draußen oft Lücken aufweisen.
                    if (istSameFloorVerbindungZulaessig(typ1, typ2) && habenKontakt(f1, f2, 3.0)) {
                        // Nur erlauben, wenn mindestens eines der Elemente eine Tür/Eingang ist,
                        // oder wenn zwei Außenwege (Flur) aneinandergrenzen.
                        if (typ1 === "tuer" || typ2 === "tuer" || (typ1 === "flur" && typ2 === "flur")) {
                            let distanz = turf.distance(turf.point(centroids[n1]), turf.point(centroids[n2]), {units: "meters"});

                            let isRaum1 = (typ1 !== "tuer" && typ1 !== "flur" && typ1 !== "vertikal" && typ1 !== "eingang" && typ1 !== "durchgang" && typ1 !== "lobby");
                            let isRaum2 = (typ2 !== "tuer" && typ2 !== "flur" && typ2 !== "vertikal" && typ2 !== "eingang" && typ2 !== "durchgang" && typ2 !== "lobby");
                            if (isRaum1 || isRaum2) {
                                distanz += 5000;
                            }
                            if (typ1 === "tuer" && typ2 === "tuer") {
                                distanz += 500;
                            }
                            
                            addEdge(graph, n1, n2, distanz);
                        }
                    }
                }
                continue;
            }

            if (etage1 === etage2) {
                let typ1 = meta1.typ;
                let typ2 = meta2.typ;
                let gebaeude1 = meta1.gebaeude;
                let gebaeude2 = meta2.gebaeude;

                // Verhindere, dass normale Innentüren ("tuer") sich mit Wegen anderer Gebäude verbinden.
                // Dadurch wird erzwungen, dass man Gebäude nur durch offizielle Eingänge ("eingang", "lobby", etc.) betritt.
                if ((typ1 === "tuer" || typ2 === "tuer") && gebaeude1 !== gebaeude2) {
                    continue;
                }

                // Erlaube 3.0 Meter Lücken-Toleranz für bestimmte Kombinationen draußen.
                // Dadurch werden ungenau gezeichnete Wege (durchgang, flur), Außentreppen und Gebäude-Eingänge verbunden.
                // Für reine Gebäude-interne Wege mit normalen Türen (tuer-flur, tuer-tuer) MÜSSEN wir strikt bei 0.1m bleiben!
                let puffer = 0.1;

                const isOutdoorType = (t) => t === "flur" || t === "durchgang" || t === "eingang" || t === "vertikal";

                if (isOutdoorType(typ1) && isOutdoorType(typ2)) {
                    // Ausnahmen: eingang-eingang und vertikal-eingang bleiben bei 0.1m, um internes Springen zu verhindern
                    if (!(typ1 === "eingang" && typ2 === "eingang") &&
                        !(typ1 === "vertikal" && typ2 === "eingang") &&
                        !(typ1 === "eingang" && typ2 === "vertikal")) {
                        puffer = 3.0;
                    }
                }

                if (istSameFloorVerbindungZulaessig(typ1, typ2) && habenKontakt(f1, f2, puffer)) {
                    let distanz = turf.distance(turf.point(centroids[n1]), turf.point(centroids[n2]), {units: "meters"});

                    let isRaum1 = (typ1 !== "tuer" && typ1 !== "flur" && typ1 !== "vertikal" && typ1 !== "eingang" && typ1 !== "durchgang" && typ1 !== "lobby");
                    let isRaum2 = (typ2 !== "tuer" && typ2 !== "flur" && typ2 !== "vertikal" && typ2 !== "eingang" && typ2 !== "durchgang" && typ2 !== "lobby");

                    // Verhindere, dass der Algorithmus durch fremde Räume abkürzt!
                    // Eine massive Distanz-Strafe sorgt dafür, dass Flure bevorzugt werden.
                    if (isRaum1 || isRaum2) {
                        distanz += 5000;
                    }

                    // Bestrafe auch direkte Tür-zu-Tür Sprünge leicht, es sei denn es gibt keinen anderen Weg
                    if (typ1 === "tuer" && typ2 === "tuer") {
                        distanz += 500;
                    }

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

function berechneUebergang(f1, f2) {
    if (!f1 || !f2) return null;

    // 1. Echter Schnittpunkt
    try {
        let intersection = turf.intersect(f1, f2);
        if (intersection) {
            return turf.centroid(intersection).geometry.coordinates;
        }
    } catch (e) {
    }

    // 2. Fallbacks mit größer werdenden Puffern (um Lücken zu schließen)
    let buffers = [0.2, 1.0, 3.0];
    for (let b of buffers) {
        try {
            let buf1 = turf.buffer(f1, b, {units: "meters"});
            let intersection = turf.intersect(buf1, f2);
            if (intersection) {
                return turf.centroid(intersection).geometry.coordinates;
            }
        } catch (e) {
        }

        try {
            let buf2 = turf.buffer(f2, b, {units: "meters"});
            let intersection = turf.intersect(f1, buf2);
            if (intersection) {
                return turf.centroid(intersection).geometry.coordinates;
            }
        } catch (e) {
        }
    }

    // 3. Fallback: Wenn alle Intersections fehlschlagen, nimm den exakten Mittelpunkt zwischen den beiden Features!
    // Das verhindert, dass Knoten übersprungen werden und die Linie durch Wände "schwebt".
    try {
        let c1 = turf.centroid(f1).geometry.coordinates;
        let c2 = turf.centroid(f2).geometry.coordinates;
        return [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2];
    } catch (e) {
        return null;
    }
}

window.wechsleEtage = function (zielEtage) {
    Object.values(geladeneEtagen).forEach((layer) => map.removeLayer(layer));

    if (aktuelleRoutenLinie) {
        map.removeLayer(aktuelleRoutenLinie);
        aktuelleRoutenLinie = null;
    }

    if (window.aktuelleRoutenMarker) {
        window.aktuelleRoutenMarker.forEach(m => map.removeLayer(m));
    }
    window.aktuelleRoutenMarker = [];

    if (geladeneEtagen[zielEtage]) {
        geladeneEtagen[zielEtage].addTo(map);
    }

    document.querySelectorAll(".etagen-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.etage === zielEtage);
    });

    if (routingPfad) {
        let koordinatenFuerDieseEtage = [];

        routingPfad.forEach((knotenId, index) => {
            let meta = globaleKnotenMeta[knotenId] || {};
            let raumEtage = meta.etage || "00";
            let typ = meta.typ;
            let currentFeature = meta.feature;

            if (raumEtage === zielEtage) {
                // 1. Zeichne den Mittelpunkt des Features (NUR für Start/Ende, und Räume überspringen)
                let isStartOrEnd = (index === 0 || index === routingPfad.length - 1);
                let isRaum = (typ !== "tuer" && typ !== "flur" && typ !== "vertikal" && typ !== "eingang" && typ !== "durchgang" && typ !== "lobby");

                // WICHTIG: Für Zwischenknoten (wie Flure) lassen wir den Mittelpunkt komplett weg!
                // Dadurch entsteht kein "V" mehr, die Linie verläuft direkt vom einen Übergang zum nächsten.
                if (isStartOrEnd && !isRaum && globaleCentroids[knotenId]) {
                    let koord = globaleCentroids[knotenId];
                    koordinatenFuerDieseEtage.push([koord[1], koord[0]]);
                }

                // 2. Zeichne den perfekten Übergangspunkt (Schnittmenge) zum nächsten Feature
                if (index < routingPfad.length - 1) {
                    let nextId = routingPfad[index + 1];
                    let nextMeta = globaleKnotenMeta[nextId] || {};
                    if (nextMeta.etage === zielEtage && currentFeature && nextMeta.feature) {
                        let uebergang = berechneUebergang(currentFeature, nextMeta.feature);
                        if (uebergang) {
                            koordinatenFuerDieseEtage.push([uebergang[1], uebergang[0]]);
                        }
                    }
                }

                // 3. Markierung für Etagenwechsel (Treppen/Aufzüge)
                if (typ === "vertikal" && globaleCentroids[knotenId]) {
                    let koord = globaleCentroids[knotenId];
                    let nextId = routingPfad[index + 1];
                    let prevId = routingPfad[index - 1];
                    let nextMeta = nextId ? globaleKnotenMeta[nextId] : null;
                    let prevMeta = prevId ? globaleKnotenMeta[prevId] : null;

                    let msg = "Treppe / Aufzug";
                    if (nextMeta && nextMeta.etage !== zielEtage) {
                        msg = `Hier Etage wechseln (nach ${nextMeta.etage})`;
                    } else if (prevMeta && prevMeta.etage !== zielEtage) {
                        msg = `Von Etage ${prevMeta.etage} kommend`;
                    }

                    let m = L.circleMarker([koord[1], koord[0]], {
                        radius: 7,
                        fillColor: "#ec4899",
                        color: "#fff",
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 1
                    }).bindTooltip(msg, {
                        permanent: true,
                        direction: "right",
                        className: "floor-change-tooltip"
                    }).addTo(map);
                    window.aktuelleRoutenMarker.push(m);
                }
            }
        });

        if (koordinatenFuerDieseEtage.length > 0) {
            aktuelleRoutenLinie = L.polyline(koordinatenFuerDieseEtage, {
                color: "#ec4899", weight: 5, dashArray: "10, 10", lineJoin: "round"
            }).addTo(map);
        }
    }
};
