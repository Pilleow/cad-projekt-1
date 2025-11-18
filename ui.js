import {addPoly, polys} from './store.js';
import {findApplicableProductions} from './engine.js';
import {drawWithPreviews, screenToWorld, view} from './draw.js';

export let mouseX = 0, mouseY = 0;

export function setupUI({
                            canvas, ctx, dimsCss, clearAndBackground,
                            prods, isInBounds, printEl,
                            toggleCandidatesEl, savePngEl, autoModeEl,
                            stochasticCountEl, autoInformationEl
                        }) {
    let currentProds = prods;
    let showCandidates = true;
    let candidates = [];
    let hoveredCandidate = null;
    let autoTimer = null;
    let stochasticCount = -1;

    function polyArea(p) {
        const pts = p.pts;
        let sum = 0;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            sum += (pts[j].x * pts[i].y - pts[i].x * pts[j].y);
        }
        return Math.abs(sum) / 2;
    }

    function bboxArea(p) {
        const xs = p.pts.map(pt => pt.x);
        const ys = p.pts.map(pt => pt.y);
        const w = Math.max(...xs) - Math.min(...xs);
        const h = Math.max(...ys) - Math.min(...ys);
        return Math.max(0, w) * Math.max(0, h);
    }

    function scoreCandidate(cand) {
        let area = 0;
        for (const p of cand.toAdd) {
            const a = polyArea(p);
            area += a > 0 ? a : bboxArea(p);
        }
        return area;
    }

    function weightedChoice(cands) {
        const weights = cands.map(scoreCandidate);
        const total = weights.reduce((a, b) => a + b, 0);
        if (total <= 0) return cands[Math.floor(Math.random() * cands.length)];
        let r = Math.random() * total;
        for (let i = 0; i < cands.length; i++) {
            r -= weights[i];
            if (r <= 0) return cands[i];
        }
        return cands[cands.length - 1];
    }

    function refreshCandidates() {
        const {width, height} = dimsCss();
        candidates = findApplicableProductions(currentProds, width, height, stochasticCount);
    }

    function redraw() {
        clearAndBackground();
        drawWithPreviews(ctx, polys, showCandidates ? candidates : [], showCandidates ? hoveredCandidate : null);
    }

    function candidateUnderPoint(cands, x, y) {
        const world = screenToWorld(x, y);
        const wx = world.x;
        const wy = world.y;

        for (const c of cands) {
            for (const p of c.toAdd) {
                if (p.contains(wx, wy)) return c;
            }
        }
        return null;
    }

    canvas.addEventListener('click', (e) => {
        if (!showCandidates) return;

        const r = canvas.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top; // fixed: use 'e', not global 'event'
        refreshCandidates();
        const hit = candidateUnderPoint(candidates, x, y);
        if (hit) {
            if (printEl) {
                printEl.textContent = `Applied ${hit.prod.id} to ` +
                    hit.pcomb.map(p => `#${p.id}`).join(", ");
            }
            hit.toAdd.forEach(p => addPoly(p, isInBounds));
            refreshCandidates();
            hoveredCandidate = null;
            redraw();
        }
    });

    toggleCandidatesEl?.addEventListener('change', (e) => {
        showCandidates = e.target.checked;
        stochasticCount = -10;
        stochasticCountEl.value = -1;
        if (showCandidates) refreshCandidates();
        redraw();
    });

    savePngEl?.addEventListener('click', () => {
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
    });

    function startAuto() {
        if (autoTimer) return;
        if (toggleCandidatesEl) toggleCandidatesEl.checked = false;
        showCandidates = false;

        autoTimer = setInterval(() => {
            refreshCandidates();
            if (!candidates.length) {
                stopAuto();
                return;
            }

            const choice = weightedChoice(candidates);

            if (printEl) {
                printEl.textContent = `Applied ${choice.prod.id} to ` +
                    choice.pcomb.map(p => `#${p.id}`).join(", ");
            }

            choice.toAdd.forEach(p => addPoly(p, isInBounds));
            hoveredCandidate = null;
            redraw()
        }, 1);
    }

    function stopAuto() {
        if (autoTimer) {
            clearInterval(autoTimer);
            autoTimer = null;
        }
        if (autoModeEl) autoModeEl.checked = false;
        redraw();
    }

    function setProds(newProds) {
        currentProds = newProds;
        stopAuto();
        refreshCandidates();
        redraw();
    }

    autoModeEl?.addEventListener('change', (e) => e.target.checked ? startAuto() : stopAuto());
    stochasticCountEl?.addEventListener('change', (e) => {
        stochasticCount = e.target.value * 10;

        if (e.target.value === "-1") autoInformationEl.innerText = "Auto mode will use weighted probability.\n\nThis mode is slow because it iterates over every avaialble polygon and production, but is fair towards all polygons, as ones with more surface area will have a higher probability of being chosen compared to polygons with a smaller surface area.";
        else if (e.target.value === "0") autoInformationEl.innerText = "Auto mode will select the first available production. \n\nThis mode is good for filling the area with packed productions, but is entirely non-deterministic and does not use any randomness at all.";
        else if (e.target.value === "1") autoInformationEl.innerText = "Auto mode will randomly select one of ten possible productions. \n\nThis mode is very fast and efficient because it only iterates over a randomly selected ten polygons and ten productions, however it uses uniform randomness, which may result in large patches of empty space in some regions, and dense concentrations of polygons in others.";
        else autoInformationEl.innerText = "Unspecified behaviour. Reload page.";

        if (showCandidates) refreshCandidates();
        redraw();
    });

    canvas.addEventListener("wheel", (e) => {
        e.preventDefault();

        const zoomFactor = 1.1;
        const mouseX = e.offsetX;
        const mouseY = e.offsetY;

        const newZoom = e.deltaY < 0 ? view.zoom * zoomFactor : view.zoom / zoomFactor;

        view.offsetX = mouseX - (mouseX - view.offsetX) * (newZoom / view.zoom);
        view.offsetY = mouseY - (mouseY - view.offsetY) * (newZoom / view.zoom);

        view.zoom = newZoom;
        redraw();
    }, {passive: false});

    return {refreshCandidates, redraw, setProds, stopAuto};
}
