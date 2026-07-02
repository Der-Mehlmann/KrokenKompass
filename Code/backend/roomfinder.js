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
        const res = await fetch(`http://localhost:3000/room?input=${encodeURIComponent(value)}`);

        console.log(res.status);

        const data = await res.json(); // WICHTIG

        console.log(data);

        if (!data || data.length === 0) {
            result.innerHTML = " Raum nicht gefunden";
            return;
        }

        // falls mehrere Räume zurückkommen
        const room = data[0];

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
        console.error("SERVERFEHLER:", err);
        result.innerHTML = " Serverfehler";
    }
});