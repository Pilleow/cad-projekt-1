const canvas = document.getElementById("canvas")
const ctx = canvas.getContext("2d")

// UTIL ---------------------------------------------------------------------------- //

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
}

resizeCanvas()
window.addEventListener("resize", resizeCanvas)

function* uniqueCombinations(arr, n, start = 0, combo = []) {
    if (combo.length === n) {
        yield combo.slice()
        return
    }
    for (let i = start; i < arr.length; i++) {
        combo.push(arr[i])
        yield* uniqueCombinations(arr, n, i + 1, combo)
        combo.pop()
    }
}

// Quantize to avoid FP mismatches in keys/lookups
const q = (v, n = 3) => Math.round(v * 10 ** n) / 10 ** n;
const edgeLen = (pts, i0 = 0, i1 = 1) => {
    const a = pts[i0], b = pts[i1];
    const dx = b.x - a.x, dy = b.y - a.y;
    return Math.hypot(dx, dy);
};

// CONSTS -------------------------------------------------------------------------- //

CW2 = canvas.width / 2
CH2 = canvas.height / 2
TRIANGLE_H_CONST = 0.866025403784

// BUILDING ELEMENTS --------------------------------------------------------------- //

class Poly {
    static nextId = 1;

    // points: [{x,y}, ...] in drawing order (clockwise or counter-clockwise)
    constructor(points, strokeColor = "#000", fillColor = "") {
        this.pts = points.map(p => ({x: p.x, y: p.y}));
        this.id = Poly.nextId++;
        this.strokeColor = strokeColor;
        this.fillColor = fillColor;
    }

    // centroid (for sorting, hit hints)
    centroid() {
        let sx = 0, sy = 0;
        for (const p of this.pts) {
            sx += p.x;
            sy += p.y;
        }
        const n = this.pts.length || 1;
        return {x: sx / n, y: sy / n};
    }

    // translate in place
    translate(dx, dy) {
        for (const p of this.pts) {
            p.x += dx;
            p.y += dy;
        }
    }

    clone() {
        return new Poly(this.pts.map(p => ({x: p.x, y: p.y})), this.strokeColor, this.fillColor);
    }

    transform(scale = 1, dx = 0, dy = 0) {
        for (const p of this.pts) {
            p.x = q(p.x * scale + dx);
            p.y = q(p.y * scale + dy);
        }
        return this;
    }

    key() {
        const idx = Poly._minVertexIndex(this.pts);
        const ordered = [...this.pts.slice(idx), ...this.pts.slice(0, idx)];
        return ordered.map(p => `${q(p.x)},${q(p.y)}`).join("|");
    }

    relKey(scale = 1, dx = 0, dy = 0) {
        const shifted = this.pts.map(p => ({x: q(p.x * scale + dx), y: q(p.y * scale + dy)}));
        const idx = Poly._minVertexIndex(shifted);
        const ordered = [...shifted.slice(idx), ...shifted.slice(0, idx)];
        return ordered.map(p => `${q(p.x)},${q(p.y)}`).join("|");
    }

