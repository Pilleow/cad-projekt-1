export let view = {
    zoom: 1,
    prev_zoom: 0,
    offsetX: 0,
    offsetY: 0
};

export let queueToDraw = [];

export function initCanvasAndCtx(canvas) {
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, Math.floor(rect.width * window.devicePixelRatio));
        canvas.height = Math.max(1, Math.floor(rect.height * window.devicePixelRatio));
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function dimsCss() {
        return {width: canvas.width / window.devicePixelRatio, height: canvas.height / window.devicePixelRatio};
    }

    function clearAndBackground() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#e7d7c1";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    return {ctx, dimsCss, clearAndBackground};
}

export function drawPolys(ctx, polys) {
    ctx.lineWidth = 1 / view.zoom;
    queueToDraw.forEach(p => {
        p.draw(ctx);
    });
    queueToDraw.length = 0;
}

export function drawWithPreviews(ctx, polys, candidates, hovered) {
    ctx.setTransform(
        view.zoom, 0,
        0, view.zoom,
        view.offsetX, view.offsetY
    );

    if (candidates?.length) {
        ctx.save();
        ctx.setLineDash([2 / view.zoom, 2 / view.zoom]);
        ctx.lineWidth = 1 / view.zoom * 0.8;
        // const worldMouse = screenToWorld(mouseX, mouseY);
        for (const c of candidates) {
            // const ctr = polyCentroid(c.toAdd[0]);
            for (const p of c.toAdd) {
                // const dx = ctr.x - worldMouse.x;
                // const dy = ctr.y - worldMouse.y;
                // const d2 = dx * dx + dy * dy;
                //
                // ctx.strokeStyle = colorFromDistanceSquared(d2);
                p.draw(ctx, false, true);
            }
        }
        ctx.restore();
    }

    if (hovered) {
        ctx.save();
        ctx.setLineDash([4 / view.zoom, 4 / view.zoom]);
        ctx.lineWidth = 1 / view.zoom * 0.9;
        ctx.strokeStyle = '#333';
        hovered.toAdd.forEach(p => p.draw(ctx, false, true));
        ctx.restore();
    }

    drawPolys(ctx, polys);

    ctx.restore();
}

export function screenToWorld(x, y) {
    return {
        x: (x - view.offsetX) / view.zoom,
        y: (y - view.offsetY) / view.zoom
    };
}
