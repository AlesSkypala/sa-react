
export function parseTimestamp(stamp: number) { return new Date(stamp * 1000); }
export function dateToTimestamp(date: Date) { return Math.floor(date.getTime() / 1000); }
