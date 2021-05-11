
export function parseTimestamp(stamp: number) { return new Date(stamp * 60_000); }
export function dateToTimestamp(date: Date) { return Math.floor(date.getTime() / 60_000); }

export function rangeIntersectsBounds(range: [number, number], bounds: [number, number][]) {
    return bounds.some(b => range[0] <= b[1] && range[1] >= b[0]);
}