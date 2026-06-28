import express from "express";
import cors from "cors";
import { Pool } from "pg";
import { parseRooms, getBuilding } from "./utils/roomParser.js";

const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.send("Backend läuft"); //nur zum Testen, ob der Server läuft
});

const pool = new Pool({ // hier wird die Verbindung zur PostgreSQL-Datenbank hergestellt
  user: "postgres",
  host: "localhost",
  database: "postgres",
  password: "krokenkompass",
  port: 5432,
});

app.get("/room", async (req, res) => {
  console.log("Anfrage erhalten:", req.query.input);
  const input = req.query.input;  //liest den URL parameter

  const parsed = parseRooms(input);
  console.log(parsed);

  if (!parsed.length) {
    return res.status(400).json({ error: "Ungültige Eingabe" });
  }

  try {
    const results = await Promise.all(  // Promise.all wartet, bis alle Promises abgeschlossen sind
      parsed.map(async (p) => {
        const building = getBuilding(p.vsp);
        p.room = p.room.padStart(3, "0");
        p.floor = p.floor.padStart(2, "0");
        console.log("floor:", p.floor);
        console.log("room:", p.room);
        console.log("vsp:", p.vsp);
        console.log("building:", building);
        const result = await pool.query(          //DATENBANKABFRAGE
          `
          SELECT *                  -- $1, $2, $3 sind Platzhalter für die Werte in der Array-Liste
          FROM vsp_units
          WHERE split_part(name, '_', 2) = $1
          AND split_part(name, '_', 3) = $2
          AND split_part(name, '_', 1)  = $3
          AND use_type != 'Tür'  -- filtert Räume mit dem Typ "Tür" aus, da diese identisch mit den Räumen sind, aber nicht als Räume gezählt werden sollen
        `,
        [p.floor, p.room, building]
        );
        console.log(result.rows);
        return result.rows[0] || null;
      })
    );

    res.json(results.filter(Boolean));  //filtert alle null-Werte aus dem Array und sendet die Ergebnisse als JSON zurück
  } catch (err) {
  console.error("SQL-Fehler:");
  console.error(err);

  res.status(500).json({
    error: err.message
  });
}
});

app.listen(3000, () => {
  console.log("API läuft auf http://localhost:3000");
});