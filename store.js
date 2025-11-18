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
    const key = poly.key();
    polyKeys.add(key);
    const idx = findInsertIndexPoly(polys, poly);
    polys.splice(idx, 0, poly);
    indexPoly(poly);
    document.getElementById("polyCount").innerText = polys.length.toString();
}

export function findPoly(target_p, e=2**2) {
    const target_pts = target_p.getPoints()
    let minPoly = polys[0];
    let minSqErr = 2**4;
    for (const p of polys) {
        let sqErr = 0;
        let pts = p.getPoints();
        if (pts.length !== target_pts.length) continue;
        for (let i = 0; i < pts.length; i++) {
            let dx = pts[i].x - target_pts[i].x;
            let dy = pts[i].y - target_pts[i].y;
            sqErr += dx * dx + dy * dy;
        }
        if (sqErr < minSqErr) {
            minSqErr = sqErr;
            minPoly = p;
            if (minSqErr < e) break;
        }
    }
    return minSqErr < e ? minPoly : null;
}

export function getPolyByKey(k) { return polyKeyToPoly.get(k); }

export function clearStore() {
    polys.length = 0;
    polyKeys.clear();
    polyKeyToPoly.clear();
}
