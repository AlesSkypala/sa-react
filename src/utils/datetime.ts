
export function parseTimestamp(stamp: number) { return new Date(stamp * 60_000); }
export function dateToTimestamp(date: Date) { return Math.floor(date.getTime() / 60_000); }
