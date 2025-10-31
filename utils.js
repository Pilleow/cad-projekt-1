export const EPS_PX = 1 / (2 ** 20) // 20
export const EQUI_TRIANGLE_H = 0.866025403784
export const snap = (v, eps = EPS_PX) => Math.round(v / eps) * eps;

export function edgeLen(pts, i0 = 0, i1 = 1) {
    const a = pts[i0], b = pts[i1];
    return Math.hypot(b.x - a.x, b.y - a.y);
}

export function* uniqueCombinations(arr, n, start = 0, combo = []) {
    if (combo.length === n) {
        yield combo.slice();
        return;
    }
    for (let i = start; i < arr.length; i++) {
        combo.push(arr[i]);
        yield* uniqueCombinations(arr, n, i + 1, combo);
        combo.pop();
    }
}
