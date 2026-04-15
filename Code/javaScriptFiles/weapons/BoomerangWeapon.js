import {Weapon} from "./Weapon.js";


/**
 * BoomerangWeapon: Boomerang-Axt
 * WARUM SPECIAL: Boomerangs brauchen Array-Speicherung (nicht Grid) wegen Rückkehr-Logik
 */
export class BoomerangWeapon extends Weapon {
    constructor(icon, description, level, name, shooter, mapWidth, mapHeight, gridWidth, dmg, cooldown, range, piercing, maxLevel, startLevel, isSpecial, projectile, projectileConfig) {
        super(icon, description, level, name, shooter, mapWidth, mapHeight, gridWidth, dmg, cooldown, range, piercing, maxLevel, startLevel, isSpecial, projectile, projectileConfig);

        // Eigenes Array für Boomerangs (nicht Grid!)
        this.boomerangProjectiles = [];
    }

    createProjectiles(target, direction, currentTime, tilelength, gridWidth, player) {

        // Fix: Damage Multiplier anwenden
        const effectiveDamage = this.dmg * (this.shooter.damageMultiplier || 1);

        // Pass shooter in config so boomerang can return
        const extendedConfig = {
            ...this.projectileConfig, shooter: this.shooter, piercing: this.piercing // Pass piercing stat to projectile
        };

        const ProjectileClass = this.projectile;
        const projectile = new ProjectileClass(this.shooter.globalEntityX, this.shooter.globalEntityY, direction, effectiveDamage, extendedConfig, {},  // Kein Grid
            currentTime, false  // isEnemy
        );

        this.boomerangProjectiles.push(projectile);
    }

    shoot(player, currentTime, enemies, tilelength, gridWidth, inputState = null, enemyItemDrops = []) {
        // Rufe Basis-Shoot auf
        const shotFired = (currentTime - this.lastShotTime >= (this.cooldown * (player.cooldownMultiplier || 1)));
        super.shoot(player, currentTime, enemies, tilelength, gridWidth, inputState, enemyItemDrops);

        // Wenn geschossen wurde, korrigiere die Burst-Anzahl basierend auf Waffen-Level
        if (shotFired && this.lastShotTime === currentTime) {
            const baseAmount = Math.floor(this.projectileConfig.amount || 1);
            const playerExtra = player.extraProjectiles || 0;
            // Einer wurde bereits gefeuert, daher -1. Addiere Waffen-Amount und Player-Extra.
            if (baseAmount > 1) {
                this.burstRemaining = (this.burstRemaining || 0) + (baseAmount - 1);
            }
        }
    }

    updateStats() {
        if (this.level === this._currentStatsLevel) return;
        this.dmg += 15
        this.cooldown -= 100          // +15 Schaden pro Level
        this.piercing += 0     // +1 Piercing alle 2 Level
        this.range += 50         // +50 Range pro Level
        this.projectileConfig.projectileAmount += 0   // Keine Extra-Projektile
        this.projectileConfig.maxRange += 50    // +50 maxRange pro Level
        this._currentStatsLevel = this.level
    }


    renderProjectiles(ctx, playerOne, performanceNow, enemies, map, gridWidth, enemyItemDrops) {
        // Boomerangs verwenden eigenes Array, nicht Grid
        this._renderArray(this.boomerangProjectiles, ctx, playerOne, performanceNow, enemies, map, gridWidth, enemyItemDrops);
    }
}
