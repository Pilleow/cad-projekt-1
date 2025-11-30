export const EQUI_TRIANGLE_H = 0.866025403784

export function edgeLen(pts, i0 = 0, i1 = 1) {
    const a = pts[i0], b = pts[i1];
    return Math.hypot(b.x - a.x, b.y - a.y);
}

export function randomNoRepeats(array) {
    let copy = array.slice(0);
    return function() {
        if (copy.length < 1) { copy = array.slice(0); }
        let index = Math.floor(Math.random() * copy.length);
        let item = copy[index];
        copy.splice(index, 1);
        return item;
    };
}
