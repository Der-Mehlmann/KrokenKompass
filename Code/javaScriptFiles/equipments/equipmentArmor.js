import {Equipment} from "../equipment.js";

export class EquipmentArmor extends Equipment {
    constructor(icon, description, level, name, playerStatKey, valuePerLevel) {
        super(icon, description, level, name, playerStatKey, valuePerLevel);
    }
}