import {Enemy} from "../enemy.js"
import {WeaponConfig} from "../weapons/weaponConfig.js"

export class EnemySkellet extends Enemy {
    constructor(globalEntityX, globalEntityY, hp, png, speed, hitbox, gridMapTile, oldMoveX, oldMoveY, blockedX, blockedY, weapon, level) {
        super(globalEntityX, globalEntityY, hp, png, speed, hitbox, gridMapTile)
        this.level = level
        this.hp = 35 + level * 12
        this.speed = 1.05
        this.png = "./Graphics/enemiesPNG/Skellet/2.png"
        this.hitbox = {width: 447 / 13, height: 683 / 13}

        const img = new Image();
        img.src = this.png;

        this.xpDrop = 2
        this.baseDamage = 6 + level * 4
        this.oldMoveX = oldMoveX
        this.oldMoveY = oldMoveY
        this.blockedX = blockedX
        this.blockedY = blockedY
        this.weapon = WeaponConfig.createWeapon("BasicEnemy", this, 420, 420, 8)    // wenn Waffen implemtiert sind, durch weapon ersetzen
        this.ranged = true
    }

    getColor() {
        return "white"
    }

    updateStats() {
        if (this.level === this._currentStatsLevel) return;
        this.dmg += 8
        this.hp += 15
        this.speed += 0.05
    }
}