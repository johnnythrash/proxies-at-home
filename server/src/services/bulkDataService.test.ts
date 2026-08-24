import { describe, expect, it } from "vitest";
import { shouldImportBulkCard } from "./bulkDataService.js";

function card(games: string[] | undefined, layout = "normal") {
  return {
    id: "test-id",
    name: "Test Card",
    set: "tst",
    collector_number: "1",
    lang: "en",
    games,
    layout,
  };
}

describe("shouldImportBulkCard", () => {
  it("includes cards available in paper", () => {
    expect(shouldImportBulkCard(card(["paper", "arena", "mtgo"]))).toBe(true);
  });

  it("excludes Arena-only and Alchemy cards", () => {
    expect(shouldImportBulkCard(card(["arena"]))).toBe(false);
  });

  it("excludes art-series cards even when marked for paper", () => {
    expect(shouldImportBulkCard(card(["paper"], "art_series"))).toBe(false);
  });

  it("excludes records with no games metadata", () => {
    expect(shouldImportBulkCard(card(undefined))).toBe(false);
  });
});
