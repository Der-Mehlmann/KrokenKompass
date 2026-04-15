import {Projectile} from "./Projectile.js";


//BoomerangProjectile: Axt fliegt hin und zurück
export class BoomerangProjectile extends Projectile {
    constructor(globalEntityX, globalEntityY, direction, dmg, config = {}, gridMapTile = {}, creationTime, isEnemy = false) {
        super(globalEntityX, globalEntityY, direction, dmg, config, gridMapTile, creationTime, isEnemy);
        this.startX = globalEntityX;
        this.startY = globalEntityY;
        this.maxRange = config.maxRange || 400;
        this.returning = false;
        this.distanceTraveled = 0;
        // Kein Grid für Boomerang -- Boomerang wird nicht angeezeigt auf der GridMap
        this.gridMapTile = {};
    }

    move(map, projectiles, projectileIndex, gridWidth, currentTime) {
        if (!this.returning) {
            // Flieg weg
            const oldX = this.globalEntityX;
            const oldY = this.globalEntityY;

            if (this.direction.x > 0) {
                this.globalEntityX = map.rightFree(this.globalEntityX, this.globalEntityY, this.direction.x * this.speed, this.hitbox);
            } else if (this.direction.x < 0) {
                this.globalEntityX = map.leftFree(this.globalEntityX, this.globalEntityY, Math.abs(this.direction.x * this.speed), this.hitbox);
            }

            if (this.direction.y < 0) {
                this.globalEntityY = map.topFree(this.globalEntityX, this.globalEntityY, Math.abs(this.direction.y * this.speed), this.hitbox);
            } else if (this.direction.y > 0) {
                this.globalEntityY = map.downFree(this.globalEntityX, this.globalEntityY, this.direction.y * this.speed, this.hitbox);
            }

            this.distanceTraveled += Math.hypot(this.globalEntityX - oldX, this.globalEntityY - oldY);

            if (this.distanceTraveled >= this.maxRange) {
                this.returning = true;
            }
            if ((oldX === this.globalEntityX && this.direction.x !== 0) || (oldY === this.globalEntityY && this.direction.y !== 0)) {
                this.returning = true;
            }

        } else {
            // Kehre zurück
            if (this.config.shooter) {
                const dx = this.config.shooter.globalEntityX - this.globalEntityX;
                const dy = this.config.shooter.globalEntityY - this.globalEntityY;
                const dist = Math.hypot(dx, dy);

                if (dist <= 30) {
                    this.isAlive = false;
                    return;
                }

                const returnDir = {x: dx / dist, y: dy / dist};
                this.globalEntityX += returnDir.x * this.speed;
                this.globalEntityY += returnDir.y * this.speed;
            }
        }


    }


}
