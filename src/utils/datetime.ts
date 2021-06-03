
export function parseTimestamp(stamp: number) { return new Date(stamp * 60_000); }
export function dateToTimestamp(date: Date) { return Math.floor(date.getTime() / 60_000); }

export function rangesIntersect(a: [number, number], b: [number, number]) {
    return a[0] <= b[1] && a[1] >= b[0];
}

export function rangeIntersectsBounds(range: [number, number], bounds: [number, number][]) {
    return bounds.some(b => rangesIntersect(range, b));
}

const clamp = (val: number, from: number, to: number) => Math.max(Math.min(val, to), from);

export function clampDate(date: Date, min: Date, max: Date) {
    if (min > date) return min;
    if (max < date) return max;
    return date;
}

export function getDayFromEnd(range: Graph['xRange'], dayIdx: number): Graph['xRange'] {
    const lastDay = parseTimestamp(range[1] as number);
    lastDay.setHours(0, 0, 0, 0);

    const dayStart = new Date(new Date(lastDay.getTime()).setDate(lastDay.getDate() - dayIdx));
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    return [
        clamp(dateToTimestamp(dayStart), range[0], range[1]),
        clamp(dateToTimestamp(dayEnd), range[0], range[1])
    ];
}

export function getDay(date: Date, dayOffset = 0): Date {
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + dayOffset);

    return date;
}

export function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// export function mergeRanges(ranges: [number, number][][]) {
//     const pivot = [ ...ranges[0] ];

//     for (const range of ranges.slice(1).flatMap(r => r)) {
//         if (pivot.some(r => r[0] <= range[0] && r[1] >= range[1])) continue; // Skip if subset of any
//         if (!pivot.some(r => rangesIntersect(r, range))) { pivot.push(range); pivot.sort((a, b) => a[0] - b[0]); continue; } // Add if not intersecting
        
//         // Resolve intersections
//         for ()
//     }

//     return pivot;
// }
