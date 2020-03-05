/**
 * Position class built for performance
 */
export default class Object {
    constructor (x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    set (position, y) {
        if (y === undefined) {
            this.x = position.x;
            this.y = position.y;
        }
        else {
            this.x = position;
            this.y = y;
        }
        return this;
    }

    add (position, y) {
        if (y === undefined) {
            this.x += position.x;
            this.y += position.y;
        }
        else {
            this.x += position;
            this.y += y;
        }
        return this;
    }

    subtract (position, y) {
        if (y === undefined) {
            this.x -= position.x;
            this.y -= position.y;
        }
        else {
            this.x -= position;
            this.y -= y;
        }
        return this;
    }

    multiply (value) {
        this.x *= value;
        this.y *= value;
        return this;
    }

    distance (position) {
        return Math.hypot(this.x - position.x, this.y - position.y);
    }

    get length () {
        return Math.hypot(this.x, this.y);
    }

    clone () {
        return new this.constructor(this.x, this.y);
    }
}
