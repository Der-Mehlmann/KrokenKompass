class LeafletMapContainer extends HTMLElement {
    connectedCallback() {
        if (this.initialized) return;
        this.initialized = true;

        this.innerHTML = `<div id="leaflet-map" style="width: 100%; height: 100%; z-index: 1;"></div>`;

        // Leaflet setup for KrokenKompass Elm SPA
        window.map = L.map(this.querySelector('#leaflet-map'), {zoomControl: false}).setView([51.496796, 11.935968], 18);
        L.control.zoom({position: "bottomright"}).addTo(window.map);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom: 22}).addTo(window.map);

        // Ensure Leaflet resizes correctly when container becomes visible
        const resizeObserver = new ResizeObserver(() => {
            if (window.map) {
                window.map.invalidateSize();
            }
        });
        resizeObserver.observe(this);

        var etagenListe = ["-1", "00", "01", "02", "03", "04", "05"];
        var geladeneEtagen = {};
        window.aktuelleZielEtage = "00";
        var aktuelleRoutenLinie = null;

        function normalisiereTyp(type) {
            return String(type || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
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

        function gibFeatureStyle(f) {
            let type = klassifiziereTyp(f);
            if (type === "tuer" || type === "eingang" || type === "durchgang" || type === "lobby") return {
                color: "#f59e0b",
                weight: 2,
                fillOpacity: 0.8
            };
            if (type === "flur") return {color: "#a8a29e", weight: 1, fillOpacity: 0.2};
            if (type === "vertikal") return {color: "#8b5cf6", fillColor: "#a78bfa", fillOpacity: 0.5};
            return {color: "#4a4a4a", weight: 1.5, fillColor: "#3388ff", fillOpacity: 0.4};
        }

        function erstelleEtagenLayer(data) {
            return L.geoJSON(data, {
                style: gibFeatureStyle,
                onEachFeature: (f, layer) => {
                    const properties = f.properties || {};
                    layer.bindPopup(`${properties.name || "-"} (${properties.use_type || "-"})`);
                }
            });
        }

        // Load floors asynchronously
        var ladeProzesse = etagenListe.map(etage =>
            fetch(`../../Data/vsp_etage_${etage}.json`)
                .then(response => {
                    if (!response.ok) throw new Error("Netzwerkfehler beim Laden von Etage " + etage);
                    return response.json();
                })
                .then(data => {
                    geladeneEtagen[etage] = erstelleEtagenLayer(data);
                })
                .catch(err => console.error("Konnte Etage nicht laden:", etage))
        );

        Promise.all(ladeProzesse).then(() => {
            if (window.wechsleEtage) {
                window.wechsleEtage(window.aktuelleZielEtage); // default or already requested
            }
        });

        window.wechsleEtage = function (neueEtage) {
            window.aktuelleZielEtage = neueEtage;
            etagenListe.forEach((etage) => {
                if (geladeneEtagen[etage]) {
                    window.map.removeLayer(geladeneEtagen[etage]);
                }
            });

            if (geladeneEtagen[neueEtage]) {
                geladeneEtagen[neueEtage].addTo(window.map);
            }
        };

        window.zeichneRoute = function (coords) {
            if (aktuelleRoutenLinie) {
                window.map.removeLayer(aktuelleRoutenLinie);
            }
            if (!coords || coords.length === 0) return;

            // Koordinaten sind [lng, lat], Leaflet braucht [lat, lng]
            const latLngs = coords.map(c => [c[1], c[0]]);

            aktuelleRoutenLinie = L.polyline(latLngs, {
                color: '#dc2626',
                weight: 5,
                opacity: 0.8,
                lineJoin: 'round'
            }).addTo(window.map);

            window.map.fitBounds(aktuelleRoutenLinie.getBounds(), {padding: [50, 50]});
        };
    }
}

customElements.define('leaflet-map-container', LeafletMapContainer);
