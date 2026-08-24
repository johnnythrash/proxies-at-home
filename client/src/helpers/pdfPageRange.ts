export type PdfPageRange = {
  startPage: number;
  endPage: number;
};

export function sliceCardsForPdfPages<T>(
  cards: T[],
  cardsPerPage: number,
  range: PdfPageRange | null,
): T[] {
  if (!range) return cards;

  const perPage = Math.max(1, cardsPerPage);
  const startIndex = (Math.max(1, range.startPage) - 1) * perPage;
  const endIndex = Math.max(range.startPage, range.endPage) * perPage;
  return cards.slice(startIndex, endIndex);
}
