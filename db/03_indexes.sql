CREATE INDEX idx_gebaeude_campus ON gebaeude(campus_id);
CREATE INDEX idx_etage_gebaeude ON etage(gebaeude_id);
CREATE INDEX idx_raum_etage ON raum(etage_id);
CREATE INDEX idx_eingang_gebaeude ON eingang(gebaeude_id);