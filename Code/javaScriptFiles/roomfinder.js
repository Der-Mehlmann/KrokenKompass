// Raumdaten
/**const rooms = [
  // Von-Seckendorff-Platz 1
  { name: '"Café Einstein" (VSP 1)', address: 'Von-Seckendorff-Platz 1', floor: null },
  { name: 'Büro (2.12) [VSP 1] (Informatik)', address: 'Von-Seckendorff-Platz 1' },
  { name: 'GPU-Pool Informatik (3.02) [VSP 1]', address: 'Von-Seckendorff-Platz 1' },
  { name: 'Hörsaal 1.04 [VSP 1]', address: 'Von-Seckendorff-Platz 1' },
  { name: 'Hörsaal 1.23 [VSP 1]', address: 'Von-Seckendorff-Platz 1' },
  { name: 'Hörsaal 1.26 [VSP 1] (Physik)', address: 'Von-Seckendorff-Platz 1' },
  { name: 'Hörsaal 3.04 [VSP 1]', address: 'Von-Seckendorff-Platz 1' },
  { name: 'Hörsaal 3.07 [VSP 1]', address: 'Von-Seckendorff-Platz 1' },
  { name: 'Hörsaal 3.28 [VSP 1]', address: 'Von-Seckendorff-Platz 1' },
  { name: 'Hörsaal 3.31 [VSP 1] (Informatik)', address: 'Von-Seckendorff-Platz 1' },
  { name: 'ITsec/FPGA Labor (2.04) [VSP 1] (Informatik)', address: 'Von-Seckendorff-Platz 1' },
  { name: 'Kolloquium 5.09 [VSP 1]', address: 'Von-Seckendorff-Platz 1' },
  { name: 'Kolloquium 5.10 (50) [VSP 1]', address: 'Von-Seckendorff-Platz 1' },
  { name: 'Konferenzraum 5.06 [VSP1] (Informatik)', address: 'Von-Seckendorff-Platz 1' },
  { name: 'PC-Pool Informatik (3.34) [VSP 1]', address: 'Von-Seckendorff-Platz 1' },
  { name: 'PC-Pool Naturwissenschaftliche Fakultät II (3.35) [VSP 1]', address: 'Von-Seckendorff-Platz 1' },
  { name: 'Seminarraum 0.03 [VSP 1]', address: 'Von-Seckendorff-Platz 1' },
  { name: 'Seminarraum 0.04 [VSP 1]', address: 'Von-Seckendorff-Platz 1' },
  { name: 'Seminarraum 1.02 [VSP 1] (Physik)', address: 'Von-Seckendorff-Platz 1' },
  { name: 'Seminarraum 1.03 [VSP 1] (Informatik)', address: 'Von-Seckendorff-Platz 1' },
  { name: 'Seminarraum 1.16 [VSP 1] (Informatik)', address: 'Von-Seckendorff-Platz 1' },
  { name: 'Seminarraum 1.27 [VSP 1] (Mathematik)', address: 'Von-Seckendorff-Platz 1' },
  { name: 'Seminarraum 1.29 [VSP 1] (Mathematik)', address: 'Von-Seckendorff-Platz 1' },
  { name: 'Seminarraum 1.30 [VSP 1] (Informatik)', address: 'Von-Seckendorff-Platz 1' },
  { name: 'Seminarraum 2.25 [VSP 1] (Informatik)', address: 'Von-Seckendorff-Platz 1' },
  { name: 'WorkingSpace Informatik (3.32) [VSP 1]', address: 'Von-Seckendorff-Platz 1' },

  // Von-Seckendorff-Platz 3
  { name: 'HS 3 0.21 [VSP 3] (Geowiss.)VLAS', address: 'Von-Seckendorff-Platz 3' },
  { name: 'Konferenzraum 3 1.48 [VSP 3]', address: 'Von-Seckendorff-Platz 3' },
  { name: 'R 3 3.44 [VSP 3]', address: 'Von-Seckendorff-Platz 3' },
  { name: 'SR 3 1.39 [VSP 3] (Geowiss.)', address: 'Von-Seckendorff-Platz 3' },
  { name: 'ÜR 3 1.38 [VSP 3] (Geowiss.)', address: 'Von-Seckendorff-Platz 3' },
  { name: 'ÜR 3 3.21 [VSP 3] (Geowiss.)', address: 'Von-Seckendorff-Platz 3' },
  { name: 'ÜR 3 3.22 [VSP 3] (Geowiss.)', address: 'Von-Seckendorff-Platz 3' },

  // Von-Seckendorff-Platz 4
  { name: 'HS 4 1.43 [VSP 4] (Geowiss.)VLAS', address: 'Von-Seckendorff-Platz 4' },
  { name: 'PC 4 3.32 [VSP 4]', address: 'Von-Seckendorff-Platz 4' },
  { name: 'PC 4 3.34 [VSP 4]', address: 'Von-Seckendorff-Platz 4' },
  { name: 'SR 4 1.34 [VSP 4] (Geowiss.)', address: 'Von-Seckendorff-Platz 4' },
  { name: 'SR 4 3.21 [VSP 4] (Geowiss.)', address: 'Von-Seckendorff-Platz 4' },
  { name: 'SR 4 3.40 [VSP 4] (Geowiss.)', address: 'Von-Seckendorff-Platz 4' },
];

*/
function findRoomByKuerzel(kuerzel) {
const vsp = getVSPNumber(kuerzel);
    const stock = getStockwerk(kuerzel);

    const resultDiv = document.getElementById("result");

    // Tabelle bauen
    resultDiv.innerHTML = `
        <table border="1" cellpadding="8" cellspacing="0">
            <tr>
                <th>VSP</th>
                <th>Stockwerk</th>
                <th>Link zur wegfindungsseite</th>
            </tr>
            <tr>
                <td>${vsp ?? "nicht gefunden"}</td>
                <td>${stock ?? "nicht gefunden"}</td>
                <td><a href="#">zur Seite</a></td>
            </tr>
        </table>
    `;
}

function getVSPNumber(text) {
    const match = text.match(/VSP\s*(\d+)/i);
    return match ? Number(match[1]) : null;
}

function getStockwerk(text) {
    // Sucht nach: Zahl.PunktZweiZahlen
    const match = text.match(/(\d)\.\d{2}/);

    if (match) {
        return Number(match[1]);
    }

    return null;
}

document.getElementById("submitBtn").addEventListener("click", () => {
    const input = document.getElementById("kuerzel");
    const error = document.getElementById("errorMsg");

    const value = input.value;

    if (value === "") {
        error.style.display = "block";
        return;
    }

    error.style.display = "none";
    findRoomByKuerzel(value);
});