    static _minVertexIndex(pts) {
        let min = 0;
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i], b = pts[min];
            // order by y then x
            if (a.y < b.y || (a.y === b.y && a.x < b.x)) min = i;
        }
        return min;
    }

    // bounds check: all vertices within canvas
    isInBounds() {
        const maxW = canvas.width / devicePixelRatio;
        const maxH = canvas.height / devicePixelRatio;
        return this.pts.every(p => p.x >= 0 && p.y >= 0 && p.x <= maxW && p.y <= maxH);
    }

    // point-in-polygon (ray casting)
    contains(x, y) {
        let inside = false;
        for (let i = 0, j = this.pts.length - 1; i < this.pts.length; j = i++) {
            const pi = this.pts[i], pj = this.pts[j];
            const intersect = ((pi.y > y) !== (pj.y > y)) &&
                (x < (pj.x - pi.x) * (y - pi.y) / (pj.y - pi.y + 0.0000001) + pi.x);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    draw() {
        if (!this.pts.length) return;
        ctx.beginPath();
        ctx.moveTo(this.pts[0].x, this.pts[0].y);
        for (let i = 1; i < this.pts.length; i++) {
            ctx.lineTo(this.pts[i].x, this.pts[i].y);
        }
        ctx.closePath();

        if (this.fillColor) {
            ctx.fillStyle = this.fillColor;
            ctx.fill();
        }
        if (this.strokeColor) {
            ctx.strokeStyle = this.strokeColor;
            ctx.stroke();
        }
    }

    static keyFromPointsTranslated(pts, dx, dy) {
        const shifted = pts.map(p => ({x: p.x + dx, y: p.y + dy}));
        const idx = Poly._minVertexIndex(shifted);
        const ordered = [...shifted.slice(idx), ...shifted.slice(0, idx)];
        return ordered.map(p => `${p.x},${p.y}`).join("|");
    }
}

const polys = [];
const polyKeys = new Set();

function comparePolys(a, b) {
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

// global
const polyKeyToPoly = new Map();

function indexPoly(poly) {
    polyKeyToPoly.set(poly.key(), poly);
}

function rebuildIndex() {
    polyKeyToPoly.clear();
    for (const p of polys) indexPoly(p);
}

// call indexPoly inside addPoly()
function addPoly(poly) {
    if (!poly.isInBounds()) return;
    const key = poly.key();
    if (polyKeys.has(key)) return;
    polyKeys.add(key);
    const idx = findInsertIndexPoly(polys, poly);
    polys.splice(idx, 0, poly);
    indexPoly(poly); // index new
}

// PROD ELEMENTS ------------------------------------------------------------------- //

class Prod {
    static nextId = 1;

    constructor(match, result) {
        this.match = match;   // array of Poly (relative templates)
        this.result = result; // array of Poly (relative templates)
        this.id = Prod.nextId++;
    }

    countRequiredPolys() {
        return this.match.length;
    }

    isMatching(pcomb) {
        if (!this.match || this.match.length === 0) return false;
        if (pcomb.length !== this.match.length) return false;

        // anchor: align pcomb[0] to match[0] (by their first vertex)
        const ax = pcomb[0].pts[0].x - this.match[0].pts[0].x;
        const ay = pcomb[0].pts[0].y - this.match[0].pts[0].y;

        const comboKeys = new Set(pcomb.map(p => p.relKey(ax, ay)));
        const matchKeys = new Set(this.match.map(m => m.key()));
        if (comboKeys.size !== matchKeys.size) return false;
        for (const k of comboKeys) if (!matchKeys.has(k)) return false;
        return true;
    }

    _cloneAndTranslate(arr, dx, dy) {
        return arr.map(p => {
            const q = new Poly(p.pts, p.strokeColor, p.fillColor);
            q.translate(dx, dy);
            return q;
        });
    }

    preview(pcomb) {
        const dx = pcomb[0].pts[0].x - this.match[0].pts[0].x;
        const dy = pcomb[0].pts[0].y - this.match[0].pts[0].y;

        let toAdd = this._cloneAndTranslate(this.result, dx, dy);

        // remove any that duplicate the matched combo by value
        const pcombKeys = new Set(pcomb.map(p => p.key()));
        toAdd = toAdd.filter(p => !pcombKeys.has(p.key()));

        if (toAdd.some(p => !p.isInBounds())) return [];
        toAdd = toAdd.filter(p => !polyKeys.has(p.key()));
        return toAdd;
    }
}


function findApplicableProductions(limit = 500) {
    const out = [];
    if (!polys.length) return out;

    for (const prod of prods) {
        const m0 = prod.match[0];
        const m0Edge = edgeLen(m0.pts, 0, 1) || 0;
        if (m0Edge === 0) continue; // avoid divide-by-zero

        for (const anchor of polys) {
            const aEdge = edgeLen(anchor.pts, 0, 1);
            if (aEdge === 0) continue;

            const s = q(aEdge / m0Edge);           // any real scale
            if (!isFinite(s) || s <= 0) continue;

            // align first vertex
            const dx = q(anchor.pts[0].x - m0.pts[0].x * s);
            const dy = q(anchor.pts[0].y - m0.pts[0].y * s);

            // verify all match pieces exist at this (s,dx,dy)
            let ok = true;
            const pcomb = [];
            for (const mt of prod.match) {
                const k = new Poly(mt.pts).transform(s, dx, dy).key();
                const hit = polyKeyToPoly.get(k);
                if (!hit) {
                    ok = false;
                    break;
                }
                pcomb.push(hit);
            }
            if (!ok) continue;

            // build candidate toAdd (transform results)
            let toAdd = prod.result.map(r => r.clone().transform(s, dx, dy));

            // remove duplicates with matched combo
            const pcombKeys = new Set(pcomb.map(p => p.key()));
            toAdd = toAdd.filter(p => !pcombKeys.has(p.key()));

            // bounds + global duplicates
            if (toAdd.some(p => !p.isInBounds())) continue;
            toAdd = toAdd.filter(p => !polyKeys.has(p.key()));
            if (!toAdd.length) continue;

            out.push({prod, pcomb, toAdd, scale: s, dx, dy});
            if (out.length >= limit) return out;
        }
    }
    return out;
}


canvas.addEventListener('mousemove', (e) => {
    if (!showCandidates) {
        hoveredCandidate = null;
        drawPolysWithPreview();
        return;
    }
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    candidates = findApplicableProductions();
    hoveredCandidate = candidateUnderPoint(candidates, x, y);
    drawPolysWithPreview();
});

canvas.addEventListener('click', (e) => {
    if (!showCandidates) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const current = findApplicableProductions();
    const hit = candidateUnderPoint(current, x, y);
    if (hit) {
        hit.apply?.(hit.pcomb); // if you wrap; else:

        const printEl = document.getElementById("print");
        if (printEl) {
            printEl.textContent = `Applied production ${hit.prod.id} to polys: ` +
                hit.pcomb.map(p => `#${p.id}`).join(", ");
        }

        hit.toAdd.forEach(p => addPoly(p));
        candidates = findApplicableProductions();
        hoveredCandidate = null;
        drawPolysWithPreview();
    }
});

// --- ISO TILE HELPERS ------------------------------------------------------------ //

function T(x, y, s, up = true, stroke = "#000", fill = "") {
    const h = s * TRIANGLE_H_CONST; // sqrt(3)/2
    return up
        ? new Poly([{x: x, y: y + h}, {x: x + s / 2, y: y}, {x: x + s, y: y + h}], stroke, fill)
        : new Poly([{x: x, y: y}, {x: x + s / 2, y: y + h}, {x: x + s, y: y}], stroke, fill);
}

// GENERATION ---------------------------------------------------------------------- //

const prods = [
    new Prod(
        [new Poly([
            {x: 0, y: 0},
            {x: 0, y: 64},
            {x: 64, y: 64},
            {x: 64, y: 0},
        ])],
        [new Poly([
            {x: 64, y: 0},
            {x: 64, y: 32},
            {x: 96, y: 32},
            {x: 96, y: 0},
        ])]
    ),
    new Prod(
        [new Poly([
            {x: 0, y: 0},
            {x: 0, y: 64},
            {x: 64, y: 64},
            {x: 64, y: 0},
        ])],
        [new Poly([
            {x: -32, y: 32},
            {x: -32, y: 64},
            {x: 0, y: 64},
            {x: 0, y: 32},
        ])]
    ),
    new Prod(
        [new Poly([
            {x: 0, y: 0},
            {x: 0, y: 64},
            {x: 64, y: 64},
            {x: 64, y: 0},
        ])],
        [new Poly([
            {x: 64, y: 64},
            {x: 64, y: 128},
            {x: 128, y: 128},
            {x: 128, y: 64},
        ])]
    ),
    new Prod(
        [new Poly([
            {x: 0, y: 0},
            {x: 0, y: 64},
            {x: 64, y: 64},
            {x: 64, y: 0},
        ])],
        [new Poly([
            {x: -64, y: -64},
            {x: -64, y: 0},
            {x: 0, y: 0},
            {x: 0, y: -64},
        ])]
    ),
];

// USER INPUT ---------------------------------------------------------------------- //

let autoMode = false;
let autoTimer = null;

function getMousePos(evt) {
    const r = canvas.getBoundingClientRect();
    return {x: evt.clientX - r.left, y: evt.clientY - r.top};
}

function candidateUnderPoint(cands, x, y) {
    for (const c of cands) {
        if (c.toAdd.some(p => p.contains(x, y))) return c;
    }
    return null;
}

function refreshCandidates() {
    candidates = findApplicableProductions();
}

let candidates = [];
let hoveredCandidate = null;

function startAutoMode() {
    if (autoTimer) return;
    autoMode = true;

    // hide previews while auto
    showCandidates = false;
    const toggle = document.getElementById('toggleCandidates');
    if (toggle) toggle.checked = false;

    // run every 500ms
    autoTimer = setInterval(autoTick, 10);
    drawPolysWithPreview();
}

function stopAutoMode() {
    autoMode = false;
    if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
    }
    // you can decide to re-enable previews or keep them off
    drawPolysWithPreview();
}

function autoTick() {
    // Get fresh list each tick
    const cands = findApplicableProductions();

    if (!cands.length) {
        stopAutoMode(); // no more moves
        return;
    }

    // ✅ Select a RANDOM candidate
    const choice = cands[Math.floor(Math.random() * cands.length)];

    const printEl = document.getElementById("print");
    if (printEl) {
        printEl.textContent = `Applied production ${choice.prod.id} to polys: ` +
            choice.pcomb.map(p => `#${p.id}`).join(", ");
    }

    // Apply the production result
    choice.toAdd.forEach(p => addPoly(p)); // addPoly refreshes candidates internally

    hoveredCandidate = null;
    drawPolysWithPreview(); // redraw without previews
}

// DRAWING ------------------------------------------------------------------------- //

let showCandidates = true;

function pointInPoly(x, y, poly) {
    return poly.contains(x, y);
}

function drawPolys() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e7d7c1";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 3;
    polys.forEach(p => p.draw());
}


