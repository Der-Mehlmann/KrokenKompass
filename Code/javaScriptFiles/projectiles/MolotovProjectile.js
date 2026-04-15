import {Projectile} from "./Projectile.js";

/**
 * MolotovProjectile: Bogen-Flug → Landung → Kreis mit DoT
 */
export class MolotovProjectile extends Projectile {
    constructor(globalEntityX, globalEntityY, direction, dmg, config = {}, gridMapTile = {}, creationTime, isEnemy = false) {
        super(globalEntityX, globalEntityY, direction, dmg, config, gridMapTile, creationTime, isEnemy);
        this.flightDuration = config.flightDuration || 1000;
        this.startX = globalEntityX;
        this.startY = globalEntityY;
        this.landed = false;
        this.landedTime = 0;
        this.circleVisibleDuration = 4000;
        this.dotRadius = config.dotRadius || 100;
        this.dotDmg = config.dotDmg || 25;
        this.lastDotTime = 0;
        this.dotInterval = config.dotInterval || 500;

        // Zufällige Richtung für Molotov (nutzt Basis-Methode)
        this.direction = Projectile.getRandomDirection();
    }

    move(map, projectiles, projectileIndex, gridWidth, currentTime) {
        if (this.landed) {
            return;
        }

        // Bogen-Flug
        const elapsedTime = currentTime - this.creationTime;
        const progress = Math.min(elapsedTime / this.flightDuration, 1);

        if (progress < 1) {
            // Parabel-Bewegung - Zielrichtung basiert auf direction
            const flightDistance = this.config.speed; // Gesamte Flugdistanz
            const arcHeight = 150 * Math.sin(progress * Math.PI); // Bogen-Höhe

            this.globalEntityX = this.startX + this.direction.x * flightDistance * progress;
            this.globalEntityY = this.startY + this.direction.y * flightDistance * progress - arcHeight;
        } else {
            // Landung
            if (!this.landed) {
                this.landed = true;
                this.landedTime = currentTime;
            }
        }
    }

    update(map, projectiles, projectileIndex, gridWidth, player, currentTime) {
        this.move(map, projectiles, projectileIndex, gridWidth, currentTime);

        // Nach 4 Sekunden: verschwinden
        if (this.landed && currentTime - this.landedTime > this.circleVisibleDuration) {
            this.isAlive = false;
        }
    }

    checkCollision(enemies, player, projectiles, projectileIndex, enemyItemDrops, currentTime) {
        if (!this.landed) return;

        // DoT-Schaden alle 0.5 Sekunden
        if (currentTime - this.lastDotTime >= this.dotInterval) {
            this.lastDotTime = currentTime;
            this.applyDotDamage(enemies, enemyItemDrops);
        }
    }

    applyDotDamage(enemies, enemyItemDrops) {
        this.forEachEnemy(enemies, (enemy, enemies, j) => {
            const dx = enemy.globalEntityX - this.globalEntityX;
            const dy = enemy.globalEntityY - this.globalEntityY;
            if (Math.hypot(dx, dy) < this.dotRadius) {
                enemy.takeDmg(this.dotDmg, enemies, j, enemyItemDrops);
            }
        });
    }

    draw(ctx, player) {
        const screenX = this.globalEntityX - player.globalEntityX + player.canvasWidthMiddle;
        const screenY = this.globalEntityY - player.globalEntityY + player.canvasWidthHeight;
        // TODO: Ersetzen durch PNG (Molotov + Feuerkreis)
        if (this.landed) {
            ctx.fillStyle = 'rgba(242, 72, 34, 0.3)';
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.dotRadius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            super.draw(ctx, player);
        }
    }
}
