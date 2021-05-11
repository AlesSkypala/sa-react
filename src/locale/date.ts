import i18next from 'i18next';
import { parseTimestamp } from '../utils/datetime';

const shortOptions = { month: 'numeric', day: 'numeric' } as const;
const longOptions = { year: 'numeric', month: 'numeric', day: 'numeric' } as const;

export const timestampToShortDate = (ts: number) => parseTimestamp(ts).toLocaleDateString(i18next.language, shortOptions);
export const timestampToLongDate  = (ts: number) => parseTimestamp(ts).toLocaleDateString(i18next.language, longOptions);
