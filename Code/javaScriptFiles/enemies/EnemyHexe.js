import {Enemy} from "../enemy.js"
import {WeaponConfig} from "../weapons/weaponConfig.js"

export class EnemyHexe extends Enemy {
    constructor(globalEntityX, globalEntityY, hp, png, speed, hitbox, gridMapTile, oldMoveX, oldMoveY, blockedX, blockedY, weapon, level) {
        super(globalEntityX, globalEntityY, hp, png, speed, hitbox, gridMapTile)
        this.hp = 62 + level * 350
        this.speed = 0.85
        this.png = "./Graphics/enemiesPNG/Hexe/1.png"
        this.hitbox = {width: 583 / 7, height: 703 / 7}

        const img = new Image();
        img.src = this.png;

        this.level = level

        this.xpDrop = 6
        this.baseDamage = 36 + level * 6
        this.oldMoveX = oldMoveX
        this.oldMoveY = oldMoveY
        this.blockedX = blockedX
        this.blockedY = blockedY
        this.ranged = true
        this.weapon = WeaponConfig.createWeapon("WitchFireball", this, 420, 420, 8, this.level)
    }

    getColor() {
        return "purple"
    }

    render(ctx, MapOne, PlayerOne, enemies, projectiles, performanceNow, positionWithin, gridWidth, enemyItemDrops = []) {
        if (!this.weapon || this.weapon.name !== "WitchFireball") {
            this.weapon = WeaponConfig.createWeapon("WitchFireball", this, 420, 420, 8, this.level);
        }
        super.render(ctx, MapOne, PlayerOne, enemies, projectiles, performanceNow, positionWithin, gridWidth, enemyItemDrops);
    }

    updateStats() {
        if (this.level === this._currentStatsLevel) return;
        this.dmg += 8
        this.hp += 15
        this.speed += 0.05
    }
}