var map = L.map("map", {zoomControl: false}).setView([51.4816, 11.9691], 19);

L.control.zoom({position: "bottomright"}).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 22
}).addTo(map);

const START_RAUM = "7723_00_010";
const zielSuchwert = new URLSearchParams(window.location.search).get("ziel");

var ZIEL_RAUM = null;
var etagenListe = ["-1", "00", "01", "02", "03", "04", "05"];
var geladeneEtagen = {};
var routingPfad = null;
var globaleCentroids = {};
var aktuelleRoutenLinie = null;
var aktuelleZielEtage = "00";

function gibRaumEtage(raumName) {
    if (!raumName) {
        return "00";
    }

    return raumName.split("_")[1] || "00";
}

function gibRaumText(feature, feldName) {
    return String((feature.properties || {})[feldName] || "").toLowerCase();
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
    let type = f.properties.use_type;

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

    if (type === "Tuer") {
        return {
            color: "#f59e0b", weight: 2, fillOpacity: 0.8
        };
    }

    if (type === "Flur") {
        return {
            color: "#a8a29e", weight: 1, fillOpacity: 0.2
        };
    }

    if (type === "Treppenhaus" || type === "Aufzug") {
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
        aktuelleZielEtage = gibRaumEtage(ZIEL_RAUM);

        Object.keys(geladeneEtagen).forEach((etage) => {
            geladeneEtagen[etage].setStyle(gibFeatureStyle);
        });

        document.getElementById("info-box").innerText = `Ziel gefunden: ${ZIEL_RAUM}. Berechne globales 3D-Routing-Netzwerk...`;

        setTimeout(() => {
            let {graph, centroids} = baueGlobalesNetzwerk(alleFeatures);

            globaleCentroids = centroids;
            routingPfad = berechneDijkstra(START_RAUM, ZIEL_RAUM, graph);

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
    let graph = {};
    let centroids = {};

    features.forEach((f) => {
        let name = f.properties.name;

        if (!name) {
            return;
        }

        graph[name] = {};
        centroids[name] = turf.centroid(f).geometry.coordinates;
    });

    for (let i = 0; i < features.length; i++) {
        for (let j = i + 1; j < features.length; j++) {
            let f1 = features[i];
            let f2 = features[j];

            let n1 = f1.properties.name;
            let n2 = f2.properties.name;

            if (!n1 || !n2) {
                continue;
            }

            let t1 = f1.properties.use_type;
            let t2 = f2.properties.use_type;

            let etage1 = n1.split("_")[1];
            let etage2 = n2.split("_")[1];

            if (etage1 === etage2) {
                let isValidConnection = t1 === "Tuer" || t2 === "Tuer" || (t1 === "Flur" && t2 === "Flur") || t1 === "Treppenhaus" || t2 === "Treppenhaus";

                if (isValidConnection) {
                    try {
                        let f1Puffer = turf.buffer(f1, 0.5, {units: "meters"});

                        if (turf.booleanIntersects(f1Puffer, f2)) {
                            let distanz = turf.distance(turf.point(centroids[n1]), turf.point(centroids[n2]), {units: "meters"});

                            graph[n1][n2] = distanz;
                            graph[n2][n1] = distanz;
                        }
                    } catch (e) {
                    }
                }
            } else {
                let isVerticalElement = (t1 === "Treppenhaus" || t1 === "Aufzug") && (t2 === "Treppenhaus" || t2 === "Aufzug");

                if (isVerticalElement) {
                    let stockwerk1 = parseInt(etage1, 10);
                    let stockwerk2 = parseInt(etage2, 10);

                    if (Math.abs(stockwerk1 - stockwerk2) === 1) {
                        try {
                            if (turf.booleanIntersects(f1, f2)) {
                                graph[n1][n2] = 5;
                                graph[n2][n1] = 5;
                            }
                        } catch (e) {
                        }
                    }
                }
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

        routingPfad.forEach((raumName) => {
            let raumEtage = raumName.split("_")[1];

            if (raumEtage === zielEtage && globaleCentroids[raumName]) {
                let koord = globaleCentroids[raumName];
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