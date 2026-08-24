import { useEffect, useState } from "react";
import { searchPalworldCards } from "@/helpers/palworldApi";
import type { PrintInfo, ScryfallCard } from "../../../shared/types";

export function usePalworldSearch(query: string, enabled: boolean) {
  const [cards, setCards] = useState<ScryfallCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!enabled || !query.trim()) {
      setCards([]);
      setHasSearched(false);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    searchPalworldCards(query, controller.signal)
      .then(setCards)
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setCards([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setHasSearched(true);
        }
      });
    return () => controller.abort();
  }, [query, enabled]);

  return { cards, isLoading, hasSearched, hasResults: cards.length > 0 };
}

export function usePalworldPrints(name: string, enabled: boolean) {
  const [prints, setPrints] = useState<PrintInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!enabled || !name.trim()) {
      setPrints([]);
      setHasSearched(false);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    searchPalworldCards(name, controller.signal)
      .then((cards) => setPrints(cards[0]?.prints ?? []))
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setPrints([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setHasSearched(true);
        }
      });
    return () => controller.abort();
  }, [name, enabled]);

  return { prints, isLoading, hasSearched };
}
