export class Item {

    constructor(icon, description) {
        this.icon = icon
        this.description = description
        this.level = 1
        //this.playerStatKey = playerStatKey
    }

    lvlUp() {
        this.level++;
        if (typeof this.updateStats === 'function') {
            this.updateStats()
        }
    }
}