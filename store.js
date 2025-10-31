import {snap} from "./utils.js";

export const polys = [];
export const polyKeys = new Set();
export const polyKeyToPoly = new Map();

export function comparePolys(a, b) {
    const ca = a.centroid(), cb = b.centroid();
    if (ca.y !== cb.y) return cb.y - ca.y;
    if (ca.x !== cb.x) return cb.x - ca.x;
    return 0;
}

function findInsertIndexPoly(arr, poly) {
    let lo = 0, hi = arr.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (comparePolys(poly, arr[mid]) < 0) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

export function indexPoly(poly) { polyKeyToPoly.set(poly.key(), poly); }

export function rebuildIndex() {
    polyKeyToPoly.clear();
    for (const p of polys) indexPoly(p);
}

export function addPoly(poly, isInBounds = () => true) {
    if (!isInBounds(poly)) return;
    for (const pt of poly.pts) {
        pt.x = snap(pt.x);
        pt.y = snap(pt.y);
    }
    const key = poly.key();
    if (polyKeys.has(key)) return;
    polyKeys.add(key);
    const idx = findInsertIndexPoly(polys, poly);
    polys.splice(idx, 0, poly);
    indexPoly(poly);
    document.getElementById("polyCount").innerText = polys.length.toString();
}

export function getPolyByKey(k) { return polyKeyToPoly.get(k); }

export function clearStore() {
    polys.length = 0;
    polyKeys.clear();
    polyKeyToPoly.clear();
}
