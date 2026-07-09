import { parseRooms, getBuilding } from "./utils/roomParser.js";
import rooms from "./vsp_units.json" with { type: "json" };

const input = document.getElementById("kuerzel");
const btn = document.getElementById("submitBtn");
const result = document.getElementById("result");
const errorMsg = document.getElementById("errorMsg");

btn.addEventListener("click", () => {
  console.log("Rooms geladen:", rooms.length);

  const value = input.value.trim();

  if (!value) {
    errorMsg.style.display = "block";
    return;
  }

  errorMsg.style.display = "none";

  try {
    const parsed = parseRooms(value);

    if (!parsed.length) {
      result.innerHTML = "Ungültige Eingabe";
      return;
    }

    const p = parsed[0];
    const buildingCode = getBuilding(p.vsp);

    p.room = p.room.padStart(3, "0");
    p.floor = p.floor.padStart(2, "0");

    const filteredRooms = rooms.filter(room => {
      const [b, floor, unit] = room.name.split("_");

      return (
        floor === p.floor &&
        unit === p.room &&
        b === buildingCode &&
        room.use_type !== "Tür"
      );
    });

    if (!filteredRooms.length) {
      result.innerHTML = "Raum nicht gefunden";
      return;
    }

    const room = filteredRooms[0];

    result.innerHTML = `
      <div style="padding:10px; border:1px solid #ccc; border-radius:8px;">
        <h2> Raum gefunden</h2>
        <p><b>Name:</b> ${room.name}</p>
        <p><b>Raum-ID:</b> ${room.unit_id}</p>
        <p><b>Etage:</b> ${room.name.split("_")[1]}</p>
        <p><b>Typ:</b> ${room.use_type}</p>
        <p><b>Fläche:</b> ${room.shape_area}</p>
      </div>
    `;
  } catch (err) {
    console.error(err);
    result.innerHTML = "Serverfehler";
  }
});