export class IntersectInfo {
    constructor(type, index, distance) {
        this.type = type
        this.index = index
        this.distance = distance
    }
    checkDistance(type, index, distance) {
        if (distance < this.distance && distance > 1e-5) {
            this.distance = distance
            this.type = type
            this.index = index
        }
    }
}
