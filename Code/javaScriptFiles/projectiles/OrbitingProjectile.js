import {Projectile} from "./Projectile.js";

/**
 * OrbitingProjectile: Shurikens orbiting um Schütze
 */
export class OrbitingProjectile extends Projectile {
    constructor(globalEntityX, globalEntityY, direction, dmg, config = {}, gridMapTile = {}, creationTime, angle = 0, isEnemy = false) {
        super(globalEntityX, globalEntityY, direction, dmg, config, gridMapTile, creationTime, isEnemy);
        this.angle = angle;
        this.orbitRadius = config.orbitRadius || 100;
        this.orbitSpeed = config.orbitSpeed || 2;
    }

    move(map, projectiles, projectileIndex, gridWidth, currentTime) {
        if (!this.config.shooter) return;
        // Rotiere um Schütze
        this.angle += this.orbitSpeed * 0.016;
        this.globalEntityX = this.config.shooter.globalEntityX + Math.cos(this.angle) * this.orbitRadius;
        this.globalEntityY = this.config.shooter.globalEntityY + Math.sin(this.angle) * this.orbitRadius;
    }

    draw(ctx, player) {
        super.draw(ctx, player);
    }
}
