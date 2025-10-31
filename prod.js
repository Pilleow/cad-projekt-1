import { Poly } from './poly.js';

export class Prod {
    static nextId = 1;

    constructor(match, result) {
        this.match = match;
        this.result = result;
        this.id = Prod.nextId++;
    }

    countRequiredPolys() { return this.match.length; }

    isMatching(pcomb) {
        if (!this.match?.length || pcomb.length !== this.match.length) return false;
        const ax = pcomb[0].pts[0].x - this.match[0].pts[0].x;
        const ay = pcomb[0].pts[0].y - this.match[0].pts[0].y;
        const comboKeys = new Set(pcomb.map(p => p.relKey(1, ax, ay)));
        const matchKeys = new Set(this.match.map(m => m.key()));
        if (comboKeys.size !== matchKeys.size) return false;
        for (const k of comboKeys) if (!matchKeys.has(k)) return false;
        return true;
    }

    _cloneAndTranslate(arr, dx, dy) {
        return arr.map(p => { const q = new Poly(p.pts, p.strokeColor, p.fillColor); q.translate(dx, dy); return q; });
    }

    preview(pcomb, isInBounds, hasKey) {
        const dx = pcomb[0].pts[0].x - this.match[0].pts[0].x;
        const dy = pcomb[0].pts[0].y - this.match[0].pts[0].y;
        let toAdd = this._cloneAndTranslate(this.result, dx, dy);
        const pcombKeys = new Set(pcomb.map(p => p.key()));
        toAdd = toAdd.filter(p => !pcombKeys.has(p.key()));
        if (toAdd.some(p => !isInBounds(p))) return [];
        toAdd = toAdd.filter(p => !hasKey(p.key()));
        return toAdd;
    }
}
