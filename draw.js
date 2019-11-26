export class Draw {
    constructor(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        document.body.appendChild(canvas);
        const context = canvas.getContext('2d');
        context.lineWidth = 1;
        context.translate(0.5, 0.5);
        context.font = '12px Helvetica';
        this.canvas = canvas;
        this.context = context;
        this.images = {};
    }
    hex(c) {
        return Math.min(Math.max(c|0, 0), 255).toString(16);
    }

    hexify(r, g, b) {
        const rc = this.hex(r);
        const gc = g !== undefined ? this.hex(g) : rc;
        const bc = b !== undefined ? this.hex(b) : rc;
        return '#' + (rc.length === 1 ? '0' + rc : rc) +
            (gc.length === 1 ? '0' + gc : gc) +
            (bc.length === 1 ? '0' + bc : bc);
    }
    stroke(r, g, b) {
        this.context.strokeStyle = this.hexify(r, g, b);
    }

    fill(r, g, b) {
        this.context.fillStyle = this.hexify(r, g, b);
    }

    rect(x, y, w, h) {
        this.context.fillRect(x, y, 1, 1);
        this.context.strokeRect(x, y, 1, 1);
    }

    point(x, y) {
        this.context.strokeRect(x, y , .5, .5)
    }
}
