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

function compareRects(a, b) {
    if (a.y !== b.y) return b.y - a.y;
    if (a.x !== b.x) return b.x - a.x;
    return 0;
}

function findInsertIndex(arr, rect) {
    let lo = 0, hi = arr.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (compareRects(rect, arr[mid]) < 0) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;
}

// CONSTS -------------------------------------------------------------------------- //

CW2 = canvas.width / 2
CH2 = canvas.height / 2

// BUILDING ELEMENTS --------------------------------------------------------------- //

class Rect {
    static nextId = 1

    constructor(x, y, width, height) {
        this.x = x
        this.y = y
        this.w = width
        this.h = height
        this.id = Rect.nextId++
    }

    getKey() {
        return `${this.x},${this.y},${this.w},${this.h}`;
    }

    equals(other) {
        return this.x === other.x &&
            this.y === other.y &&
            this.w === other.w &&
            this.h === other.h;
    }

    isInBounds() {
        const maxW = canvas.width / window.devicePixelRatio;
        const maxH = canvas.height / window.devicePixelRatio;
        return this.x >= 0 &&
            this.y >= 0 &&
            this.x + this.w <= maxW &&
            this.y + this.h <= maxH;
    }


    draw() {
        ctx.strokeStyle = "#000";
        ctx.strokeRect(this.x, this.y, this.w, this.h);
    }
}

const rects = []
const rectKeys = new Set();

function addRect(rect) {
    if (!rect.isInBounds()) return;
    const key = rect.getKey();
    if (rectKeys.has(key)) return;
    rectKeys.add(key);
    const idx = findInsertIndex(rects, rect);
    rects.splice(idx, 0, rect);
}

addRect(new Rect(CW2 / 2, CH2 * 3 / 2, 32, 64))

// PROD ELEMENTS ------------------------------------------------------------------- //

class Prod {
    static nextId = 1

    constructor(match, result) {
        this.match = match
        this.result = result
        this.id = Prod.nextId++
    }

    countRequiredRects() {
        return this.match.length
    }

    isMatching(rcomb) {
        if (!this.match || this.match.length === 0) return false;
        if (rcomb.length !== this.match.length) return false;
        const dx = rcomb[0].x - this.match[0].x;
        const dy = rcomb[0].y - this.match[0].y;
        const comboKeys = new Set(
            rcomb.map(r => `${r.x - dx},${r.y - dy},${r.w},${r.h}`)
        );
        const matchKeys = new Set(
            this.match.map(m => `${m.x},${m.y},${m.w},${m.h}`)
        );
        if (comboKeys.size !== matchKeys.size) return false;
        for (const k of comboKeys) {
            if (!matchKeys.has(k)) return false;
        }
        return true;
    }

    apply(rcomb) {
        let toAdd = this.result.map(r => new Rect(r.x, r.y, r.w, r.h));
        const dx = rcomb[0].x - this.match[0].x;
        const dy = rcomb[0].y - this.match[0].y;
        toAdd.forEach(radd => {
            radd.x += dx;
            radd.y += dy;
        });
        toAdd = toAdd.filter(radd =>
            !rcomb.some(r =>
                r.x === radd.x &&
                r.y === radd.y &&
                r.w === radd.w &&
                r.h === radd.h
            )
        );
        if (toAdd.some(r => !r.isInBounds())) return false;
        toAdd = toAdd.filter(r => !rectKeys.has(r.getKey()));
        toAdd.forEach(r => addRect(r));
        return toAdd.length > 0;
    }

    preview(rcomb) {
        let toAdd = this.result.map(r => new Rect(r.x, r.y, r.w, r.h));
        const dx = rcomb[0].x - this.match[0].x;
        const dy = rcomb[0].y - this.match[0].y;
        toAdd.forEach(radd => {
            radd.x += dx;
            radd.y += dy;
        });
        toAdd = toAdd.filter(radd =>
            !rcomb.some(r =>
                r.x === radd.x && r.y === radd.y && r.w === radd.w && r.h === radd.h
            )
        );
        if (toAdd.some(r => !r.isInBounds())) return [];
        toAdd = toAdd.filter(r => !rectKeys.has(r.getKey()));
        return toAdd;
    }

}

