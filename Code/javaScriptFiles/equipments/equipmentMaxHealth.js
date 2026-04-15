import {Equipment} from "../equipment.js";

export class EquipmentMaxHealth extends Equipment {
    constructor(icon, description, level, name, playerStatKey, valuePerLevel) {
        super(icon, description, level, name, playerStatKey, valuePerLevel);
    }

    apply(player, targetValue) {
        const difference = targetValue - this.currentAppliedValue;

        // Die Basisklasse regelt player.maxHp
        super.apply(player, targetValue);

        // Wir heilen den Spieler zusätzlich um die Differenz
        player.hp += difference;

        //console.log(`[Vigor] MaxHP erhöht. Spieler um ${difference} geheilt.`);
    }
}