import { Vec2Like } from './position';
import * as Vec from './position';

type DrawStyle = {
    dash?: number[],
    strokeStyle?: string | CanvasGradient | CanvasPattern,
    fillStyle?: string | CanvasGradient | CanvasPattern,
}

export function applyStyle(ctxt: CanvasRenderingContext2D, style: DrawStyle) {
    if (style.strokeStyle) { ctxt.strokeStyle = style.strokeStyle; }
    if (style.fillStyle) { ctxt.fillStyle = style.fillStyle; }
    if (style.dash) { ctxt.setLineDash(style.dash); }
}

export function drawSegment(
    ctxt: CanvasRenderingContext2D,
    from: Vec2Like, to: Vec2Like,
    style: DrawStyle | undefined = undefined
): void {
    ctxt.save();
    applyStyle(ctxt, style ?? {});

    ctxt.beginPath();
    ctxt.moveTo(from[0], from[1]);
    ctxt.lineTo(to[0], to[1]);
    ctxt.stroke();
    ctxt.restore();
}

export function drawCircle(
    ctxt: CanvasRenderingContext2D,
    point: Vec2Like,
    radius: number,
    style?: DrawStyle
): void {
    ctxt.save();
    applyStyle(ctxt, style ?? {});

    ctxt.beginPath();
    ctxt.ellipse(point[0], point[1], radius, radius, 0, 0, 360);
    ctxt.fill();
    ctxt.restore();
}

export function drawArrow(
    ctxt: CanvasRenderingContext2D,
    from: Vec2Like, to: Vec2Like,
    wingLen: number, spreadRad: number,
    style?: DrawStyle
): void {
    drawSegment(ctxt, from, to, style);

    const normal = Vec.normalise(Vec.sub(from, to));

    drawSegment(ctxt, to, Vec.add(to, Vec.scale(Vec.rotate(normal,  spreadRad), wingLen)), style);
    drawSegment(ctxt, to, Vec.add(to, Vec.scale(Vec.rotate(normal, -spreadRad), wingLen)), style);
}
