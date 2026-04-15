import {Projectile} from "./Projectile.js";

/**
 * BasicProjectile: Pfeil, Speer, Messer - einfache Bewegung
 */
export class BasicProjectile extends Projectile {
    constructor(globalEntityX, globalEntityY, direction, dmg, config = {}, gridMapTile = {}, creationTime, isEnemy = false) {
        super(globalEntityX, globalEntityY, direction, dmg, config, gridMapTile, creationTime, isEnemy);
        this.duration = config.duration || -1;
    }

    update(map, projectiles, projectileIndex, gridWidth, player, currentTime) {
        // Timeout-Handling
        if (this.duration > 0 && currentTime - this.creationTime > this.duration) {
            this.isAlive = false;
            return;
        }
        super.update(map, projectiles, projectileIndex, gridWidth, player, currentTime);
    }
}
