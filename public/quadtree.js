export class Bound {
    constructor (x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    isInside (point) {
        return point.x >= this.x && this.y >= this.y &&
            point.x < this.x + this.width && point.y < this.y + this.height;
    }

    divide () {
        const size = [this.width / 2, this.height / 2];
        return [
            new Bound(this.x, this.y, ...size),
            new Bound(this.x + size[0], this.y, ...size),
            new Bound(this.x, this.y + size[1], ...size),
            new Bound(this.x + size[0], this.y + size[1], ...size),
        ];
    }

    intersects (bound) {
        return !(bound.x + bound.width < this.x || bound.x > this.x + this.width ||
            bound.y + bound.height < this.y || bound.y > this.y + this.height);
    }
}

export default class QuadTree {
    constructor (bound) {
        this.points = [];
        this.subs = [];
        this.bound = bound;
    }

    add (point) {
        // Wrong place
        if (!this.bound.isInside(point)) {
            return false;
        }

        // Insert
        if (this.points.length < QuadTree.MAX_CAPACITY) {
            this.points.push(point);
            return true;
        }

        // Divide
        if (!this.subs.length) {
            this.subs = this.bound.divide().map(bound => new QuadTree(bound));
            this.points.forEach((existing) => {
                this.subs.find(sub => sub.add(existing));
            });
        }

        return this.subs.find(sub => sub.add(point));
    }

    get (bound) {
        const points = [];

        if (this.bound.intersects(bound)) {
            if (this.subs.length) {
                this.subs.forEach((sub) => {
                    points.push(...sub.get(bound));
                });
            }
            else {
                this.points.forEach((point) => {
                    if (bound.isInside(point)) {
                        points.push(point);
                    }
                });
            }
        }

        return points;
    }

    reset (newBound) {
        this.points = [];
        this.subs = [];
        this.bound = newBound;
    }
}
QuadTree.MAX_CAPACITY = 50;
