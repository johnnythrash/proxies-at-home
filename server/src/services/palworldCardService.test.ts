import { describe, expect, it } from "vitest";
import { consolidatePalworldCatalog, findPalworldCatalogCard } from "./palworldCardService.js";

const cards = [{
  name: "Jormuntide Ignis – Savage Lava Dragon",
  number: "EBP01-001",
  variants: ["EBP01-001OSR", "EBP01-001SSP"],
}, {
  name: "Strike from the Darkness",
  number: "ETD02-018",
  variants: [],
}, {
  name: "Dark Cannon",
  number: "ETD02-019",
  variants: [],
}, {
  name: "Soul",
  number: "ESOUL-001",
  variants: [],
}, {
  name: "Soul",
  number: "ESOUL-000",
  variants: [],
}];

describe("findPalworldCatalogCard", () => {
  it("matches a card by punctuation-insensitive name", () => {
    expect(findPalworldCatalogCard(cards, {
      name: "Jormuntide Ignis - Savage Lava Dragon",
    })?.imageNumber).toBe("EBP01-001");
  });

  it("matches the short name before a catalog subtitle", () => {
    expect(findPalworldCatalogCard(cards, { name: "jormuntide ignis" })?.imageNumber)
      .toBe("EBP01-001");
  });

  it("ignores an omitted article", () => {
    expect(findPalworldCatalogCard(cards, { name: "strike from darkness" })?.imageNumber)
      .toBe("ETD02-018");
  });

  it("allows a unique one-character spelling difference", () => {
    expect(findPalworldCatalogCard(cards, { name: "dark canon" })?.imageNumber)
      .toBe("ETD02-019");
  });

  it("uses the generic soul when no soul number is supplied", () => {
    expect(findPalworldCatalogCard(cards, { name: "soul" })?.imageNumber)
      .toBe("ESOUL-000");
  });

  it("does not fuzzy-match unrelated names", () => {
    expect(findPalworldCatalogCard(cards, { name: "completely unknown card" })).toBeNull();
  });

  it("matches an explicit variant number", () => {
    expect(findPalworldCatalogCard(cards, {
      name: "Jormuntide Ignis EBP01-001OSR",
    })?.imageNumber).toBe("EBP01-001OSR");
  });

  it("combines separately parsed set and number", () => {
    expect(findPalworldCatalogCard(cards, {
      name: "Jormuntide Ignis – Savage Lava Dragon",
      set: "ebp01",
      number: "001",
    })?.imageNumber).toBe("EBP01-001");
  });
});

describe("consolidatePalworldCatalog", () => {
  it("turns duplicate Soul rows into one card with artwork variants", () => {
    const consolidated = consolidatePalworldCatalog([
      { name: "Soul", number: "ESOUL-001", variants: [] },
      { name: "Soul", number: "ESOUL-000", variants: [] },
      { name: "Soul", number: "ESOUL-002", variants: [] },
    ]);

    expect(consolidated).toEqual([{
      name: "Soul",
      number: "ESOUL-000",
      variants: ["ESOUL-001", "ESOUL-002"],
    }]);
  });

  it("combines duplicate reprints and their existing variants", () => {
    const consolidated = consolidatePalworldCatalog([
      { name: "Example", number: "SET01-001", variants: ["SET01-001SP"] },
      { name: "Example", number: "SET02-001", variants: [] },
    ]);

    expect(consolidated[0]).toEqual({
      name: "Example",
      number: "SET01-001",
      variants: ["SET01-001SP", "SET02-001"],
    });
  });
});
