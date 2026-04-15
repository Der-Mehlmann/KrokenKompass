import {Equipment} from "../equipment.js";

export class EquipmentDamage extends Equipment {
    constructor(icon, description, level, name, playerStatKey, valuePerLevel) {
        // Erhöht damageMultiplier um 0.2 (20%) pro Level
        super(icon, description, level, name, playerStatKey, valuePerLevel);
    }
}