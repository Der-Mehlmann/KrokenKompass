import {Weapon} from "./Weapon.js";


/**
 * MolotovWeapon: Flächenschaden über Zeit (DoT)
 *
 * KATEGORIE: Simple (keine spezielle Logik)
 * PROJEKTIL: MolotovProjectile
 * ZIEL: Nächster Feind
 *
 * Besonderheit: Das MolotovProjectile hinterlässt eine DoT-Zone am Aufprallort,
 * die kontinuierlichen Schaden verursacht. Die DoT-Logik ist im Projektil selbst.
 *
 * Diese Klasse existiert für Übersichtlichkeit -
 * sie nutzt die generische Weapon-Logik ohne Änderungen.
 */
export class MolotovWeapon extends Weapon {
    constructor(icon, description, level, name, shooter, mapWidth, mapHeight, gridWidth, dmg, cooldown, range, piercing, maxLevel, startLevel, isSpecial, projectile, projectileConfig) {
        super(icon, description, level, name, shooter, mapWidth, mapHeight, gridWidth, dmg, cooldown, range, piercing, maxLevel, startLevel, isSpecial, projectile, projectileConfig);
        this.activeMolotovs = [] //
        this.maxMolotovs = 5;     //  Cap dürfen gleichzeitig geworfen werden -> sosnt zu laggy
    }

    updateStats() {
        if (this.level === this._currentStatsLevel) return
        this.dmg += 5 // warscheinlich reduntant, da DoT Schaden im Projektil geregelt wird
        this.cooldown -= 90          // +15 Schaden pro Level
        this.piercing += 0
        this.range += 50         // +50 Range pro Levelthis.projectileConfig.amount += 0;   // Keine Extra-Projektile
        this.projectileConfig.dotRadius += 13
        this.projectileConfig.dotDmg += 6
        this.projectileConfig.dotInterval = Math.max(250, this.projectileConfig.dotInterval - 35)
        this._currentStatsLevel = this.level
    }
}