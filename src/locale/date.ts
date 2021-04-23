import i18next from 'i18next';

const shortOptions = { month: 'numeric', day: 'numeric' } as const;
const longOptions = { year: 'numeric', month: 'numeric', day: 'numeric' } as const;

export const timestampToShortDate = (ts: number) => new Date(ts * 1000).toLocaleDateString(i18next.language, shortOptions);
export const timestampToLongDate  = (ts: number) => new Date(ts * 1000).toLocaleDateString(i18next.language, longOptions);
