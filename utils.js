export const EQUI_TRIANGLE_H = 0.866025403784

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

export function randomNoRepeats(array) {
    var copy = array.slice(0);
    return function() {
        if (copy.length < 1) { copy = array.slice(0); }
        var index = Math.floor(Math.random() * copy.length);
        var item = copy[index];
        copy.splice(index, 1);
        return item;
    };
}
