import { Vec2Like } from './position';

type DrawStyle = {
    dash?: number[],
    strokeStyle?: string | CanvasGradient | CanvasPattern,
}

export function drawSegment(
    ctxt: CanvasRenderingContext2D,
    from: Vec2Like, to: Vec2Like,
    style: DrawStyle | undefined = undefined
): void {
    style = style ?? {};

    ctxt.save();

    if (style.strokeStyle) { ctxt.strokeStyle = style.strokeStyle; }
    if (style.dash) { ctxt.setLineDash(style.dash); }

    ctxt.beginPath();
    ctxt.moveTo(from[0], from[1]);
    ctxt.lineTo(to[0], to[1]);
    ctxt.stroke();
    ctxt.restore();
}