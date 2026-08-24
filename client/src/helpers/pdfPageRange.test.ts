import { describe, expect, it } from "vitest";
import { sliceCardsForPdfPages } from "./pdfPageRange";

const cards = Array.from({ length: 25 }, (_, index) => index + 1);

describe("sliceCardsForPdfPages", () => {
  it("returns all cards when no range is selected", () => {
    expect(sliceCardsForPdfPages(cards, 9, null)).toEqual(cards);
  });

  it("selects one page", () => {
    expect(sliceCardsForPdfPages(cards, 9, { startPage: 2, endPage: 2 }))
      .toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
  });

  it("selects an inclusive page range", () => {
    expect(sliceCardsForPdfPages(cards, 9, { startPage: 2, endPage: 3 }))
      .toEqual(cards.slice(9, 25));
  });
});
