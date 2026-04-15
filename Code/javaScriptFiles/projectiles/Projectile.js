import {MovingEntity} from "../movingEntity.js";

/**
 * Basis-Klasse für alle Projektile
 */
export class Projectile extends MovingEntity {
    constructor(globalEntityX, globalEntityY, direction, dmg, config = {}, gridMapTile = {}, creationTime, isEnemy = false) {
        super(globalEntityX, globalEntityY, 1, config.image || null, config.speed || 6, {
            width: config.width || config.size || 6, height: config.height || config.size || 6
        });

        this.direction = direction;
        this.dmg = dmg;
        this.config = config;
        this.gridMapTile = gridMapTile;
        this.creationTime = creationTime;
        this.isAlive = true;
        this.isEnemy = isEnemy;

        // Aus Config extrahiert
        this.size = config.size || 6;
        this.piercing = config.piercing || 0;

        // Drawing dimensions
        this.drawWidth = config.width || this.size;
        this.drawHeight = config.height || this.size;

        // Rotation for spinning projectiles
        this.rotationAngle = 0;
        this.spinSpeed = config.spinSpeed || 0;

        // Graphical tweaks
        this.glow = config.glow || null; // { color: 'red', blur: 20 }
        this.rotationOffset = config.rotationOffset || 0; // In Radians (e.g., Math.PI/2 for 90°)
    }

    /**
     * Statische Methode: Generiert eine zufällige Richtung
     * Wird von Molotov, Thunderstrike etc. genutzt
     */
    static getRandomDirection() {
        const randomAngle = Math.random() * Math.PI * 2;
        return {
            x: Math.cos(randomAngle), y: Math.sin(randomAngle)
        };
    }

    /**
     * Template-Method: Wird von Waffe aufgerufen
     */
    handleProjectile(ctx, projectiles, projectileIndex, enemies, player, map, gridWidth, enemyItemDrops, currentTime) {
        // 1. Update Position und State
        this.update(map, projectiles, projectileIndex, gridWidth, player, currentTime);

        // 2. Draw if still alive
        if (this.isAlive) {
            this.draw(ctx, player);
        }

        // 3. Collision Detection
        if (this.isAlive) {
            this.checkCollision(enemies, player, projectiles, projectileIndex, enemyItemDrops, currentTime);
        }

        // 4. Cleanup if dead
        if (!this.isAlive) {
            this.cleanup(projectiles, projectileIndex);
        }
    }

    /**
     * Update Position und State - Überschreiben in Subklassen
     */
    update(map, projectiles, projectileIndex, gridWidth, player, currentTime) {
        if (this.spinSpeed) {
            this.rotationAngle += this.spinSpeed;
        }
        this.move(map, projectiles, projectileIndex, gridWidth, currentTime);
    }

    /**
     * Standard-Bewegungslogik
     */
    move(map, projectiles, projectileIndex, gridWidth, currentTime) {
        let oldGlobalEntityX = this.globalEntityX;
        let oldGlobalEntityY = this.globalEntityY;

        // Standard-Bewegung in Richtung
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

        // Wandkollisions-Handling
        if ((oldGlobalEntityX === this.globalEntityX && this.direction.x !== 0) || (oldGlobalEntityY === this.globalEntityY && this.direction.y !== 0)) {
            this.onWallCollision();
        }
    }

    onWallCollision() {
        this.isAlive = false;
    }

    /**
     * Draw Projektil - Platzhalter für spätere PNG-Grafik
     */
    draw(ctx, player) {
        const screenX = this.globalEntityX - player.globalEntityX + player.canvasWidthMiddle;
        const screenY = this.globalEntityY - player.globalEntityY + player.canvasWidthHeight;

        if (this.png) {
            ctx.save();
            ctx.translate(screenX, screenY);

            // Apply Glow if configured
            if (this.glow) {
                ctx.shadowBlur = this.glow.blur || 15;
                ctx.shadowColor = this.glow.color || 'white';
            }

            let angle;
            if (this.spinSpeed !== 0) {
                // Use continuous rotation for spinning projectiles
                angle = this.rotationAngle;
            } else {
                // Calculate rotation angle based on direction for directional projectiles
                angle = Math.atan2(this.direction.y, this.direction.x);
            }

            // Add static offset (e.g. if sprite points up instead of right)
            ctx.rotate(angle + this.rotationOffset);

            // Draw image centered
            ctx.drawImage(this.png, -this.drawWidth / 2, -this.drawHeight / 2, this.drawWidth, this.drawHeight);

            ctx.restore();
        } else {
            // TODO: Ersetzen durch this.png Bild
            ctx.fillStyle = this.isEnemy ? '#FF0000' : '#FFFF00';
            ctx.fillRect(screenX - this.size / 2, screenY - this.size / 2, this.size, this.size);
        }
    }

    /**
     * Collision Detection
     */
    checkCollision(enemies, player, projectiles, projectileIndex, enemyItemDrops, currentTime) {
        if (this.isEnemy) {
            // Enemy-Projektil trifft Spieler
            if (this.checkCollisionWithEntity(player)) {
                player.takeDmg(this.dmg, [], null, enemyItemDrops);
                this.isAlive = false;
            }
        } else {
            // Player-Projektil trifft Gegner
            this.checkCollisionWithEnemies(enemies, enemyItemDrops);
        }
    }


    /**
     * Helper: Iteriere über alle Enemies im Grid
     */
    forEachEnemy(enemies, callback) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            for (let n = enemies[i].length - 1; n >= 0; n--) {
                for (let j = enemies[i][n].within.length - 1; j >= 0; j--) {
                    if (callback(enemies[i][n].within[j], enemies, j) === false) return;
                }
            }
        }
    }

    /**
     * Prüfe Collision mit allen Gegnern
     */
    checkCollisionWithEnemies(enemies, enemyItemDrops) {
        this.forEachEnemy(enemies, (enemy, enemies, j) => {
            if (this.checkCollisionWithEntity(enemy)) {
                enemy.takeDmg(this.dmg, enemies, j, enemyItemDrops);
                if (!this.piercing) this.isAlive = false;
                return false; // break
            }
        });
    }

    /**
     * Cleanup - Entfernen aus Grid oder Array
     */
    cleanup(projectiles, projectileIndex) {
        this.removeFrom(projectiles, projectileIndex);
    }

    /**
     * SELBSTBESTIMMTE SPEICHERUNG
     * Das Projectile entscheidet selbst, wie es gespeichert wird.
     */
    addTo(weaponProjectiles) {
        // Standard: Player-Projectil mit Grid-Speicherung
        if (this.isEnemy) {
            // Enemy-Projectil: einfaches Array
            weaponProjectiles.push(this);
        } else if (Object.keys(this.gridMapTile).length > 0) {
            // Grid-basiert (Standard für Player-Projektile)
            const {row, column} = this.gridMapTile;
            if (!Array.isArray(weaponProjectiles[row]?.[column]?.within)) {
                weaponProjectiles[row][column].within = [];
            }
            weaponProjectiles[row][column].within.push(this);
        } else {
            // Fallback: einfaches Array (Orbits, Specials)
            weaponProjectiles.push(this);
        }
    }

    /**
     * Entfernt sich selbst aus Speicherung
     */
    removeFrom(weaponProjectiles, index) {
        if (this.isEnemy || !Object.keys(this.gridMapTile).length) {
            // Array-basiert
            weaponProjectiles.splice(index, 1);
        } else {
            // Grid-basiert
            const {row, column} = this.gridMapTile;
            if (weaponProjectiles[row]?.[column]?.within) {
                weaponProjectiles[row][column].within.splice(index, 1);
            }
        }
    }
}
