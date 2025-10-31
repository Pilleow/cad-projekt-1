import {EPS_PX, snap} from './utils.js';

export class Poly {
    static nextId = 1;

    constructor(points, strokeColor = "#000", fillColor = "") {
        this.pts = points.map(p => ({x: p.x, y: p.y}));
        this.id = Poly.nextId++;
        this.strokeColor = strokeColor;
        this.fillColor = fillColor;
    }

    centroid() {
        let sx = 0, sy = 0;
        for (const p of this.pts) {
            sx += p.x;
            sy += p.y;
        }
        const n = this.pts.length || 1;
        return {x: sx / n, y: sy / n};
    }

    translate(dx, dy) {
        for (const p of this.pts) {
            p.x += dx;
            p.y += dy;
        }
    }

    clone() {
        return new Poly(this.pts.map(p => ({...p})), this.strokeColor, this.fillColor);
    }

    transform(scale = 1, dx = 0, dy = 0) {
        for (const p of this.pts) {
            p.x = snap(p.x * scale + dx);
            p.y = snap(p.y * scale + dy);
        }
        return this;
    }

    static _minVertexIndex(pts) {
        let min = 0;
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i], b = pts[min];
            if (a.y < b.y || (a.y === b.y && a.x < b.x)) min = i;
        }
        return min;
    }

    key() {
        const pts = this.pts.map(p => ({ x: snap(p.x), y: snap(p.y) }));
        const idx = Poly._minVertexIndex(pts);
        const ordered = [...pts.slice(idx), ...pts.slice(0, idx)];
        return ordered.map(p => `${p.x},${p.y}`).join("|");
    }

    relKey(s = 1, dx = 0, dy = 0) {
        const pts = this.pts.map(p => ({
            x: snap(p.x * s + dx),
            y: snap(p.y * s + dy)
        }));
        const idx = Poly._minVertexIndex(pts);
        const ordered = [...pts.slice(idx), ...pts.slice(0, idx)];
        return ordered.map(p => `${p.x},${p.y}`).join("|");
    }

    draw(ctx, fillColor=true, isPreview=false) {
        if (!this.pts.length) return;
        ctx.beginPath();
        ctx.moveTo(this.pts[0].x, this.pts[0].y);
        for (let i = 1; i < this.pts.length; i++) ctx.lineTo(this.pts[i].x, this.pts[i].y);
        ctx.closePath();
        if (this.fillColor && fillColor) {
            if (!isPreview) ctx.fillStyle = this.fillColor;
            ctx.fill();
        }
        if (this.strokeColor) {
            if (!isPreview) ctx.strokeStyle = this.strokeColor;
            ctx.stroke();
        }
    }

    static keyFromPointsTranslated(pts, dx, dy) {
        const shifted = pts.map(p => ({x: p.x + dx, y: p.y + dy}));
        const idx = Poly._minVertexIndex(shifted);
        const ordered = [...shifted.slice(idx), ...shifted.slice(0, idx)];
        return ordered.map(p => `${p.x},${p.y}`).join("|");
    }

    contains(x, y) {
        let inside = false;
        for (let i = 0, j = this.pts.length - 1; i < this.pts.length; j = i++) {
            const pi = this.pts[i], pj = this.pts[j];
            const intersect = ((pi.y > y) !== (pj.y > y)) &&
                (x < (pj.x - pi.x) * (y - pi.y) / (pj.y - pi.y + 1e-7) + pi.x);
            if (intersect) inside = !inside;
        }
        return inside;
    }
}