function findApplicableProductions() {
    const candidates = [];
    for (const prod of prods) {
        const nreq = prod.countRequiredRects();
        if (nreq > rects.length) continue;

        for (const rcomb of uniqueCombinations(rects, nreq)) {
            if (!prod.isMatching(rcomb)) continue;
            const toAdd = prod.preview(rcomb);
            if (toAdd.length === 0) continue;

            candidates.push({prod, rcomb, toAdd});
        }
    }
    return candidates;
}

// GENERATION ---------------------------------------------------------------------- //

prods = [
    new Prod(
        [
            new Rect(0, 0, 32, 64),
        ],
        [
            new Rect(0, 0, 32, 64),
            new Rect(32, 0, 64, 32),
        ]
    ),
    new Prod(
        [
            new Rect(0, 0, 64, 32),
        ],
        [
            new Rect(0, 0, 64, 32),
            new Rect(0, 32, 32, 64),
        ]
    ),
    new Prod(
        [
            new Rect(0, 0, 32, 64),
        ],
        [
            new Rect(0, 0, 32, 64),
            new Rect(-64, 32, 64, 32),
        ]
    ),
    new Prod(
        [
            new Rect(0, 0, 64, 32),
        ],
        [
            new Rect(0, 0, 64, 32),
            new Rect(32, -64, 32, 64),
        ]
    ),
]

let iterCount = 0;
function runIteration() {
    iterCount += 1
    prods.forEach(prod => {
        let nreq = prod.countRequiredRects()
        if (nreq > rects.length) return
        for (let rcomb of uniqueCombinations([...rects], nreq)) {
            if (prod.isMatching(rcomb)) {
                if (prod.apply(rcomb)) {
                    console.log(iterCount, " | applied prod:", prod.id, " to rcomb", rcomb)
                    break
                }
            }
        }
    })
    drawRects()
}

// USER INPUT ---------------------------------------------------------------------- //

function getMousePos(evt) {
    const r = canvas.getBoundingClientRect();
    return {x: evt.clientX - r.left, y: evt.clientY - r.top};
}

function pointInRect(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function candidateUnderPoint(candidates, x, y) {
    for (const c of candidates) {
        if (c.toAdd.some(r => pointInRect(x, y, r))) return c;
    }
    return null;
}

let candidates = [];
let hoveredCandidate = null;

// DRAWING ------------------------------------------------------------------------- //

let showCandidates = true;

function drawRects() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "#e7d7c1";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#000"
    ctx.lineWidth = 3
    rects.forEach(rect => {
        rect.draw()
    })
}

function drawRectsWithPreview() {
    drawRects();

    if (showCandidates && candidates && candidates.length) {
        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#989';
        for (const c of candidates) {
            for (const r of c.toAdd) {
                ctx.strokeRect(r.x, r.y, r.w, r.h);
            }
        }
        ctx.restore();
    }

    if (showCandidates && hoveredCandidate) {
        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
        hoveredCandidate.toAdd.forEach(r => ctx.strokeRect(r.x, r.y, r.w, r.h));
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
    if (!showCandidates) {
        hoveredCandidate = null;
        drawRectsWithPreview();
        return;
    }
    const {x, y} = getMousePos(e);
    candidates = findApplicableProductions();
    hoveredCandidate = candidateUnderPoint(candidates, x, y);
    drawRectsWithPreview();
});

canvas.addEventListener('click', (e) => {
    if (!showCandidates) return; // no applying when hidden
    const {x, y} = getMousePos(e);
    const current = findApplicableProductions();
    const hit = candidateUnderPoint(current, x, y);
    if (hit) {
        hit.toAdd.forEach(r => addRect(r));
        candidates = findApplicableProductions();
        hoveredCandidate = null;
        drawRectsWithPreview();
    }
});

document.getElementById('toggleCandidates').addEventListener('change', (e) => {
    showCandidates = e.target.checked;
    // Recompute only if turning on (optional)
    if (showCandidates) candidates = findApplicableProductions();
    drawRectsWithPreview();
});

document.getElementById('savePng').addEventListener('click', () => {
    saveCanvasAsPNG();
});

// RUN ----------------------------------------------------------------------------- //

candidates = findApplicableProductions();
drawRectsWithPreview();