function drawPolysWithPreview() {
    drawPolys();

    if (showCandidates && candidates && candidates.length) {
        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#989';
        for (const c of candidates) {
            for (const p of c.toAdd) p.draw(); // their strokeStyle applies
        }
        ctx.restore();
    }

    if (showCandidates && hoveredCandidate) {
        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
        hoveredCandidate.toAdd.forEach(p => p.draw());
        ctx.restore();
    }
}


function saveCanvasAsPNG() {
    canvas.toBlob((blob) => {
        const a = document.createElement('a');
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = URL.createObjectURL(blob);
        a.download = `rects-${ts}.png`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(a.href);
        a.remove();
    }, 'image/png');
}

// LISTENERS ----------------------------------------------------------------------- //

canvas.addEventListener('mousemove', (e) => {
    const {x, y} = getMousePos(e);
    hoveredCandidate = showCandidates
        ? candidateUnderPoint(candidates, x, y)
        : null;
    drawPolysWithPreview();
});

canvas.addEventListener('click', (e) => {
    if (!showCandidates) return;
    const {x, y} = getMousePos(e);
    const hit = candidateUnderPoint(candidates, x, y);
    if (hit) {
        hit.toAdd.forEach(p => addPoly(p)); // addPoly will refreshCandidates()
        hoveredCandidate = null;
        drawPolysWithPreview();
    }
});


