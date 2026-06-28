const input = document.getElementById("kuerzel");
const btn = document.getElementById("submitBtn");
const result = document.getElementById("result");
const errorMsg = document.getElementById("errorMsg");

btn.addEventListener("click", async () => {
  const value = input.value.trim();

  if (!value) {
    errorMsg.style.display = "block";
    return;
  }

  errorMsg.style.display = "none";

  try {
    const res = await fetch(
    `http://localhost:3000/room?input=${encodeURIComponent(value)}`
    );
    const data = await res.json();

    console.log(data);

    if (data.message) {
      result.innerHTML = "❌ Raum nicht gefunden";
      return;
    }

    result.innerHTML = `
      <div style="padding:10px; border:1px solid #ccc; border-radius:8px;">
        <h2>🏫 Raum gefunden</h2>
        <p><b>Name:</b> ${data.name}</p>
        <p><b>Raum-ID:</b> ${data.unit_id}</p>
        <p><b>Etage:</b> ${data.level_id}</p>
        <p><b>Typ:</b> ${data.use_type}</p>
        <p><b>Fläche:</b> ${data.shape_area}</p>
      </div>
    `;

  } catch (err) {
    result.innerHTML = "❌ Server nicht erreichbar";
  }
});

function parseRoom(input) {
  // Beispiel: "3.02 VSP1"

  const match = input.match(/(\d)\.(\d{2})\s*VSP\s*(\d)/i);

  if (!match) return null;

  const floor = Number(match[1]);   // 3
  const room = match[2];            // 02
  const vsp = Number(match[3]);     // 1

  return { floor, room, vsp };
}
function getBuilding(vsp) {
  const map = {
    1: "7721",
    2: "7722",
    3: "7723",
    4: "7724"
  };

  return map[vsp] || null;
}