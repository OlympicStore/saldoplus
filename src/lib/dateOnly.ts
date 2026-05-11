export const getDateOnlyParts = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);

  if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
    return { year, month: month - 1, day };
  }

  const parsed = new Date(date);
  return { year: parsed.getFullYear(), month: parsed.getMonth(), day: parsed.getDate() };
};

export const isDateInYear = (date: string, year: number) => getDateOnlyParts(date).year === year;

export const isDateInMonth = (date: string, month: number) => getDateOnlyParts(date).month === month;

export const formatDateOnly = (date: string, options?: Intl.DateTimeFormatOptions) => {
  const parts = getDateOnlyParts(date);
  return new Date(parts.year, parts.month, parts.day).toLocaleDateString("pt-PT", options);
};