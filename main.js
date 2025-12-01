import {initCanvasAndCtx, queueToDraw, view} from './draw.js';
import {Poly} from './poly.js';
import {Prod} from './prod.js';
import {addPoly, clearStore, polys} from './store.js';
import {setupUI} from './ui.js';
import {EQUI_TRIANGLE_H} from './utils.js';

const canvas = document.getElementById('canvas');
const {ctx, dimsCss, clearAndBackground} = initCanvasAndCtx(canvas);

function isInBounds(poly) {
    const {width, height} = dimsCss();
    return poly.pts.every(p => p.x >= 0 && p.y >= 0 && p.x <= width && p.y <= height);
}

const presets = {
    tri: {
        name: 'Sierpinski Triangle',
        prods: [
            new Prod( // bottom left
                [
                    new Poly([
                        {x: 0, y: 0},
                        {x: 50, y: -100 * EQUI_TRIANGLE_H},
                        {x: 100, y: 0}
                    ])
                ],
                [
                    new Poly([
                        {x: 0, y: 0},
                        {x: 25, y: -50 * EQUI_TRIANGLE_H},
                        {x: 50, y: 0}
                    ])
                ]
            ),
            new Prod( // top
                [
                    new Poly([
                        {x: 0, y: 0},
                        {x: 50, y: -100 * EQUI_TRIANGLE_H},
                        {x: 100, y: 0}
                    ])
                ],
                [
                    new Poly([
                        {x: 25, y: -50 * EQUI_TRIANGLE_H},
                        {x: 50, y: -100 * EQUI_TRIANGLE_H},
                        {x: 75, y: -50 * EQUI_TRIANGLE_H}
                    ])
                ]
            ),
            new Prod( // bottom right
                [
                    new Poly([
                        {x: 0, y: 0},
                        {x: 50, y: -100 * EQUI_TRIANGLE_H},
                        {x: 100, y: 0}
                    ])
                ],
                [
                    new Poly([
                        {x: 50, y: 0},
                        {x: 75, y: -50 * EQUI_TRIANGLE_H},
                        {x: 100, y: 0}
                    ])
                ]
            ),
        ],
        seed(addPolyFn, isInBoundsFn, dimsCssFn) {
            const {width, height} = dimsCssFn();
            const CW2 = width / 2, CH2 = height / 2;
            const side = 2 ** 9

            addPolyFn(new Poly([
                {x: CW2 - side / 2, y: CH2 + side * EQUI_TRIANGLE_H / 2},
                {x: CW2, y: CH2 - side * EQUI_TRIANGLE_H / 2},
                {x: CW2 + side / 2, y: CH2 + side * EQUI_TRIANGLE_H / 2},
            ]), isInBoundsFn);
        }
    },

    sponge: {
        name: "Menger Sponge",
        prods: [
            new Prod(
                [
                    new Poly([
                        {x: 0, y: 0}, {x: 0, y: 3}, {x: 3, y: 3}, {x: 3, y: 0}
                    ])],
                [
                    new Poly([
                        {x: -2, y: 4}, {x: -2, y: 5}, {x: -1, y: 5}, {x: -1, y: 4}
                    ]),
                    new Poly([
                        {x: -2, y: -2}, {x: -2, y: -1}, {x: -1, y: -1}, {x: -1, y: -2}
                    ]),
                    new Poly([
                        {x: 4, y: -2}, {x: 4, y: -1}, {x: 5, y: -1}, {x: 5, y: -2}
                    ]),
                    new Poly([
                        {x: 4, y: 4}, {x: 4, y: 5}, {x: 5, y: 5}, {x: 5, y: 4}
                    ]),
                    new Poly([
                        {x: 1, y: -2}, {x: 1, y: -1}, {x: 2, y: -1}, {x: 2, y: -2}
                    ]),
                    new Poly([
                        {x: 1, y: 4}, {x: 1, y: 5}, {x: 2, y: 5}, {x: 2, y: 4}
                    ]),
                    new Poly([
                        {x: -2, y: 1}, {x: -2, y: 2}, {x: -1, y: 2}, {x: -1, y: 1}
                    ]),
                    new Poly([
                        {x: 4, y: 1}, {x: 4, y: 2}, {x: 5, y: 2}, {x: 5, y: 1}
                    ])
                ]
            ),
        ],
        seed(addPolyFn, isInBoundsFn, dimsCssFn) {
            const {width, height} = dimsCssFn();
            const CW2 = width / 2, CH2 = height / 2;
            const s = 2 ** 9;

            addPolyFn(new Poly([
                {x: CW2 - s / 2, y: CH2 - s / 2},
                {x: CW2 - s / 2, y: CH2 + s / 2},
                {x: CW2 + s / 2, y: CH2 + s / 2 + 1},
                {x: CW2 + s / 2, y: CH2 - s / 2 + 1}
            ]), isInBoundsFn);

            addPolyFn(new Poly([
                {x: CW2 - s / 6, y: CH2 - s / 6},
                {x: CW2 - s / 6, y: CH2 + s / 6},
                {x: CW2 + s / 6, y: CH2 + s / 6},
                {x: CW2 + s / 6, y: CH2 - s / 6}
            ]), isInBoundsFn);
        }
    },

    halfrect: {
        name: 'Half Cubes',
        prods: [
            new Prod(
                [new Poly([
                    {x: 0, y: 0}, {x: 0, y: 64}, {x: 64, y: 64}, {x: 64, y: 0}
                ])],
                [new Poly([
                    {x: 64, y: 0}, {x: 64, y: 32}, {x: 96, y: 32}, {x: 96, y: 0}
                ])]
            ),
            new Prod(
                [new Poly([
                    {x: 0, y: 0}, {x: 0, y: 64}, {x: 64, y: 64}, {x: 64, y: 0}
                ])],
                [new Poly([
                    {x: -32, y: 32}, {x: -32, y: 64}, {x: 0, y: 64}, {x: 0, y: 32}
                ])]
            ),
            new Prod(
                [new Poly([
                    {x: 0, y: 0}, {x: 0, y: 64}, {x: 64, y: 64}, {x: 64, y: 0}
                ])],
                [new Poly([
                    {x: 32, y: 64}, {x: 32, y: 96}, {x: 64, y: 96}, {x: 64, y: 64}
                ])]
            ),
            new Prod(
                [new Poly([
                    {x: 0, y: 0}, {x: 0, y: 64}, {x: 64, y: 64}, {x: 64, y: 0}
                ])],
                [new Poly([
                    {x: 0, y: -32}, {x: 0, y: 0}, {x: 32, y: 0}, {x: 32, y: -32}
                ])]
            ),
        ],
        seed(addPolyFn, isInBoundsFn, dimsCssFn) {
            const {width, height} = dimsCssFn();
            const CW2 = width / 2, CH2 = height / 2;
            const s = 2 ** 8;

            addPolyFn(new Poly([
                {x: CW2 - s / 2, y: CH2 - s / 2},
                {x: CW2 - s / 2, y: CH2 + s / 2},
                {x: CW2 + s / 2, y: CH2 + s / 2},
                {x: CW2 + s / 2, y: CH2 - s / 2}
            ]), isInBoundsFn);
        }
    },


    tiles: {
        name: 'Tiles',
        prods: [
            new Prod(
                [new Poly([
                    {x: 0, y: 0}, {x: 0, y: 32}, {x: 16, y: 32}, {x: 16, y: 0}
                ])],
                [new Poly([
                    {x: 16, y: 0}, {x: 16, y: 16}, {x: 48, y: 16}, {x: 48, y: 0}
                ])]
            ),
            new Prod(
                [new Poly([
                    {x: 0, y: 0}, {x: 0, y: 16}, {x: 32, y: 16}, {x: 32, y: 0}
                ])],
                [new Poly([
                    {x: 0, y: 16}, {x: 0, y: 48}, {x: 16, y: 48}, {x: 16, y: 16}
                ])]
            ),
            new Prod(
                [new Poly([
                    {x: 0, y: 0}, {x: 0, y: 32}, {x: 16, y: 32}, {x: 16, y: 0}
                ])],
                [new Poly([
                    {x: -32, y: 16}, {x: -32, y: 32}, {x: 0, y: 32}, {x: 0, y: 16}
                ])]
            ),
            new Prod(
                [new Poly([
                    {x: 0, y: 0}, {x: 0, y: 16}, {x: 32, y: 16}, {x: 32, y: 0}
                ])],
                [new Poly([
                    {x: 16, y: -32}, {x: 16, y: 0}, {x: 32, y: 0}, {x: 32, y: -32}
                ])]
            ),
        ],
        seed(addPolyFn, isInBoundsFn, dimsCssFn) {
            const {width, height} = dimsCssFn();

            addPolyFn(new Poly([
                {x: -16+width/2, y: -8+height/2},
                {x: -16+width/2, y: 8+height/2},
                {x: 16+width/2, y: 8+height/2},
                {x: 16+width/2, y: -8+height/2}
            ]), isInBoundsFn);
        }
    }
};

const printEl = document.getElementById('print');
const toggleCandidatesEl = document.getElementById('toggleCandidates');
const savePngEl = document.getElementById('savePng');
const autoModeEl = document.getElementById('autoMode');
const sceneSelect = document.getElementById('sceneSelect');
const stochasticCountEl = document.getElementById('stochasticCount');
const autoInformationEl = document.getElementById('autoInformation');
const ui = setupUI({
    canvas, ctx, dimsCss, clearAndBackground,
    prods: presets.sponge.prods,
    isInBounds, printEl, toggleCandidatesEl, savePngEl, autoModeEl, stochasticCountEl, autoInformationEl
});

function loadPreset(key) {
    const preset = presets[key];
    if (!preset) return;

    ui.stopAuto();
    clearStore();

    ui.setProds(preset.prods);
    preset.seed(addPoly, isInBounds, dimsCss);

    ui.refreshCandidates();

    clearAndBackground();
    view.prev_zoom = view.zoom;
    for (const p of polys) queueToDraw.push(p);
    ui.redraw();
}

loadPreset('tri');

sceneSelect?.addEventListener('change', (e) => {
    loadPreset(e.target.value);
});

window.addEventListener('resize', () => {
    ui.refreshCandidates();
    ui.redraw();
});
