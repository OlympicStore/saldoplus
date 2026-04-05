/** Composite key for year-aware monthly data: year * 100 + month (e.g., 202600 for Jan 2026) */
export const ym = (year: number, month: number): number => year * 100 + month;
