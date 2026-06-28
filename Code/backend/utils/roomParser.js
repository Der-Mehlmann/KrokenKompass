export function parseRooms(input) {
  return input.split(",").map(item => {
    const match = item.match(/(\d)\.(\d{2}).*VSP\s*(\d)/i);

    if (!match) return null;

    return {
      floor: match[1],
      room: match[2],
      vsp: match[3]
    };
  }).filter(Boolean);
}

export function getBuilding(vsp) {
  return {
    "1": "7721",
    "2": "7722",
    "3": "7723",
    "4": "7724"
  }[vsp] || null;
}