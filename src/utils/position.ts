
export type Rect2Like = {
    x: number,
    y: number,
    width: number,
    height: number,
}

export type Vec2 = [ number, number ];
export type Vec2Like = [ number, number ] | number[];

export function contains(area: Rect2Like, point: Vec2Like) {
    return point[0] >= area.x && point[0] < area.x + area.width &&
           point[1] >= area.y && point[1] < area.y + area.height;
}

export function getPosIn(area: Rect2Like, point: Vec2Like, clamp = false, relative = false): Vec2 | undefined {
    if (!contains(area, point)) {
        if (clamp) {
            point[0] = Math.max(area.x, Math.min(area.x + area.width,  point[0]));
            point[1] = Math.max(area.y, Math.min(area.y + area.height, point[1]));
        } else {
            return undefined;
        }
    }

    const pos: Vec2 = [ point[0] - area.x, point[1] - area.y ]; 

    if (relative) {
        pos[0] /= area.width;
        pos[1] /= area.height;
    }

    return pos;
}

export function createRect(a: Vec2Like, b: Vec2Like): Rect2Like {
    const topLeft:  Vec2 = [ Math.min(a[0], b[0]), Math.min(a[1], b[1]) ];
    const botRight: Vec2 = [ Math.max(a[0], b[0]), Math.max(a[1], b[1]) ];

    return {
        x: topLeft[0],
        y: topLeft[1],
        width:  botRight[0] - topLeft[0],
        height: botRight[1] - topLeft[1],
    };
}

export function add(a: Vec2Like, b: Vec2Like): Vec2 {
    return [ a[0] + b[0], a[1] + b[1] ];
}

export function sub(a: Vec2Like, b: Vec2Like): Vec2 {
    return [ a[0] - b[0], a[1] - b[1] ];
}

export function dot(a: Vec2Like, b: Vec2Like): number {
    return a[0] * b[0] + a[1] * b[1];
}

export function mul(a: Vec2Like, b: Vec2Like): Vec2 {
    return [ a[0] * b[0], a[1] * b[1] ];
}

export function div(a: Vec2Like, b: Vec2Like): Vec2 {
    return [ a[0] / b[0], a[1] / b[1] ];
}

export function scale(a: Vec2Like, scalar: number): Vec2 {
    return [ a[0] * scalar, a[1] * scalar ];
}

export function normsq(a: Vec2Like): number {
    return dot(a, a);
}

export function norm(a: Vec2Like): number {
    return Math.sqrt(dot(a, a));
}

export function normalise(a: Vec2Like): Vec2 {
    return scale(a, 1 / norm(a));
}

export function rotate(a: Vec2Like, angleRad: number): Vec2 {
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);

    return [
        a[0] * c - a[1] * s,
        a[0] * s + a[1] * c
    ];
}
