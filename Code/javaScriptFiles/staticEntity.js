import {Entity} from "./entity.js";

export class StaticEntity extends Entity {

    constructor(globalEntityX, globalEntityY, hitbox, png) {
        super(globalEntityX, globalEntityY, hitbox, png)
        this.globalEntityX = globalEntityX
        this.globalEntityY = globalEntityY
        this.hitbox = hitbox
    }
}