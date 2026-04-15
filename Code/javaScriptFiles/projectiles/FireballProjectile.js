import {Projectile} from "./Projectile.js";

/**
 * FireballProjectile: Fliegt → Explosion bei Timeout oder Collision
 */
export class FireballProjectile extends Projectile {
    constructor(globalEntityX, globalEntityY, direction, dmg, config = {}, gridMapTile = {}, creationTime, isEnemy = false) {
        super(globalEntityX, globalEntityY, direction, dmg, config, gridMapTile, creationTime, isEnemy);
        this.duration = config.duration || 2000; // 2 Sekunden Flugzeit
        this.exploded = false;
        this.explodedTime = 0;
        this.explosionRadius = config.explosionRadius || 100;
        this.explosionColor = config.explosionColor || 'rgba(255, 50, 0, 0.9)';
        this.explosionDuration = 300;
        this.explosionDamageDealt = false;
    }

    update(map, projectiles, projectileIndex, gridWidth, player, currentTime) {
        // Timeout → Explosion
        if (!this.exploded && this.duration > 0 && currentTime - this.creationTime > this.duration) {
            this.triggerExplosion(currentTime);
            return;
        }

        // Normale Bewegung
        if (!this.exploded) {
            super.update(map, projectiles, projectileIndex, gridWidth, player, currentTime);
        }
    }

    triggerExplosion(currentTime) {
        this.exploded = true;
        this.explodedTime = currentTime;
    }

    checkCollision(enemies, player, projectiles, projectileIndex, enemyItemDrops, currentTime) {
        if (this.exploded) {
            // Explosion-Schaden in Radius
            if (!this.explosionDamageDealt) {
                if (this.isEnemy) {
                    this.applyExplosionDamageToPlayer(player, enemyItemDrops);
                } else {
                    this.applyExplosionDamage(enemies, enemyItemDrops);
                }
                this.explosionDamageDealt = true;
            }
            // Explosion abgelaufen → löschen
            if (currentTime - this.explodedTime > this.explosionDuration) {
                this.isAlive = false;
            }
        } else {
            // Vor Explosion: Check ob Ziel getroffen
            if (this.isEnemy) {
                if (this.checkCollisionWithEntity(player)) {
                    this.triggerExplosion(currentTime);
                }
            } else {
                this.forEachEnemy(enemies, (enemy) => {
                    if (this.checkCollisionWithEntity(enemy)) {
                        this.triggerExplosion(currentTime);
                        return false; // break
                    }
                });
            }
        }
    }

    applyExplosionDamageToPlayer(player, enemyItemDrops) {
        const dx = player.globalEntityX - this.globalEntityX;
        const dy = player.globalEntityY - this.globalEntityY;
        if (Math.hypot(dx, dy) < this.explosionRadius) {
            // Player nimmt Schaden (kein 'enemies' array nötig, itemDrops optional)
            player.takeDmg(this.dmg, [], null, enemyItemDrops);
        }
    }

    applyExplosionDamage(enemies, enemyItemDrops) {
        this.forEachEnemy(enemies, (enemy, enemies, j) => {
            const dx = enemy.globalEntityX - this.globalEntityX;
            const dy = enemy.globalEntityY - this.globalEntityY;
            if (Math.hypot(dx, dy) < this.explosionRadius) {
                enemy.takeDmg(this.dmg, enemies, j, enemyItemDrops);
            }
        });
    }

    applyExplosionDamageToPlayer(player, enemyItemDrops) {
        const dx = player.globalEntityX - this.globalEntityX;
        const dy = player.globalEntityY - this.globalEntityY;
        if (Math.hypot(dx, dy) < this.explosionRadius) {
            player.takeDmg(this.dmg, [], null, enemyItemDrops);
        }
    }

    draw(ctx, player) {
        const screenX = this.globalEntityX - player.globalEntityX + player.canvasWidthMiddle;
        const screenY = this.globalEntityY - player.globalEntityY + player.canvasWidthHeight;
        // TODO: Ersetzen durch PNG (Fireball + Explosion)
        if (this.exploded) {
            const elapsed = performance.now() - this.explodedTime;
            const opacity = Math.max(0, 1 - (elapsed / this.explosionDuration));
            ctx.fillStyle = `rgba(255, 50, 0, ${0.5 * opacity})`;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.explosionRadius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            super.draw(ctx, player);
        }
    }
}
