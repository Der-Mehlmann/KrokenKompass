class LeafletMapContainer extends HTMLElement {
    connectedCallback() {
        if (this.initialized) return;
        this.initialized = true;

        const shadow = this.attachShadow({mode: 'open'});

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
        shadow.appendChild(link);

        const mapContainer = document.createElement('div');
        mapContainer.id = 'leaflet-map';
        mapContainer.style.width = '100%';
        mapContainer.style.height = '100%';
        mapContainer.style.position = 'absolute';
        mapContainer.style.top = '0';
        mapContainer.style.left = '0';
        mapContainer.style.zIndex = '0';
        shadow.appendChild(mapContainer);

        window.map = L.map(mapContainer, {zoomControl: false}).setView([51.496796, 11.935968], 18);
        L.control.zoom({position: 'bottomright'}).addTo(window.map);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 22}).addTo(window.map);

        const resizeObserver = new ResizeObserver(() => {
            if (window.map) {
                window.map.invalidateSize();
            }
        });
        resizeObserver.observe(this);

        var etagenListe = ['-1', '00', '01', '02', '03', '04', '05'];
        var geladeneEtagen = {};
        window.aktuelleZielEtage = '00';
        var aktuelleRoutenLinie = null;
        var globaleKnotenMeta = {};
        var globaleCentroids = {};
        window.START_RAUM = null;
        window.ZIEL_RAUM = null;
        window.aktuelleRoutenMarker = [];

        function normalisiereTyp(type) {
            return String(type || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
        }

        function klassifiziereTyp(feature) {
            const typ = normalisiereTyp(feature?.properties?.use_type);
            if (!typ) return '';
            if (typ.includes('eingangstür') || typ.includes('eingangstuer') || typ.includes('ausgangstür') || typ.includes('ausgangstuer')) return 'eingang';
            if (typ.includes('eingang') || typ.includes('ausgang') || typ.includes('windfang') || typ.includes('uebergang')) return 'lobby';
            if (typ.includes('tuer')) return 'tuer';
            if (typ.includes('durchgang')) return 'durchgang';
            if (typ.includes('treppenhaus') || typ.includes('treppe') || typ.includes('aufzug')) return 'vertikal';
            if (typ.includes('flur')) return 'flur';
            return typ;
        }

        function erstelleKnotenId(feature, index) {
            const props = feature.properties || {};
            const name = String(props.name || `knoten_${index}`);
            const gid = props.gid != null ? String(props.gid) : String(index);
            return `${name}__${gid}`;
        }

        function gibFeatureStyle(f) {
            let type = klassifiziereTyp(f);
            if (window.START_RAUM && f.properties.name === window.START_RAUM) {
                return {color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.7, weight: 3};
            }
            if (window.ZIEL_RAUM && f.properties.name === window.ZIEL_RAUM) {
                return {color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.7, weight: 3};
            }
            if (type === 'tuer' || type === 'eingang' || type === 'durchgang' || type === 'lobby') return {
                color: '#f59e0b',
                weight: 2,
                fillOpacity: 0.8
            };
            if (type === 'flur') return {color: '#a8a29e', weight: 1, fillOpacity: 0.2};
            if (type === 'vertikal') return {color: '#8b5cf6', fillColor: '#a78bfa', fillOpacity: 0.5};
            return {color: '#4a4a4a', weight: 1.5, fillColor: '#3388ff', fillOpacity: 0.4};
        }

        function erstelleEtagenLayer(data) {
            return L.geoJSON(data, {
                style: gibFeatureStyle,
                onEachFeature: (f, layer) => {
                    const properties = f.properties || {};
                    layer.bindPopup(`${properties.name || '-'} (${properties.use_type || '-'})`);
                }
            });
        }

        var ladeProzesse = etagenListe.map(etage =>
            fetch(`../../Data/vsp_etage_${etage}.json`)
                .then(response => {
                    if (!response.ok) throw new Error('Netzwerkfehler');
                    return response.json();
                })
                .then(data => {
                    geladeneEtagen[etage] = erstelleEtagenLayer(data);
                    return data;
                })
                .catch(err => console.error('Konnte Etage nicht laden:', etage))
        );

        Promise.all(ladeProzesse).then(ergebnisse => {
            let alleFeatures = [];
            ergebnisse.forEach(data => {
                if (data && data.features) {
                    alleFeatures = alleFeatures.concat(data.features);
                }
            });

            alleFeatures.forEach((f, index) => {
                if (!f || !f.properties || !f.properties.name) return;
                const nodeId = erstelleKnotenId(f, index);

                try {
                    globaleCentroids[nodeId] = turf.pointOnFeature(f).geometry.coordinates;
                } catch (e) {
                    try {
                        globaleCentroids[nodeId] = turf.centroid(f).geometry.coordinates;
                    } catch (err) {
                    }
                }

                globaleKnotenMeta[nodeId] = {
                    name: f.properties.name,
                    typ: klassifiziereTyp(f),
                    etage: (f.properties.name.split('_')[1] || '00'),
                    feature: f
                };
            });

            if (window.wechsleEtage) {
                window.wechsleEtage(window.aktuelleZielEtage);
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
            if (window.lastPayload) {
                window.zeichneRoute(window.lastPayload);
            }
        };

        function berechneUebergang(f1, f2) {
            if (!f1 || !f2) return null;
            try {
                let intersection = turf.intersect(f1, f2);
                if (intersection) return turf.centroid(intersection).geometry.coordinates;
            } catch (e) {
            }
            let buffers = [0.2, 1.0, 3.0];
            for (let b of buffers) {
                try {
                    let buf1 = turf.buffer(f1, b, {units: 'meters'});
                    let intersection = turf.intersect(buf1, f2);
                    if (intersection) return turf.centroid(intersection).geometry.coordinates;
                } catch (e) {
                }
                try {
                    let buf2 = turf.buffer(f2, b, {units: 'meters'});
                    let intersection = turf.intersect(f1, buf2);
                    if (intersection) return turf.centroid(intersection).geometry.coordinates;
                } catch (e) {
                }
            }
            try {
                let c1 = turf.centroid(f1).geometry.coordinates;
                let c2 = turf.centroid(f2).geometry.coordinates;
                return [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2];
            } catch (e) {
                return null;
            }
        }

        window.zeichneRoute = function (payload) {
            if (!payload) return;
            window.lastPayload = payload;
            
            if (aktuelleRoutenLinie) {
                window.map.removeLayer(aktuelleRoutenLinie);
                aktuelleRoutenLinie = null;
            }
            if (window.aktuelleRoutenMarker) {
                window.aktuelleRoutenMarker.forEach(m => window.map.removeLayer(m));
            }
            window.aktuelleRoutenMarker = [];

            if (!payload.route || payload.route.length === 0) return;

            window.START_RAUM = payload.startRoom;
            window.ZIEL_RAUM = payload.endRoom;

            Object.values(geladeneEtagen).forEach(layer => layer.setStyle(gibFeatureStyle));

            let routingPfad = payload.route;
            let zielEtage = window.aktuelleZielEtage;
            let koordinatenFuerDieseEtage = [];

            routingPfad.forEach((knotenId, index) => {
                let meta = globaleKnotenMeta[knotenId] || {};
                let raumEtage = meta.etage || '00';
                let typ = meta.typ;
                let currentFeature = meta.feature;

                if (raumEtage === zielEtage) {
                    let isStartOrEnd = (index === 0 || index === routingPfad.length - 1);
                    let isRaum = (typ !== 'tuer' && typ !== 'flur' && typ !== 'vertikal' && typ !== 'eingang' && typ !== 'durchgang' && typ !== 'lobby');

                    if (isStartOrEnd && !isRaum && globaleCentroids[knotenId]) {
                        let koord = globaleCentroids[knotenId];
                        koordinatenFuerDieseEtage.push([koord[1], koord[0]]);
                    }

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

                    if (typ === 'vertikal' && globaleCentroids[knotenId]) {
                        let koord = globaleCentroids[knotenId];
                        let nextId = routingPfad[index + 1];
                        let prevId = routingPfad[index - 1];
                        let nextMeta = nextId ? globaleKnotenMeta[nextId] : null;
                        let prevMeta = prevId ? globaleKnotenMeta[prevId] : null;

                        let msg = 'Treppe / Aufzug';
                        if (nextMeta && nextMeta.etage !== zielEtage) {
                            msg = `Hier Etage wechseln (nach ${nextMeta.etage})`;
                        } else if (prevMeta && prevMeta.etage !== zielEtage) {
                            msg = `Von Etage ${prevMeta.etage} kommend`;
                        }

                        let m = L.circleMarker([koord[1], koord[0]], {
                            radius: 7, fillColor: '#ec4899', color: '#fff', weight: 2, opacity: 1, fillOpacity: 1
                        }).bindTooltip(msg, {permanent: true, direction: 'right'}).addTo(window.map);
                        window.aktuelleRoutenMarker.push(m);
                    }
                }
            });

            if (koordinatenFuerDieseEtage.length > 0) {
                aktuelleRoutenLinie = L.polyline(koordinatenFuerDieseEtage, {
                    color: '#ec4899', weight: 5, dashArray: '10, 10', lineJoin: 'round'
                }).addTo(window.map);
                window.map.fitBounds(aktuelleRoutenLinie.getBounds(), {padding: [50, 50]});
            }
        };
    }
}
customElements.define('leaflet-map-container', LeafletMapContainer);
