import express from "express";
import cors from "cors";
import { Pool } from "pg";
import { parseRooms, getBuilding } from "./utils/roomParser.js";

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "postgres",
  password: "krokenkompass",
  port: 5432,
});

app.get("/room", async (req, res) => {
  const input = req.query.input;

  const parsed = parseRooms(input);

  if (!parsed.length) {
    return res.status(400).json({ error: "Ungültige Eingabe" });
  }

  try {
    const results = await Promise.all(
      parsed.map(async (p) => {
        const building = getBuilding(p.vsp);

        const result = await pool.query(
          `
          SELECT *
          FROM vsp_units
          WHERE level_id = $1
            AND unit_id = $2
            AND split_part(name, '_', 1) = $3
          `,
          [p.floor, p.room, building]
        );

        return result.rows[0] || null;
      })
    );

    res.json(results.filter(Boolean));
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(3000, () => {
  console.log("API läuft auf http://localhost:3000");
});