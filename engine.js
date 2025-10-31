import { edgeLen, snap } from './utils.js';
import { Poly } from './poly.js';
import { polys, polyKeys, getPolyByKey } from './store.js';

export function findApplicableProductions(prods, canvasW, canvasH, limit = 500) {
    const out = [];
    if (!polys.length) return out;

    const isInBounds = (p) =>
        p.pts.every(pt => pt.x >= -1e-6 && pt.y >= -1e-6 && pt.x <= canvasW + 1e-6 && pt.y <= canvasH + 1e-6);

    for (const prod of prods) {
        const m0 = prod.match[0];
        const m0Edge = edgeLen(m0.pts, 0, 1) || 0;
        if (m0Edge === 0) continue;

        for (const anchor of polys) {
            const aEdge = edgeLen(anchor.pts, 0, 1);
            if (aEdge === 0) continue;

            let s = 1;
            if (true) s = aEdge / m0Edge;
            if (!isFinite(s) || s <= 0) continue;

            const dx = snap(anchor.pts[0].x - m0.pts[0].x * s);
            const dy = snap(anchor.pts[0].y - m0.pts[0].y * s);

            let ok = true;
            const pcomb = [];
            for (const mt of prod.match) {
                const test = new Poly(mt.pts.map(p => ({x:p.x, y:p.y}))).transform(s, dx, dy);
                let hit = getPolyByKey(test.key());
                if (!hit) { ok = false; break; }
                pcomb.push(hit);
            }
            if (!ok) continue;

            let toAdd = prod.result.map(r => r.clone().transform(s, dx, dy));

            const pcombKeys = new Set(pcomb.map(p => p.key()));
            toAdd = toAdd.filter(p => !pcombKeys.has(p.key()));
            if (toAdd.some(p => !isInBounds(p))) continue;
            toAdd = toAdd.filter(p => !polyKeys.has(p.key()));
            if (!toAdd.length) continue;

            out.push({ prod, pcomb, toAdd, scale: s, dx, dy });
            if (out.length >= limit) return out;
        }
    }
    return out;
}
