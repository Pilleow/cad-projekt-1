import {edgeLen, randomNoRepeats} from './utils.js';
import { Poly } from './poly.js';
import {polys, findPoly} from './store.js';

export function findApplicableProductions(prods, canvasW, canvasH, stochasticCount = -1) {
    const out = [];
    let polysIn = [];
    let prodsIn = [];
    if (!polys.length) return out;
    if (stochasticCount > 0) {
        let chooserPolys = randomNoRepeats(polys);
        for (let i = 0; i < stochasticCount; i++) {
            polysIn.push(chooserPolys());
        }
        let chooserProds = randomNoRepeats(prods);
        for (let i = 0; i < stochasticCount; i++) {
            prodsIn.push(chooserProds());
        }
    } else {
        polysIn = polys;
        prodsIn = prods;
    }

    for (const prod of prodsIn) {
        const m0 = prod.match[0];
        const m0Edge = edgeLen(m0.pts, 0, 1) || 0;
        if (m0Edge === 0) continue;

        for (const anchor of polysIn) {
            const aEdge = edgeLen(anchor.pts, 0, 1);
            if (aEdge === 0) continue;

            let s = aEdge / m0Edge;
            if (!isFinite(s) || s <= 0) continue;

            const dx = anchor.pts[0].x - m0.pts[0].x * s;
            const dy = anchor.pts[0].y - m0.pts[0].y * s;

            let ok = true;
            const pcomb = [];
            let test;
            for (const mt of prod.match) {
                test = new Poly(mt.pts.map(p => ({x:p.x, y:p.y}))).transform(s, dx, dy);
                let found = findPoly(test);
                if (!found) { ok = false; break; }
                pcomb.push(mt);
            }
            if (!ok) continue;

            let toAdd = prod.result.map(r => r.clone().transform(s, dx, dy));
            toAdd = toAdd.filter(p => !findPoly(p));
            if (!toAdd.length) continue;

            out.push({ prod, pcomb, toAdd, scale: s, dx, dy });
            if (stochasticCount >= 0 && out.length > stochasticCount) return out;
        }
    }
    return out;
}
