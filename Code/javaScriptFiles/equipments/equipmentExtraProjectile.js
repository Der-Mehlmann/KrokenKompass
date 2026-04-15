import {Equipment} from "../equipment.js";

export class EquipmentExtraProjectile extends Equipment {
    constructor(icon, description, level, name, playerStatKey, valuePerLevel) {
        super(icon, description, level, name, playerStatKey, valuePerLevel);
    }

    update(player, map, inputState) {
        // Levellogik: Level 1-3 = +1, Level 4-6 = +2, Level 7-9 = +3, sonst zu op
        let targetExtra = Math.floor(this.level / 3); // teilen das Level durch 3 und runden auf

        if (this.currentAppliedValue !== targetExtra) {
            this.apply(player, targetExtra);
        }
    }
}