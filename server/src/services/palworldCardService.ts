import fs from "fs";
import path from "path";
import type { CardInfo, ScryfallCard } from "../../../shared/types.js";
import { serverDataDir } from "../utils/runtimePaths.js";

interface PalworldCatalogCard {
  name: string;
  number: string;
  variants?: string[];
}

interface PalworldIndex {
  cards: PalworldCatalogCard[];
  imagesByNumber: Map<string, string>;
}

const cardsDir = path.join(serverDataDir, "palworld_cards");
const catalogPath = path.join(cardsDir, "catalog.json");
let cachedIndex: PalworldIndex | null = null;

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function normalizeNumber(value: string): string {
  return value.trim().replace(/\.png$/i, "").toUpperCase();
}

function searchableName(value: string): string {
  return normalize(value)
    .split(" ")
    .filter((token) => token !== "the")
    .join(" ");
}

function cardNameAliases(name: string): string[] {
  const shortName = name.split(/\s+[–—-]\s+/)[0];
  return [...new Set([searchableName(name), searchableName(shortName)])];
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j++) {
      const above = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1)
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

export function consolidatePalworldCatalog(cards: PalworldCatalogCard[]): PalworldCatalogCard[] {
  const groups = new Map<string, PalworldCatalogCard[]>();
  for (const card of cards) {
    const key = searchableName(card.name);
    const group = groups.get(key) ?? [];
    group.push(card);
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => {
    const base = group.find((card) => normalizeNumber(card.number) === "ESOUL-000") ?? group[0];
    const allNumbers = group.flatMap((card) => [card.number, ...(card.variants ?? [])]);
    const variants = [...new Set(allNumbers.map(normalizeNumber))]
      .filter((number) => number !== normalizeNumber(base.number));
    return { ...base, variants };
  });
}

function buildIndex(): PalworldIndex {
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Palworld catalog not found at ${catalogPath}`);
  }

  const rawCards = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as Array<Partial<PalworldCatalogCard>>;
  const validCards = rawCards.filter(
    (card): card is PalworldCatalogCard =>
      typeof card.name === "string" && card.name.trim().length > 0 &&
      typeof card.number === "string" && card.number.trim().length > 0
  );
  const cards = consolidatePalworldCatalog(validCards);
  const imagesByNumber = new Map<string, string>();

  for (const entry of fs.readdirSync(cardsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const setDir = path.join(cardsDir, entry.name);
    for (const filename of fs.readdirSync(setDir)) {
      if (!filename.toLowerCase().endsWith(".png")) continue;
      imagesByNumber.set(normalizeNumber(filename), path.join(setDir, filename));
    }
  }

  return { cards, imagesByNumber };
}

function getIndex(): PalworldIndex {
  cachedIndex ??= buildIndex();
  return cachedIndex;
}

function requestedNumber(cardInfo: CardInfo): string | undefined {
  if (cardInfo.number) {
    const number = normalizeNumber(cardInfo.number);
    const set = cardInfo.set ? normalizeNumber(cardInfo.set) : "";
    return set && !number.startsWith(set) ? `${set}-${number}` : number;
  }

  return cardInfo.name.match(/\b(?:EBP\d{2}|ETD\d{2}|EPR|ESOUL)-\d{3}(?:[A-Z]+)?\b/i)?.[0].toUpperCase();
}

export function findPalworldCatalogCard(
  cards: PalworldCatalogCard[],
  cardInfo: CardInfo
): { card: PalworldCatalogCard; imageNumber: string } | null {
  const number = requestedNumber(cardInfo);
  if (number) {
    const byNumber = cards.find((card) =>
      normalizeNumber(card.number) === number ||
      (card.variants ?? []).some((variant) => normalizeNumber(variant) === number)
    );
    if (byNumber) return { card: byNumber, imageNumber: number };
  }

  const queryName = searchableName(cardInfo.name.replace(/\b(?:EBP\d{2}|ETD\d{2}|EPR|ESOUL)-\d{3}(?:[A-Z]+)?\b/gi, ""));
  const exactMatches = cards.filter((card) => cardNameAliases(card.name).includes(queryName));
  if (exactMatches.length > 0) {
    const exact = exactMatches.find((card) => normalizeNumber(card.number) === "ESOUL-000") ?? exactMatches[0];
    return { card: exact, imageNumber: normalizeNumber(exact.number) };
  }

  // Permit a single-character typo only when it identifies one catalog name.
  const fuzzyMatches = cards.filter((card) =>
    cardNameAliases(card.name).some((alias) => editDistance(alias, queryName) === 1)
  );
  if (fuzzyMatches.length === 1) {
    return { card: fuzzyMatches[0], imageNumber: normalizeNumber(fuzzyMatches[0].number) };
  }

  return null;
}

export function lookupPalworldCard(cardInfo: CardInfo): ScryfallCard | null {
  const index = getIndex();
  const match = findPalworldCatalogCard(index.cards, cardInfo);
  if (!match || !index.imagesByNumber.has(match.imageNumber)) return null;

  const allNumbers = [match.card.number, ...(match.card.variants ?? [])]
    .map(normalizeNumber)
    .filter((number) => index.imagesByNumber.has(number));
  const imageUrl = `/api/palworld/images/${encodeURIComponent(match.imageNumber)}`;

  return {
    name: match.card.name,
    set: match.imageNumber.split("-")[0],
    number: match.imageNumber,
    lang: "en",
    imageUrls: [imageUrl],
    prints: allNumbers.map((number) => ({
      imageUrl: `/api/palworld/images/${encodeURIComponent(number)}`,
      set: number.split("-")[0],
      number,
    })),
  };
}

export function getPalworldImagePath(identifier: string): string | null {
  const normalized = normalizeNumber(identifier);
  return getIndex().imagesByNumber.get(normalized) ?? null;
}

export function clearPalworldIndexForTests(): void {
  cachedIndex = null;
}
