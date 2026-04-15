import {Enemy} from "../enemy.js"

export class EnemyGepanzerterRitter extends Enemy {
    constructor(globalEntityX, globalEntityY, hp, png, speed, hitbox, gridMapTile, oldMoveX, oldMoveY, blockedX, blockedY, weapon, level) {
        super(globalEntityX, globalEntityY, hp, png, speed, hitbox, gridMapTile)
        this.hp = 800 + level * 1500
        this.speed = 0.55
        this.png = "./Graphics/enemiesPNG/GepanzertRitter/1.png"
        this.hitbox = {width: 518 / 6, height: 598 / 6}

        const img = new Image();
        img.src = this.png;

        this.level = level

        this.xpDrop = 25
        this.baseDamage = 70 + level * 10
        this.oldMoveX = oldMoveX
        this.oldMoveY = oldMoveY
        this.blockedX = blockedX
        this.blockedY = blockedY
        this.ranged = false
        this.weapon = null  // wenn Waffen implementiert sind, durch weapon ersetzen
    }

    getColor() {
        return "black"
    }
}