document.getElementById('toggleCandidates').addEventListener('change', (e) => {
    showCandidates = e.target.checked;
    // Recompute only if turning on (optional)
    if (showCandidates) candidates = findApplicableProductions();
    drawPolysWithPreview();
});

document.getElementById('savePng').addEventListener('click', () => {
    saveCanvasAsPNG();
});

document.getElementById('autoMode').addEventListener('change', (e) => {
    if (e.target.checked) startAutoMode();
    else stopAutoMode();
});

// RUN ----------------------------------------------------------------------------- //

addPoly(new Poly([
    {x: CW2/2 - 64, y: CH2*3/2 - 64},
    {x: CW2/2 - 64, y: CH2*3/2 + 64},
    {x: CW2/2 + 64, y: CH2*3/2 + 64},
    {x: CW2/2 + 64, y: CH2*3/2 - 64}
]))

addPoly(new Poly([
    {x: CW2 - 64, y: CH2 - 64},
    {x: CW2 - 64, y: CH2 + 64},
    {x: CW2 + 64, y: CH2 + 64},
    {x: CW2 + 64, y: CH2 - 64}
]))

addPoly(new Poly([
    {x: CW2*3/2 - 64, y: CH2/2 - 64},
    {x: CW2*3/2 - 64, y: CH2/2 + 64},
    {x: CW2*3/2 + 64, y: CH2/2 + 64},
    {x: CW2*3/2 + 64, y: CH2/2 - 64}
]))

refreshCandidates();
drawPolysWithPreview();