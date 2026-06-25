CREATE TABLE campus (
    campus_id SERIAL PRIMARY KEY,
    campus_name VARCHAR(255) NOT NULL,
    umriss TEXT
);

CREATE TABLE gebaeude (
    gebaeude_id SERIAL PRIMARY KEY,
    gebaeude_name VARCHAR(255) NOT NULL,
    umriss TEXT,
    campus_id INT NOT NULL REFERENCES campus(campus_id) ON DELETE CASCADE
);

CREATE TABLE eingang (
    eingang_id SERIAL PRIMARY KEY,
    gebaeude_id INT NOT NULL REFERENCES gebaeude(gebaeude_id),
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL
);

CREATE TABLE etage (
    etage_id SERIAL PRIMARY KEY,
    etage_name VARCHAR(100) NOT NULL,
    etage_nr INT NOT NULL,
    gebaeude_id INT NOT NULL REFERENCES gebaeude(gebaeude_id)
);

CREATE TABLE treppe (
    treppe_id SERIAL PRIMARY KEY,
    treppe_name VARCHAR(100),
    gebaeude_id INT NOT NULL REFERENCES gebaeude(gebaeude_id),
    etage_unten_id INT NOT NULL REFERENCES etage(etage_id),
    etage_oben_id INT NOT NULL REFERENCES etage(etage_id)
);

CREATE TABLE fahrstuhl (
    fahrstuhl_id SERIAL PRIMARY KEY,
    gebaeude_id INT NOT NULL REFERENCES gebaeude(gebaeude_id),
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION
);

CREATE TABLE fahrstuhl_tuer (
    fahrstuhl_tuer_id SERIAL PRIMARY KEY,
    fahrstuhl_id INT NOT NULL REFERENCES fahrstuhl(fahrstuhl_id),
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION
);

CREATE TABLE raum (
    raum_id SERIAL PRIMARY KEY,
    raum_name VARCHAR(255) NOT NULL,
    etage_id INT NOT NULL REFERENCES etage(etage_id),
    umriss TEXT
);

CREATE TABLE raum_eingang (
    raum_eingang_id SERIAL PRIMARY KEY,
    raum_id INT NOT NULL REFERENCES raum(raum_id),
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION
);