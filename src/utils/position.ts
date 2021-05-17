
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